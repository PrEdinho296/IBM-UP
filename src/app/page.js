'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Users, Menu, X, Activity, LayoutDashboard, Map, Home, ClipboardList, Star, Calendar, Clock, Copy, Check, MapPin, Loader2, Sun, Moon, ShieldCheck, UserMinus, Eye, Download, Upload, Power, Edit2, LineChart as LineIcon, PieChart as PieIcon } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabase';

function ChurchAppWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-white italic font-bold text-xl animate-pulse">IBMRP...</div>}>
      <ChurchMembershipSystem />
    </Suspense>
  );
}

function ChurchMembershipSystem() {
  const searchParams = useSearchParams();
  const cellIdParam = searchParams.get('cellId');

  const [darkMode, setDarkMode] = useState(true);
  const [members, setMembers] = useState([]);
  const [cells, setCells] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isLeaderMode, setIsLeaderMode] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [searchingCep, setSearchingCep] = useState(false);
  const [filterCellId, setFilterCellId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('Tudo');

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCellForm, setShowCellForm] = useState(false);
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const [memberForm, setMemberForm] = useState({ 
    name: '', email: '', phone: '', cell_id: '', status: 'active', 
    cep: '', address: '', number: '', neighborhood: '', city: '', 
    pl: false, ecc: false, bat: false, con: false, 
    maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false,
    attended_cell: false, attended_cult: false 
  });
  
  const [cellForm, setCellForm] = useState({ name: '', sector_id: '', leader: '', leader_phone: '', cep: '', address: '', number: '', neighborhood: '', city: '', day_of_week: 'quarta', meeting_time: '19:30' });
  const [sectorForm, setSectorForm] = useState({ name: '' });
  const [reportForm, setReportForm] = useState({ date: new Date().toISOString().split('T')[0], members: 0, frequenters: 0, visitors: 0, notes: '' });

  useEffect(() => {
    const initFetch = async () => {
      const data = await fetchData();
      if (cellIdParam && data?.cells) {
        const cell = data.cells.find(c => Number(c.id) === Number(cellIdParam));
        if (cell) {
          setActiveCell(cell);
          setIsLeaderMode(true);
          setActiveTab('leader-members');
        }
      }
    };
    initFetch();
  }, [cellIdParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.from('sectors').select('*').order('name');
      const { data: c } = await supabase.from('cells').select('*').order('name');
      const { data: m } = await supabase.from('members').select('*').order('name');
      const { data: r } = await supabase.from('reports').select('*').order('date', { ascending: false });

      if (s) setSectors(s);
      if (c) setCells(c);
      if (m) setMembers(m);
      if (r) setReports(r);
      
      return { sectors: s, cells: c, members: m, reports: r };
    } catch (error) { 
      console.error('Erro ao buscar dados:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCepSearch = async (cep, type) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        if (type === 'member') setMemberForm(prev => ({ ...prev, address: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '' }));
        else setCellForm(prev => ({ ...prev, address: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '' }));
      }
    } catch (error) { console.error(error); } finally { setSearchingCep(false); }
  };

  const toggleAttendance = async (memberId, type) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const newValue = !member[type];
    setMembers(members.map(m => m.id === memberId ? { ...m, [type]: newValue } : m));
    await supabase.from('members').update({ [type]: newValue }).eq('id', memberId);
  };

  const addMember = async () => {
    const cId = isLeaderMode ? activeCell?.id : memberForm.cell_id;
    if (!memberForm.name || !cId) return;
    
    // Remover campos que não devem ser enviados na atualização/inserção
    const { id, created_at, ...payload } = memberForm;
    const finalData = { ...payload, cell_id: Number(cId) };

    if (editingId) {
      const { data, error } = await supabase.from('members').update(finalData).eq('id', editingId).select();
      if (error) {
        console.error('Erro ao atualizar membro:', error);
        alert('Erro ao salvar alterações');
        return;
      }
      if (data) {
        setMembers(members.map(m => m.id === editingId ? data[0] : m));
        setEditingId(null);
        setMemberForm({ name: '', email: '', phone: '', cell_id: '', status: 'active', cep: '', address: '', number: '', neighborhood: '', city: '', pl: false, ecc: false, bat: false, con: false, maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false, attended_cell: false, attended_cult: false });
        setShowMemberForm(false);
      }
    } else {
      const { data, error } = await supabase.from('members').insert([finalData]).select();
      if (error) {
        console.error('Erro ao inserir membro:', error);
        alert('Erro ao criar membro');
        return;
      }
      if (data) {
        setMembers([...members, data[0]]);
        setMemberForm({ name: '', email: '', phone: '', cell_id: '', status: 'active', cep: '', address: '', number: '', neighborhood: '', city: '', pl: false, ecc: false, bat: false, con: false, maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false, attended_cell: false, attended_cult: false });
        setShowMemberForm(false);
      }
    }
  };

  const addCell = async () => {
    if (!cellForm.name || !cellForm.sector_id) return;
    const { data } = await supabase.from('cells').insert([cellForm]).select();
    if (data) {
      setCells([...cells, data[0]]);
      setCellForm({ name: '', sector_id: '', leader: '', leader_phone: '', cep: '', address: '', number: '', neighborhood: '', city: '', day_of_week: 'quarta', meeting_time: '19:30' });
      setShowCellForm(false);
    }
  };

  const addSector = async () => {
    if (!sectorForm.name) return;
    const { data } = await supabase.from('sectors').insert([sectorForm]).select();
    if (data) {
      setSectors([...sectors, data[0]]);
      setSectorForm({ name: '' });
      setShowSectorForm(false);
    }
  };

  const addReport = async () => {
    const total = Number(reportForm.members) + Number(reportForm.frequenters) + Number(reportForm.visitors);
    const { data } = await supabase.from('reports').insert([{ ...reportForm, total }]).select();
    if (data) {
      setReports([data[0], ...reports]);
      setReportForm({ date: new Date().toISOString().split('T')[0], members: 0, frequenters: 0, visitors: 0, notes: '' });
      setShowReportForm(false);
    }
  };

  const deleteItem = async (table, id) => {
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (table === 'members') setMembers(members.filter(m => m.id !== id));
      if (table === 'cells') setCells(cells.filter(c => c.id !== id));
      if (table === 'sectors') setSectors(sectors.filter(s => s.id !== id));
      if (table === 'reports') setReports(reports.filter(r => r.id !== id));
    }
  };

  const stats = {
    total: members.length,
    onlyCell: members.filter(m => m.attended_cell && !m.attended_cult).length,
    onlyCult: members.filter(m => !m.attended_cell && m.attended_cult).length,
    both: members.filter(m => m.attended_cell && m.attended_cult).length,
    none: members.filter(m => !m.attended_cell && !m.attended_cult).length,
    totalCult: members.filter(m => m.attended_cult).length,
  };

  const loyaltyData = [
    { name: 'Só Célula', value: stats.onlyCell, color: '#f59e0b' },
    { name: 'Só Culto', value: stats.onlyCult, color: '#a855f7' },
    { name: 'Ambos', value: stats.both, color: '#10b981' },
    { name: 'Inativos', value: stats.none, color: '#ef4444' },
  ];

  const filteredMembers = members.filter(m => {
    if (filterCellId) return Number(m.cell_id) === Number(filterCellId);
    if (isLeaderMode && activeCell) return Number(m.cell_id) === Number(activeCell.id);
    return m.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const chartData = [...reports].reverse().map(r => {
    const d = new Date(r.date);
    return {
      date: r.date,
      displayDate: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
      total: r.total
    };
  });

  const t = {
    bg: darkMode ? 'bg-[#020617]' : 'bg-[#f8fafc]',
    card: darkMode ? 'bg-[#0f172a]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm',
    sidebar: darkMode ? 'bg-[#0f172a]' : 'bg-white shadow-xl',
    text: darkMode ? 'text-white' : 'text-slate-900',
    subText: darkMode ? 'text-slate-500' : 'text-slate-400',
    border: darkMode ? 'border-white/5' : 'border-slate-100',
    hover: darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50',
    tableHead: darkMode ? 'bg-white/5' : 'bg-slate-50',
  };

  if (loading) return (
    <div className={`flex flex-col h-screen ${t.bg} items-center justify-center`}>
      <Loader2 className="text-blue-500 animate-spin mb-4" size={48} />
      <p className="font-black italic uppercase tracking-widest text-xs opacity-50">Sincronizando com a nuvem...</p>
    </div>
  );

  return (
    <div className={`flex h-screen ${t.bg} ${t.text} transition-all duration-300 font-sans overflow-hidden`}>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} ${t.sidebar} border-r ${t.border} transition-all flex flex-col z-50 overflow-hidden`}>
        <div className="p-6 flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0"><Users size={18}/></div>
           {sidebarOpen && <span className={`font-black text-lg tracking-tighter ${t.text} italic`}>IBM <span className="text-blue-500 uppercase">UP</span></span>}
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {isLeaderMode ? (
            <MenuBtn icon={<Users size={18}/>} label="Minha Célula" active={true} onClick={() => setActiveTab('leader-members')} open={sidebarOpen} dark={darkMode} />
          ) : (
            <>
              <MenuBtn icon={<LayoutDashboard size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<ClipboardList size={18}/>} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Users size={18}/>} label="Membros" active={activeTab === 'members'} onClick={() => { setActiveTab('members'); setFilterCellId(null); setSearchTerm(''); }} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Home size={18}/>} label="Células" active={activeTab === 'cells'} onClick={() => setActiveTab('cells')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Map size={18}/>} label="Setores" active={activeTab === 'sectors'} onClick={() => setActiveTab('sectors')} open={sidebarOpen} dark={darkMode} />
            </>
          )}
        </nav>
        <div className={`p-4 border-t ${t.border} space-y-2`}>
           <button onClick={() => fetchData()} className={`w-full flex items-center gap-3 p-3 text-[10px] ${t.subText} hover:bg-blue-500/10 rounded-xl transition-all font-black uppercase tracking-widest`}><Activity size={16}/> {sidebarOpen && 'Atualizar'}</button>
           <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center gap-3 p-3 text-[10px] ${t.subText} ${t.hover} rounded-xl transition-all font-black uppercase tracking-widest`}>{darkMode ? <Sun size={16}/> : <Moon size={16}/>} {sidebarOpen && 'Tema'}</button>
           <button onClick={() => { if(isLeaderMode) { setIsLeaderMode(false); setActiveTab('cells'); } else { fetchData(); } }} className="w-full flex items-center gap-3 p-3 text-[10px] text-red-500/70 hover:text-red-500 hover:bg-red-400/5 rounded-xl transition-all font-black uppercase tracking-widest"><Power size={16}/> {sidebarOpen && (isLeaderMode ? 'Voltar' : 'Sair')}</button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative">
        <header className={`sticky top-0 z-40 ${t.bg}/80 backdrop-blur-md border-b ${t.border} px-6 py-3 flex justify-between items-center shrink-0`}>
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 border rounded-lg ${t.subText} hover:text-white transition-all`}><Menu size={18}/></button>
              <div><h1 className={`text-base font-black ${t.text} italic uppercase tracking-tighter`}>IBMRP</h1><p className={`${t.subText} text-[8px] font-bold uppercase tracking-widest`}>{isLeaderMode ? `Líder: ${activeCell?.name || ''}` : 'Gestão Estratégica'}</p></div>
           </div>
           <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Cloud Sync</span>
              </div>
           </div>
        </header>

        <div className="p-6 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <StatCard label="Membros" value={stats.total} icon={<Users size={16}/>} color="blue" dark={darkMode} />
                <StatCard label="No Culto" value={stats.totalCult} icon={<Activity size={16}/>} color="emerald" dark={darkMode} highlight={true} />
                <StatCard label="Só Célula" value={stats.onlyCell} icon={<Home size={16}/>} color="orange" dark={darkMode} />
                <StatCard label="Só Culto" value={stats.onlyCult} icon={<Star size={16}/>} color="purple" dark={darkMode} />
                <StatCard label="Ambos" value={stats.both} icon={<ShieldCheck size={16}/>} color="blue" dark={darkMode} />
                <StatCard label="Inativos" value={stats.none} icon={<UserMinus size={16}/>} color="red" dark={darkMode} />
                <StatCard label="Células" value={cells.length} icon={<MapPin size={16}/>} color="indigo" dark={darkMode} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 <div className={`${t.card} lg:col-span-4 border rounded-3xl p-6 flex flex-col items-center`}>
                    <h3 className="text-[9px] font-black uppercase mb-6 self-start tracking-widest flex items-center gap-2 text-slate-500"><PieIcon size={12}/> Fidelidade Global</h3>
                    <div className="h-[200px] w-full relative mb-6">
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={loyaltyData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">{loyaltyData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}</Pie><Tooltip content={<CustomTooltip dark={darkMode} />} /></PieChart></ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-2xl font-black italic">{Math.round((stats.both/stats.total)*100 || 0)}%</div>
                    </div>
                    <div className="w-full space-y-2 mt-auto">
                       {loyaltyData.map((item, i) => (
                         <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-2">
                               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                               <span className="text-[10px] font-black uppercase italic tracking-tighter opacity-70">{item.name}</span>
                            </div>
                            <span className="text-xs font-black italic">{item.value}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className={`${t.card} lg:col-span-8 border rounded-3xl p-6 flex flex-col`}>
                    <div className="flex justify-between items-center mb-10">
                       <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><LineIcon size={12}/> Evolução do Rebanho (Mensal)</h3>
                       <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                          {['Este Mês', '12m', '24m', 'Tudo'].map(f => (
                            <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                          ))}
                       </div>
                    </div>
                    <div className="h-[300px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                             <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                   <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                             <XAxis dataKey="displayDate" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} tick={{angle: -45, textAnchor: 'end'}} dy={10} interval={0} />
                             <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} width={30} />
                             <Tooltip content={<CustomTooltip dark={darkMode} />} />
                             <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTotal)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: darkMode ? '#0f172a' : '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {(activeTab === 'members' || activeTab === 'leader-members') && (
            <div className="space-y-6">
               <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Membros</h2><button onClick={() => setShowMemberForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg">+ NOVO MEMBRO</button></header>
               <div className={`${t.card} border rounded-2xl overflow-x-auto`}><table className="w-full text-left min-w-[600px]"><thead className={`${t.tableHead} border-b ${t.border}`}><tr><th className="px-6 py-4 text-[9px] font-black uppercase">Membro</th><th className="px-6 py-4 text-center text-[9px] font-black uppercase">Célula</th><th className="px-6 py-4 text-center text-[9px] font-black uppercase">Culto</th><th className="px-6 py-4 text-right text-[9px] font-black uppercase">Ações</th></tr></thead><tbody className={`divide-y ${t.border}`}>{filteredMembers.map(m => (<tr key={m.id} className={t.hover}><td className="px-6 py-4 text-sm font-black italic">{m.name}</td><td className="px-6 py-4 text-center"><button onClick={() => toggleAttendance(m.id, 'attended_cell')} className={`p-3 rounded-xl border ${m.attended_cell ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-500'}`}>{m.attended_cell ? <Check size={16}/> : <Home size={16}/>}</button></td><td className="px-6 py-4 text-center"><button onClick={() => toggleAttendance(m.id, 'attended_cult')} className={`p-3 rounded-xl border ${m.attended_cult ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>{m.attended_cult ? <Check size={16}/> : <Users size={16}/>}</button></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingId(m.id); setMemberForm(m); setShowMemberForm(true); }} className="text-blue-500/30 hover:text-blue-500 p-2"><Edit2 size={16}/></button><button onClick={() => deleteItem('members', m.id)} className="text-red-500/30 hover:text-red-500 p-2"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
               <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Relatórios Culto</h2><button onClick={() => setShowReportForm(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs">+ NOVO RELATÓRIO</button></header>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{reports.map(r => (<div key={r.id} className={`${t.card} border rounded-2xl p-6 relative`}><div className="flex justify-between items-start mb-4"><div className="bg-emerald-600/10 p-2 rounded-lg text-emerald-500"><Calendar size={18}/></div><div className="text-right"><p className="text-xl font-black tracking-tighter">{r.total}</p><p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Total</p></div></div><p className="text-sm font-black italic tracking-tighter uppercase mb-2">{new Date(r.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p><button onClick={() => deleteItem('reports', r.id)} className="text-red-500/20 hover:text-red-500 absolute top-6 right-6 p-1"><Trash2 size={12}/></button></div>))}</div>
            </div>
          )}

          {activeTab === 'cells' && (
            <div className="space-y-6">
               <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Células</h2><button onClick={() => setShowCellForm(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg">+ NOVA CÉLULA</button></header>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{cells.map(cell => (<div key={cell.id} className={`${t.card} border rounded-2xl p-6 flex flex-col group`}><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all"><Home size={20}/></div><h3 className="text-lg font-black uppercase italic mb-1">{cell.name}</h3><p className="text-blue-500 text-[9px] font-black uppercase mb-2">{cell.leader}</p><div className="flex flex-col gap-1.5 mb-4 border-y border-white/5 py-3"><div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500"><Calendar size={12} className="text-blue-500"/> {cell.day_of_week || 'Não definido'}</div><div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500"><Clock size={12} className="text-blue-500"/> {cell.meeting_time || 'Não definido'}</div></div><div className="flex gap-2"><button onClick={() => { const link = `${window.location.origin}${window.location.pathname}?cellId=${cell.id}`; navigator.clipboard.writeText(link); setCopiedId(cell.id); setTimeout(() => setCopiedId(null), 2000); }} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-black text-[8px] uppercase tracking-widest transition-all ${copiedId === cell.id ? 'bg-emerald-600 text-white' : 'bg-blue-600/10 text-blue-500'}`}>{copiedId === cell.id ? 'Copiado!' : 'Link Líder'}</button><button onClick={() => { setActiveCell(cell); setIsLeaderMode(true); setActiveTab('leader-members'); }} className="p-2.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5"><Eye size={12}/></button><button onClick={() => deleteItem('cells', cell.id)} className="p-2.5 rounded-lg text-red-500/30 hover:text-red-500"><Trash2 size={12}/></button></div></div>))}</div>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="space-y-6">
               <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Setores</h2><button onClick={() => setShowSectorForm(true)} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-xs">+ NOVO SETOR</button></header>
               <div className={`${t.card} border rounded-2xl overflow-hidden`}><table className="w-full text-left"><thead className={`${t.tableHead} border-b ${t.border}`}><tr><th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome do Setor</th><th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest">Células</th><th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest">Ação</th></tr></thead><tbody className={`divide-y ${t.border}`}>{sectors.map(s => (<tr key={s.id} className={t.hover}><td className="px-6 py-4 text-lg font-black italic">{s.name}</td><td className="px-6 py-4 text-center"><span className="bg-blue-600/10 text-blue-500 px-4 py-1 rounded-full text-[9px] font-black uppercase italic">{cells.filter(c => Number(c.sector_id) === s.id).length} Células</span></td><td className="px-6 py-4 text-right"><button onClick={() => deleteItem('sectors', s.id)} className="text-red-500/20 hover:text-red-500 p-1"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}
        </div>
      </main>

      {/* Modais com visual limpo */}
      {showMemberForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-auto">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-2xl rounded-2xl p-8 border ${t.border} shadow-2xl my-auto text-left relative`}>
            <button onClick={() => { setShowMemberForm(false); setEditingId(null); setMemberForm({ name: '', email: '', phone: '', cell_id: '', status: 'active', cep: '', address: '', number: '', neighborhood: '', city: '', pl: false, ecc: false, bat: false, con: false, maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false, attended_cell: false, attended_cult: false }); }} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X size={24}/></button>
            <h2 className="text-3xl font-black italic uppercase mb-8 pr-12">{editingId ? 'EDITAR' : 'NOVO'} ; {activeCell?.name || 'MEMBRO'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InputCompact label="NOME COMPLETO" value={memberForm.name} onChange={val => setMemberForm({...memberForm, name: val})} dark={darkMode} />
                <InputCompact label="TELEFONE" value={memberForm.phone} onChange={val => setMemberForm({...memberForm, phone: val})} dark={darkMode} />
                <div className="relative"><InputCompact label="CEP" value={memberForm.cep} onChange={val => { setMemberForm({...memberForm, cep: val}); handleCepSearch(val, 'member'); }} dark={darkMode} />{searchingCep && <Loader2 className="absolute right-3 top-7 text-blue-500 animate-spin" size={14}/>}</div>
                <InputCompact label="ENDEREÇO" value={memberForm.address} onChange={val => setMemberForm({...memberForm, address: val})} dark={darkMode} />
                <div className="grid grid-cols-2 gap-4"><InputCompact label="Nº" value={memberForm.number} onChange={val => setMemberForm({...memberForm, number: val})} dark={darkMode} /><InputCompact label="BAIRRO" value={memberForm.neighborhood} onChange={val => setMemberForm({...memberForm, neighborhood: val})} dark={darkMode} /></div>
                <InputCompact label="CIDADE" value={memberForm.city} onChange={val => setMemberForm({...memberForm, city: val})} dark={darkMode} />
              </div>
              <div className="space-y-6">
                {!isLeaderMode && (<div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">CÉLULA</p><select value={memberForm.cell_id} onChange={e => setMemberForm({...memberForm, cell_id: e.target.value})} className="w-full bg-transparent font-black text-sm outline-none"><option value="">Selecionar...</option>{cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                <div className="space-y-2">
                   <p className="text-[8px] font-black text-slate-500 uppercase">Cursos</p>
                   <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar-fine">
                      <CourseCheckCompact label="ECC - CASAIS COM CRISTO" checked={memberForm.ecc} onChange={val => setMemberForm({...memberForm, ecc: val})} dark={darkMode} />
                      <CourseCheckCompact label="BAT - MEMBROS PARA BATIZAR" checked={memberForm.bat} onChange={val => setMemberForm({...memberForm, bat: val})} dark={darkMode} />
                      <CourseCheckCompact label="FCC - FREQUENTE CULTOS/CÉLULAS" checked={memberForm.integracao} onChange={val => setMemberForm({...memberForm, integracao: val})} dark={darkMode} />
                      <CourseCheckCompact label="CON - CONSOLIDAÇÃO PENDENTE" checked={memberForm.con} onChange={val => setMemberForm({...memberForm, con: val})} dark={darkMode} />
                      <CourseCheckCompact label="VS - VISITANTE DA SEMANA" checked={memberForm.outros} onChange={val => setMemberForm({...memberForm, outros: val})} dark={darkMode} />
                      <CourseCheckCompact label="TMC - MEMBRO COMPROMETIDO" checked={memberForm.maturidade} onChange={val => setMemberForm({...memberForm, maturidade: val})} dark={darkMode} />
                      <CourseCheckCompact label="MSD - SEM DISCIPULADOR" checked={memberForm.ctl} onChange={val => setMemberForm({...memberForm, ctl: val})} dark={darkMode} />
                      <CourseCheckCompact label="PL - POTENCIAL LÍDER" checked={memberForm.pl} onChange={val => setMemberForm({...memberForm, pl: val})} dark={darkMode} />
                   </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8"><button onClick={() => setShowMemberForm(false)} className="flex-1 py-3 text-slate-500 font-black uppercase text-[10px]">Cancelar</button><button onClick={addMember} className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase">Salvar {activeCell?.id || ''}</button></div>
          </div>
        </div>
      )}

      {showCellForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-xl rounded-2xl p-8 border ${t.border} shadow-2xl relative`}>
            <button onClick={() => setShowCellForm(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24}/></button>
            <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter text-left">Nova Célula</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <InputCompact label="NOME DA CÉLULA" value={cellForm.name} onChange={val => setCellForm({...cellForm, name: val})} dark={darkMode} />
              <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">SETOR</p><select value={cellForm.sector_id} onChange={e => setCellForm({...cellForm, sector_id: e.target.value})} className="w-full bg-transparent font-black text-sm outline-none"><option value="">Selecionar...</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <InputCompact label="LÍDER" value={cellForm.leader} onChange={val => setCellForm({...cellForm, leader: val})} dark={darkMode} />
              <div className="grid grid-cols-2 gap-4">
                <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">DIA DA SEMANA</p><select value={cellForm.day_of_week} onChange={e => setCellForm({...cellForm, day_of_week: e.target.value})} className="w-full bg-transparent font-black text-sm outline-none"><option value="segunda">Segunda</option><option value="terça">Terça</option><option value="quarta">Quarta</option><option value="quinta">Quinta</option><option value="sexta">Sexta</option><option value="sábado">Sábado</option><option value="domingo">Domingo</option></select></div>
                <InputCompact label="HORÁRIO" value={cellForm.meeting_time} onChange={val => setCellForm({...cellForm, meeting_time: val})} dark={darkMode} />
              </div>
              <div className="relative"><InputCompact label="CEP LOCAL" value={cellForm.cep} onChange={val => { setCellForm({...cellForm, cep: val}); handleCepSearch(val, 'cell'); }} dark={darkMode} />{searchingCep && <Loader2 className="absolute right-3 top-7 text-blue-500 animate-spin" size={14}/>}</div>
              <InputCompact label="ENDEREÇO" value={cellForm.address} onChange={val => setCellForm({...cellForm, address: val})} dark={darkMode} />
              <InputCompact label="BAIRRO" value={cellForm.neighborhood} onChange={val => setCellForm({...cellForm, neighborhood: val})} dark={darkMode} />
            </div>
            <div className="flex gap-4 mt-8"><button onClick={() => setShowCellForm(false)} className="flex-1 text-slate-500 font-black uppercase text-[10px]">Cancelar</button><button onClick={addCell} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase italic">Criar Célula</button></div>
          </div>
        </div>
      )}

      {showSectorForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-2xl p-8 border ${t.border} shadow-2xl relative`}>
            <button onClick={() => setShowSectorForm(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24}/></button>
            <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter text-left">Novo Setor</h2>
            <InputCompact label="NOME DO SETOR" value={sectorForm.name} onChange={val => setSectorForm({...sectorForm, name: val})} dark={darkMode} />
            <div className="flex gap-4 mt-8"><button onClick={() => setShowSectorForm(false)} className="flex-1 text-slate-500 font-black uppercase text-[10px]">Cancelar</button><button onClick={addSector} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-black text-[10px] uppercase italic">Criar Setor</button></div>
          </div>
        </div>
      )}

      {showReportForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-2xl p-8 border ${t.border} shadow-2xl relative text-left`}>
            <button onClick={() => setShowReportForm(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24}/></button>
            <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">Relatório</h2>
            <div className="space-y-4">
              <InputCompact label="DATA" value={reportForm.date} onChange={val => setReportForm({...reportForm, date: val})} dark={darkMode} />
              <div className="grid grid-cols-3 gap-3">
                 <InputCompact label="MEMBROS" value={reportForm.members} onChange={val => setReportForm({...reportForm, members: val})} dark={darkMode} />
                 <InputCompact label="FREQ." value={reportForm.frequenters} onChange={val => setReportForm({...reportForm, frequenters: val})} dark={darkMode} />
                 <InputCompact label="VISIT." value={reportForm.visitors} onChange={val => setReportForm({...reportForm, visitors: val})} dark={darkMode} />
              </div>
              <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}>
                 <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">OBSERVAÇÕES</p>
                 <textarea value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} className="w-full bg-transparent font-bold text-xs outline-none h-20 resize-none" />
              </div>
            </div>
            <button onClick={addReport} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-xs uppercase mt-6">Gravar</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        [data-nextjs-scroll-focus-boundary], 
        #nextjs-dev-overlay,
        .nextjs-static-indicator-container { 
          display: none !important; 
          visibility: hidden !important;
          pointer-events: none !important;
        }

        .custom-scrollbar-fine::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-fine::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar-fine::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 10px; }
        .custom-scrollbar-fine::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.6); }
      `}</style>
    </div>
  );
}

function InputCompact({ label, value, onChange, dark }) {
  return (
    <div className={`${dark ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${dark ? 'border-white/10' : 'border-slate-200'} transition-all`}>
      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} className={`w-full bg-transparent ${dark ? 'text-white' : 'text-slate-900'} font-black text-sm outline-none italic uppercase`}/>
    </div>
  );
}

function CourseCheckCompact({ label, checked, onChange, dark }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${checked ? 'bg-blue-600 border-blue-500 text-white shadow-md' : `${dark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} text-slate-500`}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${checked ? 'bg-white text-blue-600' : 'bg-white/10'}`}>{checked && <Check size={10} />}</div>
      <span className="text-[9px] font-black italic uppercase">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, color, dark, highlight }) {
  const colors = { blue: 'text-blue-500', indigo: 'text-indigo-500', yellow: 'text-yellow-500', purple: 'text-purple-500', emerald: 'text-emerald-500', orange: 'text-orange-500', red: 'text-red-500' };
  return (
    <div className={`${dark ? 'bg-[#0f172a]/40 border-white/5 shadow-xl' : 'bg-white border-slate-100 shadow-sm'} border p-4 rounded-2xl text-left hover:border-blue-500/30 transition-all group ${highlight ? 'ring-2 ring-emerald-500/20' : ''}`}>
       <div className="flex justify-between items-start mb-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span><div className={`${colors[color]} opacity-40`}>{icon}</div></div>
       <p className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'} italic tracking-tighter`}>{value}</p>
    </div>
  );
}

function MenuBtn({ icon, label, active, onClick, open, dark }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : `${dark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}`}>
      <div className={`${active ? 'scale-110' : ''}`}>{icon}</div> {open && <span className="font-bold tracking-tight italic uppercase text-[10px]">{label}</span>}
    </button>
  );
}

function CustomTooltip({ active, payload, label, dark }) {
  if (active && payload && payload.length) {
    return (
      <div className={`${dark ? 'bg-slate-900 border-white/10' : 'bg-white shadow-xl border-slate-100'} p-3 rounded-xl border`}>
        <p className="text-[8px] font-black mb-1 uppercase tracking-widest">{label || payload[0].name}</p>
        {payload.map((p, i) => <p key={i} className="text-sm font-black" style={{ color: p.color || p.fill }}>{p.value}</p>)}
      </div>
    );
  }
  return null;
}

export default function App() { return <ChurchAppWrapper />; }
