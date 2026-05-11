'use client';
// BUILD v2026.05.08.1711 - ministerios is boolean fix
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Users, Menu, X, Activity, LayoutDashboard, Map, Home, ClipboardList, Star, Calendar, Clock, Copy, Check, MapPin, Loader2, Sun, Moon, ShieldCheck, UserMinus, Eye, Download, Upload, Power, Edit2, FileDown, ArrowLeft, LineChart as LineIcon, PieChart as PieIcon } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

function ChurchAppWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-white italic font-bold text-xl animate-pulse">IBM-UP...</div>}>
      <ChurchMembershipSystem />
    </Suspense>
  );
}

function ChurchMembershipSystem() {
  const searchParams = useSearchParams();
  const [cellIdParam, setCellIdParam] = useState(null);

  useEffect(() => {
    setCellIdParam(searchParams.get('cellId'));
  }, [searchParams]);

  const [darkMode, setDarkMode] = useState(true);
  const [members, setMembers] = useState([]);
  const [cells, setCells] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [reports, setReports] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState(null);
  const [selectedSundayDate, setSelectedSundayDate] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getMeetingDates = (dayOfWeek) => {
    const daysMap = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
    const targetDay = daysMap[dayOfWeek?.toLowerCase()] ?? 3;
    const datesList = [];
    const today = new Date();
    let current = new Date(today);

    // Ajustar para o dia da semana alvo mais recente (ou hoje)
    while (current.getDay() !== targetDay) current.setDate(current.getDate() - 1);

    for (let i = 0; i < 12; i++) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      datesList.unshift(`${year}-${month}-${day}`);
      current.setDate(current.getDate() - 7);
    }
    return datesList;
  };

  const getMemberEngagement = (m) => {
    // Pegar todas as presenças deste membro
    const memberAtt = attendance.filter(a => a.member_id === m.id);
    // Ordenar por data (mais recente primeiro)
    const sortedAtt = [...memberAtt].sort((a, b) => b.date.localeCompare(a.date));

    // Consideramos presente na célula se houver registro 'P' na data selecionada ou na mais recente
    const targetCellDate = selectedMeetingDate || (activeCell ? getMeetingDates(activeCell.day_of_week).pop() : null);
    const targetSundayDate = selectedSundayDate || getMeetingDates('domingo').pop();

    const isPresentCell = attendance.some(a => a.member_id === m.id && a.date === targetCellDate && a.status === 'P');
    const isPresentCult = attendance.some(a => a.member_id === m.id && a.date === targetSundayDate && a.status === 'P');

    return { isPresentCell, isPresentCult };
  };

  const getConsecutiveAbsences = (m, type) => {
    const dates = type === 'cell' 
      ? getMeetingDates(cells.find(c => c.id === m.cell_id)?.day_of_week || 'quarta')
      : getMeetingDates('domingo');
    
    // Pegar as últimas 3 datas
    const last3 = dates.slice(-3).reverse();
    if (last3.length < 3) return false;

    // Verificar se faltou em todas as 3
    return last3.every(d => {
      const att = attendance.find(a => a.member_id === m.id && a.date === d);
      return att?.status === 'F' || !att; // Se não tem registro, consideramos falta no contexto de alerta? 
      // Na verdade, se não tem registro o líder não lançou. Vamos considerar falta apenas se houver registro 'F'.
      // Mas o usuário quer alerta se o membro faltar. Se o líder não lançou, não sabemos.
      // Vamos considerar apenas registros 'F'.
    });
  };

  // Melhorado: Alerta se faltou 3 vezes seguidas (tem registro 'F' ou não tem registro 'P')
  const hasAbsenceAlert = (m) => {
    const checkConsecutive = (type) => {
      const dates = type === 'cell' 
        ? getMeetingDates(cells.find(c => c.id === m.cell_id)?.day_of_week || 'quarta')
        : getMeetingDates('domingo');
      
      const last3 = dates.slice(-3);
      if (last3.length < 3) return false;

      return last3.every(d => {
        const att = attendance.find(a => a.member_id === m.id && a.date === d);
        return att?.status === 'F'; // Apenas se o líder marcou explicitamente como falta
      });
    };

    return checkConsecutive('cell') || checkConsecutive('culto');
  };

  const formatDate = (dateString) => {
    if (!dateString || !dateString.includes('-')) return dateString;
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const parseDate = (displayDate) => {
    if (!displayDate || !displayDate.includes('/')) return displayDate;
    const [day, month, year] = displayDate.split("/");
    return `${year}-${month}-${day}`;
  };
  const [filterSectorId, setFilterSectorId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isLeaderMode, setIsLeaderMode] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeCell, setActiveCell] = useState(null);
  const [leaderCell, setLeaderCell] = useState(null);
  const [searchingCep, setSearchingCep] = useState(false);
  const [filterCellId, setFilterCellId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analyticsFilter, setAnalyticsFilter] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('Tudo');
  const [selectedSectors, setSelectedSectors] = useState([]);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCellForm, setShowCellForm] = useState(false);
  const [editingCellId, setEditingCellId] = useState(null);
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [quickEntryForm, setQuickEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'manha',
    total: '',
    visitors: '0',
    kids: '0'
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [showLeaderConfig, setShowLeaderConfig] = useState(false);
  const [leaderConfigForm, setLeaderConfigForm] = useState({ email: '', password: '', day_of_week: 'quarta', meeting_time: '19:30' });
  const [selectedCellForConfig, setSelectedCellForConfig] = useState(null);

  const [memberForm, setMemberForm] = useState({
    name: '', email: '', phone: '', cell_id: '', status: 'active',
    cep: '', address: '', number: '', neighborhood: '', city: '',
    pl: false, ecc: false, bat: false, con: false,
    maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false,
    attended_cell: false, attended_cult: false
  });

  const [cellForm, setCellForm] = useState({ 
    name: '', sector_id: '', leader: '', leader_phone: '', 
    cep: '', address: '', number: '', neighborhood: '', city: '', 
    day_of_week: 'quarta', meeting_time: '19:30',
    login_email: '', login_password: ''
  });
  const [visitorForm, setVisitorForm] = useState({ 
    name: '', phone: '', email: '', cep: '', address: '', number: '', neighborhood: '', city: '', 
    ministerios: '', suggested_cell: null 
  });
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  const findClosestCell = (cep, neighborhood) => {
    if (!cells.length) return null;
    
    // 1. Tentar por bairro exato (Maior Precisão)
    const byNeighborhood = cells.filter(c => c.neighborhood?.toLowerCase() === neighborhood?.toLowerCase());
    if (byNeighborhood.length > 0) return byNeighborhood[0];
    
    // 2. Tentar por distância numérica de CEP (Menor diferença absoluta)
    const visitorCepNum = parseInt(cep.replace(/\D/g, ''));
    let closest = cells[0];
    let minDiff = Infinity;

    cells.forEach(cell => {
      const cellCepNum = parseInt((cell.cep || '').replace(/\D/g, ''));
      if (!isNaN(cellCepNum)) {
        const diff = Math.abs(visitorCepNum - cellCepNum);
        if (diff < minDiff) {
          minDiff = diff;
          closest = cell;
        }
      }
    });

    return closest;
  };

  const handleVisitorCep = async (cep) => {
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const suggested = findClosestCell(cep, data.bairro);
          setVisitorForm({
            ...visitorForm, 
            cep,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            suggested_cell: suggested
          });
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };
  const [authForm, setAuthForm] = useState({ email: '', password: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Check for leader session in localStorage
    const savedLeader = localStorage.getItem('ibm_up_leader_cell');
    if (savedLeader) {
      const cell = JSON.parse(savedLeader);
      setLeaderCell(cell);
      setActiveCell(cell);
      setIsLeaderMode(true);
      setActiveTab('leader-members');
      
      const dates = getMeetingDates(cell.day_of_week);
      if (dates.length > 0) setSelectedMeetingDate(dates[dates.length - 1]);
      
      const sundayDates = getMeetingDates('domingo');
      if (sundayDates.length > 0) setSelectedSundayDate(sundayDates[sundayDates.length - 1]);
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLeaderMode) {
      if (activeCell?.day_of_week) {
        const dates = getMeetingDates(activeCell.day_of_week);
        if (dates.length > 0) {
          if (!selectedMeetingDate || !dates.includes(selectedMeetingDate)) {
            setSelectedMeetingDate(dates[dates.length - 1]);
          }
        }
      }
      const sundayDates = getMeetingDates('domingo');
      if (sundayDates.length > 0) {
        if (!selectedSundayDate || !sundayDates.includes(selectedSundayDate)) {
          setSelectedSundayDate(sundayDates[sundayDates.length - 1]);
        }
      }
    }
  }, [activeCell?.day_of_week, isLeaderMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    
    // Garantir que começamos do zero (limpa qualquer rastro de login anterior)
    await supabase.auth.signOut();
    localStorage.removeItem('ibm_up_leader_cell');
    setLeaderCell(null);
    
    // 1. Tentar Login Administrativo (Pastor)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });

    if (!authError && authData.session) {
      setAuthLoading(false);
      return;
    }

    // 2. Tentar Login de Líder (Tabela cells)
    const cellData = cells.find(c => 
      (c.login_email && authForm.email && 
       c.login_email.toLowerCase() === authForm.email.toLowerCase() && 
       c.login_password === authForm.password) ||
      (c.trainee_login_email && authForm.email && 
       c.trainee_login_email.toLowerCase() === authForm.email.toLowerCase() && 
       c.trainee_login_password === authForm.password)
    );

    if (cellData) {
      const isTrainee = cellData.trainee_login_email && authForm.email && 
                       cellData.trainee_login_email.toLowerCase() === authForm.email.toLowerCase();
      
      const leaderData = { ...cellData, isTraineeLogin: isTrainee };
      setLeaderCell(leaderData);
      setActiveCell(leaderData);
      setIsLeaderMode(true);
      setActiveTab('leader-members');
      localStorage.setItem('ibm_up_leader_cell', JSON.stringify(leaderData));
      
      const dates = getMeetingDates(cellData.day_of_week);
      if (dates.length > 0) setSelectedMeetingDate(dates[dates.length - 1]);
      
      const sundayDates = getMeetingDates('domingo');
      if (sundayDates.length > 0) setSelectedSundayDate(sundayDates[sundayDates.length - 1]);
      
      alert(`Bem-vindo, ${isTrainee ? 'Líder em Treinamento' : 'Líder'} da célula ${cellData.name}!`);
    } else {
      alert('Credenciais inválidas. Verifique o e-mail e senha.');
    }
    
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setLeaderCell(null);
    setIsLeaderMode(false);
    setActiveCell(null);
    localStorage.removeItem('ibm_up_leader_cell');
    
    // Redirecionar para a página limpa (sem parâmetros de URL) para evitar entrar no modo líder público
    window.location.href = window.location.origin + window.location.pathname;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: authForm.newPassword });
    if (error) alert('Erro ao alterar senha: ' + error.message);
    else {
      // Se estiver no modo de recuperação, precisamos atualizar também na tabela cells
      const user = (await supabase.auth.getUser()).data.user;
      if (user?.email) {
        await supabase.from('cells').update({ login_password: authForm.newPassword }).eq('login_email', user.email);
        await supabase.from('cells').update({ trainee_login_password: authForm.newPassword }).eq('trainee_login_email', user.email);
      }
      
      alert('Senha alterada com sucesso! Você já pode logar.');
      setIsChangingPassword(false);
      setShowResetForm(false);
      setAuthForm({ ...authForm, newPassword: '' });
      // Limpar a URL
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: window.location.origin + window.location.pathname + '?mode=reset',
    });
    
    if (error) {
      alert('Erro ao enviar e-mail: ' + error.message);
    } else {
      alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setIsRecoveringPassword(false);
    }
  };
  const [sectorForm, setSectorForm] = useState({ name: '' });
  const [reportForm, setReportForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    morning_people: 0, morning_visitors: 0, morning_kids: 0,
    night_people: 0, night_visitors: 0, night_kids: 0,
    notes: '' 
  });

  useEffect(() => {
    const initFetch = async () => {
      // Detectar modo de recuperação
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'reset' || window.location.hash.includes('type=recovery')) {
        setShowResetForm(true);
      }

      const cellId = urlParams.get('cellId') || cellIdParam;
      
      const fetchedData = await fetchData();
      
      if (cellId && fetchedData?.cells) {
        const cell = fetchedData.cells.find(c => String(c.id) === String(cellId));
        if (cell) {
          setActiveCell(cell);
          const dates = getMeetingDates(cell.day_of_week);
          if (dates.length > 0) setSelectedMeetingDate(dates[dates.length - 1]);
          
          const sundayDates = getMeetingDates('domingo');
          if (sundayDates.length > 0) setSelectedSundayDate(sundayDates[sundayDates.length - 1]);
          // Não ativamos mais o modo líder automaticamente via URL.
          // O usuário deve logar ou clicar em "Primeiro Acesso" na tela de login.
        }
      } else {
        // Se não for modo líder, inicializar datas padrão para o Pastor ver alertas/dashboard
        const sundayDates = getMeetingDates('domingo');
        if (sundayDates.length > 0) setSelectedSundayDate(sundayDates[sundayDates.length - 1]);
      }
      setIsInitialized(true);
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
      const { data: att } = await supabase.from('cell_attendance').select('*').order('date', { ascending: false });

      if (s) setSectors(s);
      if (c) setCells(c);
      if (m) setMembers(m);
      if (r) setReports(r);
      if (att) setAttendance(att);

      return { sectors: s, cells: c, members: m, reports: r, attendance: att };
    } catch (err) {
      console.error("Erro ao buscar dados", err);
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
    
    // Identificar a data correta
    let currentMeetingDate;
    if (type === 'attended_cell') {
      currentMeetingDate = selectedMeetingDate || (activeCell ? getMeetingDates(activeCell.day_of_week).pop() : null);
    } else {
      currentMeetingDate = selectedSundayDate || getMeetingDates('domingo').pop();
    }
    
    if (!currentMeetingDate) return;

    // Verificar status atual na data
    const existing = attendance.find(a => a.member_id === memberId && a.date === currentMeetingDate);
    const isCurrentlyPresent = existing?.status === 'P';
    const newValue = !isCurrentlyPresent;
    
    // Atualiza estado local do membro (para compatibilidade legada se necessário)
    setMembers(members.map(m => m.id === memberId ? { ...m, [type]: newValue } : m));
    
    // Payload para o histórico
    const payload = { 
      member_id: memberId, 
      cell_id: member.cell_id, 
      date: currentMeetingDate, 
      status: newValue ? 'P' : 'F' 
    };
    
    // Atualiza estado local da frequência
    setAttendance(prev => {
      const other = prev.filter(a => !(a.member_id === memberId && a.date === currentMeetingDate));
      return [...other, { ...payload, id: existing?.id || Date.now() }];
    });
    
    await supabase.from('cell_attendance').upsert([payload], { onConflict: 'member_id,date' });
    
    // Também atualizamos o booleano no membro para o painel simplificado
    await supabase.from('members').update({ [type]: newValue }).eq('id', memberId);
  };

  const toggleHistoryAttendance = async (memberId, cellId, date) => {
    const existing = attendance.find(a => a.member_id === memberId && a.date === date);
    let nextStatus = 'P';
    if (existing?.status === 'P') nextStatus = 'F';
    else if (existing?.status === 'F') nextStatus = null;

    if (nextStatus) {
      const payload = { member_id: memberId, cell_id: cellId, date, status: nextStatus };
      setAttendance(prev => {
        const other = prev.filter(a => !(a.member_id === memberId && a.date === date));
        return [...other, { ...payload, id: existing?.id || Date.now() }];
      });
      await supabase.from('cell_attendance').upsert([payload], { onConflict: 'member_id,date' });
    } else {
      setAttendance(prev => prev.filter(a => !(a.member_id === memberId && a.date === date)));
      await supabase.from('cell_attendance').delete().match({ member_id: memberId, date });
    }
  };

  const addMember = async () => {
    const cId = isLeaderMode ? activeCell?.id : memberForm.cell_id;
    if (!memberForm.name || !cId) return;

    // Enviar APENAS os campos válidos da tabela members
    // TODOS estes campos são BOOLEAN no banco (verificado via schema)
    const booleanFields = [
      'pl', 'ecc', 'bat', 'con', 'maturidade', 'ctl',
      'integracao', 'outros', 'attended_cell', 'attended_cult',
      'ministerios'
    ];
    const textFields = [
      'name', 'email', 'phone', 'status',
      'cep', 'address', 'number', 'neighborhood', 'city'
    ];
    const finalData = { cell_id: Number(cId) };
    textFields.forEach(field => {
      const val = memberForm[field];
      // Enviar null para campos vazios (compatível com o schema do Supabase)
      finalData[field] = (val && val.toString().trim() !== '') ? val : null;
    });
    // Garantir que name nunca seja null
    finalData.name = memberForm.name || '';
    finalData.status = memberForm.status || 'active';
    booleanFields.forEach(field => {
      // Converter qualquer valor para boolean puro (evita "" que quebra o Supabase)
      finalData[field] = !!memberForm[field];
    });

    console.log('Dados enviados ao Supabase:', JSON.stringify(finalData, null, 2));

    if (editingId) {
      const { data, error } = await supabase.from('members').update(finalData).eq('id', editingId).select();
      if (error) {
        console.error('Erro ao atualizar membro:', error);
        alert('Erro ao salvar alterações: ' + (error.message || error.details || JSON.stringify(error)));
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
        alert('Erro ao criar membro: ' + (error.message || error.details || JSON.stringify(error)));
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

    // Remover campos que não devem ser enviados na atualização/inserção
    const { id, created_at, ...payload } = cellForm;

    if (editingCellId) {
      const { data, error } = await supabase.from('cells').update(payload).eq('id', editingCellId).select();
      if (error) {
        console.error('Erro ao atualizar célula:', error);
        alert('Erro ao salvar alterações na célula');
        return;
      }
      if (data) {
        setCells(cells.map(c => c.id === editingCellId ? data[0] : c));
        setEditingCellId(null);
        setCellForm({ name: '', sector_id: '', leader: '', leader_phone: '', cep: '', address: '', number: '', neighborhood: '', city: '', day_of_week: 'quarta', meeting_time: '19:30', login_email: '', login_password: '' });
        setShowCellForm(false);
      }
    } else {
      const { data, error } = await supabase.from('cells').insert([payload]).select();
      if (error) {
        console.error('Erro ao criar célula:', error);
        alert('Erro ao criar nova célula');
        return;
      }
      if (data) {
        setCells([...cells, data[0]]);
        setCellForm({ name: '', sector_id: '', leader: '', leader_phone: '', cep: '', address: '', number: '', neighborhood: '', city: '', day_of_week: 'quarta', meeting_time: '19:30', login_email: '', login_password: '' });
        setShowCellForm(false);
      }
    }
  };

  const saveLeaderConfig = async (e) => {
    e.preventDefault();
    const isTraineeMode = searchParams.get('role') === 'trainee';
    const cellId = leaderCell?.id || activeCell?.id || selectedCellForConfig?.id;
    if (!cellId) {
      alert('Por favor, selecione uma célula.');
      return;
    }
    if (!leaderConfigForm.email || !leaderConfigForm.password) {
      alert('Por favor, preencha o e-mail e a senha.');
      return;
    }

    const payload = isTraineeMode ? {
      trainee_login_email: leaderConfigForm.email,
      trainee_login_password: leaderConfigForm.password,
      trainee_leader_name: leaderConfigForm.name || ''
    } : {
      login_email: leaderConfigForm.email,
      login_password: leaderConfigForm.password,
      day_of_week: leaderConfigForm.day_of_week,
      meeting_time: leaderConfigForm.meeting_time
    };

    const { error } = await supabase
      .from('cells')
      .update(payload)
      .eq('id', cellId);

    if (error) {
      alert('Erro ao salvar configuração: ' + error.message);
    } else {
      // Tentar criar o usuário no Supabase Auth para permitir recuperação de senha futura
      await supabase.auth.signUp({
        email: leaderConfigForm.email,
        password: leaderConfigForm.password,
      });

      alert('Acesso configurado com sucesso! Agora use seu e-mail e senha para entrar.');
      setShowLeaderConfig(false);
      setSelectedCellForConfig(null);
      // Atualizar o estado local
      const targetCell = activeCell || selectedCellForConfig;
      const updatedCell = { ...targetCell, ...payload };
      if (leaderCell) setLeaderCell(updatedCell);
      setActiveCell(updatedCell);
      // Recarregar dados para garantir que a lista de células esteja atualizada
      fetchData();
    }
  };

  const addVisitor = async (e) => {
    e.preventDefault();
    if (!visitorForm.name) return;
    
    const payload = {
      name: visitorForm.name,
      phone: visitorForm.phone || null,
      email: visitorForm.email || null,
      cep: visitorForm.cep || null,
      address: visitorForm.address || null,
      number: visitorForm.number || null,
      neighborhood: visitorForm.neighborhood || null,
      city: visitorForm.city || null,
      ministerios: !!visitorForm.ministerios,
      cell_id: visitorForm.suggested_cell?.id || null,
      status: 'active',
      outros: true,
      attended_cult: true 
    };

    const { data, error } = await supabase.from('members').insert([payload]).select();
    if (error) {
      console.error('Erro ao registrar visitante:', error);
      alert('Erro ao registrar visitante');
    } else if (data) {
      setMembers([...members, data[0]]);
      setVisitorForm({ 
        name: '', phone: '', email: '', cep: '', address: '', number: '', neighborhood: '', city: '', 
        ministerios: '', suggested_cell: null 
      });
      alert('Visitante registrado com sucesso! O formulário foi limpo para o próximo.');
    }
  };

  const exportToExcel = () => {
    const header = "NOME;TELEFONE;CELULA;DISCIPULADOR;CURSOS;STATUS CULTO;STATUS CELULA;ENGAJAMENTO\n";
    const rows = filteredMembers.map(m => {
      const { isPresentCell, isPresentCult } = getMemberEngagement(m);
      const cellName = cells.find(c => c.id === m.cell_id)?.name || 'Sem Célula';
      const eng = isPresentCell && isPresentCult ? 'AMBOS' :
        isPresentCell ? 'SÓ CÉLULA' :
          isPresentCult ? 'SÓ CULTO' : 'INATIVO';

      const courses = [
        m.ecc && 'ECC', m.bat && 'BAT', m.integracao && 'FCC', m.con && 'CON',
        m.maturidade && 'TMC', m.ctl && 'MSD', m.pl && 'PL'
      ].filter(Boolean).join(', ');

      return `${m.name};${m.phone || ''};${cellName};${m.ministerios ? 'SIM' : 'NÃO'};${courses};${isPresentCult ? 'PRESENTE' : 'FALTOU'};${isPresentCell ? 'PRESENTE' : 'FALTOU'};${eng}`;
    }).join('\n');

    const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RELATORIO_IBM-UP_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const pM = Number(reportForm.morning_people || 0);
    const vM = Number(reportForm.morning_visitors || 0);
    const kM = Number(reportForm.morning_kids || 0);
    const pN = Number(reportForm.night_people || 0);
    const vN = Number(reportForm.night_visitors || 0);
    const kN = Number(reportForm.night_kids || 0);

    const totalMembers = pM + pN;
    const totalVisitors = vM + vN;
    const totalKids = kM + kN;
    const grandTotal = totalMembers + totalVisitors + totalKids;

    const detailedNotes = `[MANHÃ: P:${pM}, V:${vM}, C:${kM}] [NOITE: P:${pN}, V:${vN}, C:${kN}] ${reportForm.notes}`;

    const payload = {
      date: reportForm.date,
      members: totalMembers,
      visitors: totalVisitors,
      frequenters: totalKids,
      total: grandTotal,
      notes: detailedNotes
    };

    const { data } = await supabase.from('reports').insert([payload]).select();
    if (data) {
      setReports([data[0], ...reports]);
      setReportForm({ 
        date: new Date().toISOString().split('T')[0], 
        morning_people: 0, morning_visitors: 0, morning_kids: 0,
        night_people: 0, night_visitors: 0, night_kids: 0,
        notes: '' 
      });
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

  const stats = React.useMemo(() => {
    return members.reduce((acc, m) => {
      if (isLeaderMode && activeCell && m.cell_id !== activeCell.id) return acc;
      const { isPresentCell, isPresentCult } = getMemberEngagement(m);
      acc.total++;
      if (m.outros) acc.visitors++;
      if (isPresentCell && isPresentCult) acc.both++;
      else if (isPresentCell && !isPresentCult) acc.onlyCell++;
      else if (!isPresentCell && isPresentCult) acc.onlyCult++;
      else acc.none++;

      if (!isPresentCult) acc.absentCult++;
      if (!isPresentCell) acc.absentCell++;

      return acc;
    }, { total: 0, both: 0, onlyCell: 0, onlyCulto: 0, none: 0, absentCulto: 0, absentCell: 0, visitors: 0 });
  }, [members, attendance, isLeaderMode, activeCell, cells, selectedMeetingDate, selectedSundayDate]);

  const loyaltyData = [
    { name: 'Só Célula', value: stats.onlyCell, color: '#f59e0b' },
    { name: 'Só Culto', value: stats.onlyCulto, color: '#a855f7' },
    { name: 'Ambos', value: stats.both, color: '#10b981' },
    { name: 'Inativos', value: stats.none, color: '#ef4444' },
  ];

  const courseStats = React.useMemo(() => {
    const activeMembers = members.filter(m => isLeaderMode && activeCell ? Number(m.cell_id) === Number(activeCell.id) : true);
    return [
      { name: 'CASAIS COM CRISTO', value: activeMembers.filter(m => m.ecc).length, color: '#3b82f6', short: 'ECC' },
      { name: 'BATISMO', value: activeMembers.filter(m => m.bat).length, color: '#10b981', short: 'BAT' },
      { name: 'INTEGRAÇÃO', value: activeMembers.filter(m => m.integracao).length, color: '#f59e0b', short: 'FCC' },
      { name: 'CONSOLIDAÇÃO', value: activeMembers.filter(m => m.con).length, color: '#ef4444', short: 'CON' },
      { name: 'MATURIDADE', value: activeMembers.filter(m => m.maturidade).length, color: '#a855f7', short: 'TMC' },
      { name: 'DISCIPULADO', value: activeMembers.filter(m => m.ctl).length, color: '#64748b', short: 'MSD' },
      { name: 'POTENCIAL LÍDER', value: activeMembers.filter(m => m.pl).length, color: '#6366f1', short: 'PL' },
      { name: 'VISITANTE', value: activeMembers.filter(m => m.outros).length, color: '#ec4899', short: 'VS' },
    ].sort((a, b) => b.value - a.value);
  }, [members, isLeaderMode, activeCell]);

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (isLeaderMode && activeCell) return Number(m.cell_id) === Number(activeCell.id) && matchesSearch;
    if (filterCellId) return Number(m.cell_id) === Number(filterCellId) && matchesSearch;
    return matchesSearch;
  });

  const chartData = React.useMemo(() => {
    if (!reports || reports.length === 0) return [];
    
    const processedData = {};
    [...reports].forEach(r => {
      if (!processedData[r.date]) {
        processedData[r.date] = { date: r.date, manha: 0, noite: 0, sabado: 0, geral: 0 };
      }

      const d = new Date(r.date + 'T12:00:00');
      const isSabado = d.getDay() === 6;

      const notesStr = String(r.notes || '');
      const manhaMatch = notesStr.match(/(?:MANH[ÃA]):\s*P:(\d+),\s*V:(\d+),\s*C:(\d+)/i);
      const noiteMatch = notesStr.match(/(?:NOITE):\s*P:(\d+),\s*V:(\d+),\s*C:(\d+)/i);

      const valManha = manhaMatch ? (Number(manhaMatch[1]) + Number(manhaMatch[2]) + Number(manhaMatch[3])) : 0;
      const valNoite = noiteMatch ? (Number(noiteMatch[1]) + Number(noiteMatch[2]) + Number(noiteMatch[3])) : 0;

      if (isSabado) processedData[r.date].sabado += (valManha + valNoite || Number(r.total) || 0);
      else {
        processedData[r.date].manha += valManha;
        processedData[r.date].noite += valNoite;
      }
      processedData[r.date].geral += (Number(r.total) || 0);
    });

    const sorted = Object.values(processedData).sort((a, b) => a.date.localeCompare(b.date));
    let filtered = sorted;
    const now = new Date();
    if (timeFilter === 'Este Mês') filtered = sorted.filter(r => r.date >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    else if (timeFilter === '12m') filtered = sorted.filter(r => r.date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]);
    else if (timeFilter === '24m') filtered = sorted.filter(r => r.date >= new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()).toISOString().split('T')[0]);

    return filtered.map(r => {
      const d = new Date(r.date + 'T12:00:00');
      return {
        ...r,
        displayDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
        fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      };
    });
  }, [reports, timeFilter]);

  const leaderChartData = React.useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    
    const processedData = {};
    attendance.forEach(a => {
      if (a.status !== 'P') return;
      
      const d = new Date(a.date + 'T12:00:00');
      const isSunday = d.getDay() === 0;
      
      if (!processedData[a.date]) {
        processedData[a.date] = { date: a.date, celula: 0, culto: 0, total: 0 };
      }
      
      if (isSunday) processedData[a.date].culto++;
      else processedData[a.date].celula++;
      
      processedData[a.date].total++;
    });

    const sorted = Object.values(processedData).sort((a, b) => a.date.localeCompare(b.date));
    let filtered = sorted;
    const now = new Date();
    if (timeFilter === 'Este Mês') filtered = sorted.filter(r => r.date >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    else if (timeFilter === '12m') filtered = sorted.filter(r => r.date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]);
    
    return filtered.map(r => {
      const d = new Date(r.date + 'T12:00:00');
      return {
        ...r,
        displayDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
        fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      };
    });
  }, [attendance, timeFilter]);

  const saveQuickEntry = async () => {
    if (!quickEntryForm.total) return alert('Informe o total de pessoas.');

    const date = quickEntryForm.date;
    const existing = reports.find(r => r.date === date);
    
    // Preparar dados com base no tipo
    const valP = Number(quickEntryForm.total);
    const valV = Number(quickEntryForm.visitors || 0);
    const valK = Number(quickEntryForm.kids || 0);

    let payload = {};
    let notes = '';

    if (existing) {
      // Se já existe, vamos atualizar apenas a parte correspondente
      // Tentamos extrair os valores atuais das notas ou colunas
      const manhaMatch = existing.notes?.match(/MANHÃ: P:(\d+), V:(\d+), C:(\d+)/);
      const noiteMatch = existing.notes?.match(/NOITE: P:(\d+), V:(\d+), C:(\d+)/);

      let pM = manhaMatch ? Number(manhaMatch[1]) : 0;
      let vM = manhaMatch ? Number(manhaMatch[2]) : 0;
      let kM = manhaMatch ? Number(manhaMatch[3]) : 0;
      let pN = noiteMatch ? Number(noiteMatch[1]) : 0;
      let vN = noiteMatch ? Number(noiteMatch[2]) : 0;
      let kN = noiteMatch ? Number(noiteMatch[3]) : 0;

      if (quickEntryForm.type === 'manha') { pM = valP; vM = valV; kM = valK; }
      else if (quickEntryForm.type === 'noite') { pN = valP; vN = valV; kN = valK; }
      else if (quickEntryForm.type === 'sabado') { pM = valP; vM = valV; kM = valK; pN = 0; vN = 0; kN = 0; }

      const totalMembers = pM + pN;
      const totalVisitors = vM + vN;
      const totalKids = kM + kN;
      const grandTotal = totalMembers + totalVisitors + totalKids;
      
      notes = `[MANHÃ: P:${pM}, V:${vM}, C:${kM}] [NOITE: P:${pN}, V:${vN}, C:${kN}] ${existing.notes?.split('] ').pop() || ''}`;

      payload = {
        members: totalMembers,
        visitors: totalVisitors,
        frequenters: totalKids,
        total: grandTotal,
        notes: notes
      };

      const { error } = await supabase.from('reports').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      // Novo registro
      let pM = 0, vM = 0, kM = 0, pN = 0, vN = 0, kN = 0;
      if (quickEntryForm.type === 'manha' || quickEntryForm.type === 'sabado') { pM = valP; vM = valV; kM = valK; }
      else { pN = valP; vN = valV; kN = valK; }

      const totalMembers = pM + pN;
      const totalVisitors = vM + vN;
      const totalKids = kM + kN;
      const grandTotal = totalMembers + totalVisitors + totalKids;
      notes = `[MANHÃ: P:${pM}, V:${vM}, C:${kM}] [NOITE: P:${pN}, V:${vN}, C:${kN}] `;

      payload = {
        date,
        members: totalMembers,
        visitors: totalVisitors,
        frequenters: totalKids,
        total: grandTotal,
        notes: notes
      };

      const { error } = await supabase.from('reports').insert(payload);
      if (error) throw error;
    }

    await fetchReports();
    setShowQuickEntry(false);
    alert('Contagem salva com sucesso!');
  };

  const openReportForm = () => {
    const targetMembers = (isLeaderMode && activeCell) 
      ? members.filter(m => Number(m.cell_id) === Number(activeCell.id))
      : members;
    
    const churchStats = targetMembers.reduce((acc, m) => {
      const { isPresentCell, isPresentCult } = getMemberEngagement(m);
      const attended = isLeaderMode ? isPresentCell : isPresentCult;
      
      if (attended) acc.people++;
      if (m.outros && attended) acc.visitors++;
      return acc;
    }, { people: 0, visitors: 0 });
    
    setReportForm({
      ...reportForm,
      date: new Date().toISOString().split('T')[0],
      night_people: churchStats.people,
      night_visitors: churchStats.visitors,
      night_kids: 0,
      morning_people: 0,
      morning_visitors: 0,
      morning_kids: 0
    });
    setShowReportForm(true);
  };

  // Verificação de "Segurança Máxima" para garantir que o celular detecte o link
  const getRawCellId = () => {
    if (typeof window === 'undefined') return null;
    const url = window.location.href;
    const search = window.location.search;
    const params = new URLSearchParams(search);
    
    if (params.has('cellId')) return params.get('cellId');
    if (url.includes('cellId=')) {
      const match = url.match(/cellId=(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const currentCellId = cellIdParam || getRawCellId();
  const hasCellParam = !!currentCellId;

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

  if (authLoading || !isInitialized) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white italic font-bold text-xl animate-pulse">
      IBM-UP...
    </div>
  );
  
  if (!session && !leaderCell) {
    return (
      <>
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500 my-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl shadow-blue-600/20 mb-6 rotate-3 hover:rotate-0 transition-all duration-500">
                <Users size={40} />
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">IBM-UP</h1>
              <p className="text-blue-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">Acesso Restrito</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
              <InputCompact label="E-MAIL" value={authForm.email} onChange={val => setAuthForm({ ...authForm, email: val })} dark={true} type="email" autoCapitalize="off" />
              <InputCompact label="SENHA" value={authForm.password} onChange={val => setAuthForm({ ...authForm, password: val })} dark={true} type="password" autoCapitalize="off" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95">Entrar no Painel</button>
              
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Se tem cellId na URL, usar essa célula diretamente
                  if (hasCellParam) {
                    const cell = activeCell || cells.find(c => String(c.id) === String(currentCellId));
                    if (cell) {
                      setSelectedCellForConfig(cell);
                      setActiveCell(cell);
                    }
                  } else {
                    setSelectedCellForConfig(null);
                  }
                  setLeaderConfigForm({ email: '', password: '' });
                  setShowLeaderConfig(true);
                }}
                className="w-full mt-4 border border-emerald-600/30 text-emerald-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600/10 transition-all flex flex-col items-center gap-1"
              >
                <span className="opacity-50 text-[7px]">Líder de Célula</span>
                PRIMEIRO ACESSO? CADASTRE SUA SENHA
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setIsRecoveringPassword(true)}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-500 transition-all tracking-widest"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          </div>
        </div>

        {isRecoveringPassword && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <form onSubmit={handleForgotPassword} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-3xl p-8 border ${t.border} shadow-2xl relative text-left`}>
              <button type="button" onClick={() => setIsRecoveringPassword(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
              <h2 className="text-3xl font-black mb-4 italic uppercase tracking-tighter text-blue-500">Recuperar Senha</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-6 leading-relaxed">Enviaremos um link de redefinição para o seu e-mail cadastrado.</p>
              <InputCompact label="SEU E-MAIL CADASTRADO" value={recoveryEmail} onChange={val => setRecoveryEmail(val)} dark={darkMode} type="email" autoCapitalize="off" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-xs uppercase mt-6 transition-all">Enviar E-mail de Recuperação</button>
            </form>
          </div>
        )}

        {showResetForm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <form onSubmit={handleChangePassword} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-3xl p-8 border ${t.border} shadow-2xl relative text-left`}>
              <h2 className="text-3xl font-black mb-4 italic uppercase tracking-tighter text-blue-500">Nova Senha</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-6 leading-relaxed">Digite sua nova senha abaixo para recuperar o acesso.</p>
              <InputCompact label="NOVA SENHA" value={authForm.newPassword} onChange={val => setAuthForm({ ...authForm, newPassword: val })} dark={darkMode} type="password" autoCapitalize="off" />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase mt-6 transition-all">Definir Nova Senha</button>
            </form>
          </div>
        )}

        {showLeaderConfig && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <form onSubmit={saveLeaderConfig} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-3xl border ${t.border} shadow-2xl flex flex-col relative text-left my-auto`}>
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-emerald-500">
                  {searchParams.get('role') === 'trainee' ? 'Acesso Treinamento' : 'Primeiro Acesso'}
                </h2>
                <button type="button" onClick={() => { setShowLeaderConfig(false); setSelectedCellForConfig(null); }} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                  {searchParams.get('role') === 'trainee' 
                    ? 'Defina seus dados como Líder em Treinamento para acessar o painel desta célula.' 
                    : 'Selecione sua célula e defina o e-mail e senha que você usará para acessar o painel.'}
                </p>
                
                {/* Seletor de célula — mostra todas as células sem login configurado */}
                {!activeCell && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecione sua Célula</label>
                    <select
                      value={selectedCellForConfig?.id || ''}
                      onChange={(e) => {
                        const cell = cells.find(c => String(c.id) === String(e.target.value));
                        setSelectedCellForConfig(cell || null);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                      required
                    >
                      <option value="" className="bg-slate-900">-- Escolha sua célula --</option>
                      {(() => {
                        // Agrupar células por setor
                        const grouped = {};
                        cells.forEach(c => {
                          const sectorName = sectors.find(s => s.id === c.sector_id)?.name || 'Sem Setor';
                          if (!grouped[sectorName]) grouped[sectorName] = [];
                          grouped[sectorName].push(c);
                        });
                        return Object.entries(grouped).map(([sectorName, sectorCells]) => (
                          <optgroup key={sectorName} label={sectorName}>
                            {sectorCells.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                              <option key={c.id} value={c.id} className="bg-slate-900">
                                {c.name} {c.login_email ? '✓' : ''}
                              </option>
                            ))}
                          </optgroup>
                        ));
                      })()}
                    </select>
                    {selectedCellForConfig?.login_email && (
                      <p className="text-[9px] text-amber-400 font-bold uppercase mt-2 flex items-center gap-1">
                        ⚠ Esta célula já tem acesso configurado. Ao salvar, as credenciais serão substituídas.
                      </p>
                    )}
                  </div>
                )}
                {activeCell && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-400 font-black uppercase">Célula: {activeCell.name}</p>
                  </div>
                )}

                {searchParams.get('role') === 'trainee' && (
                  <InputCompact label="SEU NOME COMPLETO" value={leaderConfigForm.name || ''} onChange={val => setLeaderConfigForm({...leaderConfigForm, name: val})} dark={darkMode} />
                )}
                <InputCompact label="E-MAIL DE ACESSO" value={leaderConfigForm.email} onChange={val => setLeaderConfigForm({...leaderConfigForm, email: val})} dark={darkMode} type="email" autoCapitalize="off" />
                <InputCompact label="SENHA DE ACESSO" value={leaderConfigForm.password} onChange={val => setLeaderConfigForm({...leaderConfigForm, password: val})} dark={darkMode} type="password" autoCapitalize="off" />
              </div>
              <div className="p-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => { setShowLeaderConfig(false); setSelectedCellForConfig(null); }} className="flex-1 py-3 text-slate-500 font-black uppercase text-[10px] hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-600/20 transition-all">Salvar Acesso</button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }


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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0"><Users size={18} /></div>
          {sidebarOpen && <span className={`font-black text-lg tracking-tighter ${t.text} italic`}>IBM-<span className="text-blue-500 uppercase">UP</span></span>}
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {isLeaderMode ? (
            <>
              <MenuBtn icon={<Users size={18} />} label="Membros" active={activeTab === 'leader-members'} onClick={() => setActiveTab('leader-members')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Calendar size={18} />} label="Frequência" active={activeTab === 'leader-attendance'} onClick={() => setActiveTab('leader-attendance')} open={sidebarOpen} dark={darkMode} />
               <MenuBtn icon={<Sun size={18} />} label="Cultos" active={activeTab === 'leader-culto'} onClick={() => setActiveTab('leader-culto')} open={sidebarOpen} dark={darkMode} />
               <div className="pt-4 mt-4 border-t border-white/5 space-y-1">
                 <p className="text-[7px] font-black text-slate-500 uppercase px-3 mb-2 tracking-widest">Equipe da Célula</p>
                 <MenuBtn 
                   icon={<Plus size={18} />} 
                   label="Convidar Treinee" 
                   onClick={() => {
                     const link = `${window.location.origin}${window.location.pathname}?cellId=${activeCell.id}&role=trainee`;
                     navigator.clipboard.writeText(link);
                     alert('Link de convite para Líder em Treinamento copiado!\nEnvie para o seu auxiliar.');
                   }} 
                   open={sidebarOpen} 
                   dark={darkMode} 
                 />
                 <MenuBtn 
                   icon={<ShieldCheck size={18} />} 
                   label="Configurar Acesso" 
                   onClick={() => {
                     setLeaderConfigForm({ 
                       email: leaderCell?.isTraineeLogin ? leaderCell?.trainee_login_email : (leaderCell?.login_email || activeCell?.login_email || ''), 
                       password: leaderCell?.isTraineeLogin ? leaderCell?.trainee_login_password : (leaderCell?.login_password || activeCell?.login_password || ''),
                       name: leaderCell?.isTraineeLogin ? leaderCell?.trainee_leader_name : ''
                     });
                     setShowLeaderConfig(true);
                   }} 
                   open={sidebarOpen} 
                   dark={darkMode} 
                 />
               </div>
            </>
          ) : (
            <>
              <MenuBtn icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<ClipboardList size={18} />} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Users size={18} />} label="Membros" active={activeTab === 'members'} onClick={() => { setActiveTab('members'); setFilterCellId(null); setSearchTerm(''); }} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Home size={18} />} label="Células" active={activeTab === 'cells'} onClick={() => setActiveTab('cells')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Sun size={18} />} label="Cultos" active={activeTab === 'cultos' || activeTab === 'leader-culto'} onClick={() => setActiveTab(isLeaderMode ? 'leader-culto' : 'cultos')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Map size={18} />} label="Setores" active={activeTab === 'sectors'} onClick={() => setActiveTab('sectors')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<ClipboardList size={18} />} label="Relatório Pastoral" active={activeTab === 'pastoral-report'} onClick={() => setActiveTab('pastoral-report')} open={sidebarOpen} dark={darkMode} />
              <MenuBtn icon={<Activity size={18} />} label="Relatório Presença" active={activeTab === 'attendance-report'} onClick={() => setActiveTab('attendance-report')} open={sidebarOpen} dark={darkMode} />
            </>
          )}
        </nav>
        <div className={`p-4 border-t ${t.border} space-y-2`}>
           {isLeaderMode && (
             <button onClick={() => window.location.href = '/'} className="w-full flex items-center gap-3 p-3 text-[10px] text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all font-black uppercase tracking-widest mb-2"><LayoutDashboard size={16}/> {sidebarOpen && 'Painel Geral'}</button>
           )}

           <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-[10px] text-red-500/70 hover:text-red-500 hover:bg-red-400/5 rounded-xl transition-all font-black uppercase tracking-widest"><Power size={16}/> {sidebarOpen && 'Encerrar Sessão'}</button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative">
        <header className={`sticky top-0 z-40 ${t.bg}/80 backdrop-blur-md border-b ${t.border} px-6 py-3 flex justify-between items-center shrink-0`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 border rounded-lg ${t.subText} hover:text-white transition-all`}><Menu size={18} /></button>
            <div>
              <h1 className={`text-base font-black ${t.text} italic uppercase tracking-tighter`}>IBM-UP</h1>
              <div className="flex items-center gap-2">
                <p className={`${t.subText} text-[8px] font-bold uppercase tracking-widest`}>
                  {isLeaderMode ? (leaderCell?.isTraineeLogin ? `Líder em Treinamento: ${activeCell?.name || ''}` : `Líder: ${activeCell?.name || ''}`) : 'Gestão Estratégica'}
                </p>
                {isLeaderMode && session && (
                  <button 
                    onClick={() => window.location.href = '/'} 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-black text-[9px] uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/40 animate-in fade-in slide-in-from-right-4 duration-500"
                  >
                    <ArrowLeft size={14} className="animate-pulse" />
                    VOLTAR AO PAINEL GERAL
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowVisitorModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase italic tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 mr-2">
              <Users size={14}/> + VISITANTE
            </button>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Cloud Sync</span>
            </div>
            <button onClick={() => setIsChangingPassword(true)} className="p-2 text-slate-500 hover:text-blue-500 transition-all rounded-lg ml-2" title="Mudar Senha">
              <ShieldCheck size={18} />
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto w-full">
          {(activeTab === 'cultos' || activeTab === 'leader-culto') && (
            <div className="space-y-8">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Gestão de Cultos</h2>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Lançamento Rápido e Análise de Frequência</p>
                </div>
                <button 
                  onClick={() => setShowQuickEntry(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                  <Activity size={18} /> LANÇAMENTO RÁPIDO
                </button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={`${t.card} lg:col-span-12 border rounded-3xl p-8`}>
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><LineIcon size={16} /> Evolução Detalhada por Culto</h3>
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      {['Este Mês', '12m', '24m', 'Tudo'].map(f => (
                        <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorManha" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorNoite" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorSabado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="displayDate" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} dy={10} interval={Math.ceil(chartData.length / 15)} />
                        <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} width={30} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip dark={darkMode} />} />
                        <Legend verticalAlign="top" height={36} content={({ payload }) => (
                          <div className="flex justify-center gap-6 mb-8">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        )} />
                        <Area name="Manhã" type="linear" dataKey="manha" stroke="#fbbf24" strokeWidth={3} fill="url(#colorManha)" fillOpacity={0.1} dot={{ r: 4, fill: '#fbbf24' }} />
                        <Area name="Noite" type="linear" dataKey="noite" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorNoite)" fillOpacity={0.1} dot={{ r: 4, fill: '#8b5cf6' }} />
                        <Area name="Sábado" type="linear" dataKey="sabado" stroke="#10b981" strokeWidth={3} fill="url(#colorSabado)" fillOpacity={0.1} dot={{ r: 4, fill: '#10b981' }} />
                        <Area name="Geral" type="linear" dataKey="geral" stroke="#3b82f6" strokeWidth={4} fill="url(#colorTotal)" fillOpacity={0.2} dot={{ r: 5, fill: '#3b82f6', stroke: darkMode ? '#0f172a' : '#fff' }} activeDot={{ r: 7 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                <StatCard label="Membros" value={stats.total} icon={<Users size={16} />} color="blue" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('all'); }} />
                <StatCard label="Ambos" value={stats.both} icon={<ShieldCheck size={16} />} color="emerald" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('both'); }} />
                <StatCard label="Só Célula" value={stats.onlyCell} icon={<Home size={16} />} color="blue" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('only-cell'); }} />
                <StatCard label="Só Culto" value={stats.onlyCulto} icon={<Star size={16} />} color="purple" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('only-culto'); }} />
                <StatCard label="Faltou Culto" value={stats.absentCulto} icon={<Activity size={16} />} color="red" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('absent-culto'); }} />
                <StatCard label="Faltou Célula" value={stats.absentCell} icon={<Clock size={16} />} color="orange" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('absent-cell'); }} />
                <StatCard label="Ausente Ambos" value={stats.none} icon={<UserMinus size={16} />} color="red" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('none'); }} />
                <StatCard label="Visitantes" value={stats.visitors} icon={<Star size={16} />} color="pink" dark={darkMode} onClick={() => { setActiveTab('reports'); setAnalyticsFilter('visitors'); }} />
                <StatCard label="Células" value={cells.length} icon={<MapPin size={16} />} color="indigo" dark={darkMode} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={`${t.card} lg:col-span-4 border rounded-3xl p-6 flex flex-col items-center`}>
                  <h3 className="text-[9px] font-black uppercase mb-6 self-start tracking-widest flex items-center gap-2 text-slate-500"><PieIcon size={12} /> Fidelidade Global</h3>
                  <div className="h-[200px] w-full relative mb-6">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[
                      { name: 'Ambos', value: stats.both, color: '#3b82f6' },
                      { name: 'Só Célula', value: stats.onlyCell, color: '#10b981' },
                      { name: 'Só Culto', value: stats.onlyCult, color: '#f59e0b' },
                      { name: 'Inativos', value: stats.none, color: '#475569' },
                    ].filter(d => d.value > 0)} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">{[
                      { color: '#3b82f6' }, { color: '#10b981' }, { color: '#f59e0b' }, { color: '#475569' }
                    ].map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}</Pie><Tooltip content={<CustomTooltip dark={darkMode} />} /></PieChart></ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-2xl font-black italic">{Math.round((stats.both / stats.total) * 100 || 0)}%</div>
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
                    <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><LineIcon size={12} /> Frequência Cultos (Lançamento Manual)</h3>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      {['Este Mês', '12m', '24m', 'Tudo'].map(f => (
                        <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="displayDate" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} dy={10} interval={Math.ceil(chartData.length / 12)} />
                        <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} width={30} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip dark={darkMode} />} />
                        <Area name="Geral" type="linear" dataKey="geral" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTotal)" fillOpacity={0.2} dot={{ r: 4, fill: '#3b82f6', stroke: darkMode ? '#0f172a' : '#fff' }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-10 pt-10 border-t border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><Activity size={12} /> Frequência Consolidada (Reporte Líderes)</h3>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={leaderChartData}>
                          <defs>
                            <linearGradient id="colorCelula" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCulto" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="displayDate" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} dy={10} interval={Math.ceil(leaderChartData.length / 12)} />
                          <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} width={30} domain={[0, 'auto']} />
                          <Tooltip content={<CustomTooltip dark={darkMode} />} />
                          <Legend verticalAlign="top" height={36} content={({ payload }) => (
                            <div className="flex justify-center gap-4 mb-4">
                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          )} />
                          <Area name="Célula" type="linear" dataKey="celula" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCelula)" fillOpacity={0.1} dot={{ r: 3, fill: '#3b82f6' }} />
                          <Area name="Culto" type="linear" dataKey="culto" stroke="#10b981" strokeWidth={2} fill="url(#colorCulto)" fillOpacity={0.1} dot={{ r: 3, fill: '#10b981' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'members' || activeTab === 'leader-members') && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Membros</h2>
                  {isLeaderMode && activeCell && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-[7px] font-black uppercase text-blue-500/50">Célula</span>
                        <select 
                          value={selectedMeetingDate || ''} 
                          onChange={(e) => setSelectedMeetingDate(e.target.value)}
                          className="bg-transparent text-[10px] font-black uppercase italic text-blue-500 outline-none cursor-pointer"
                        >
                          {getMeetingDates(activeCell.day_of_week).map(d => (
                            <option key={d} value={d} className="bg-slate-900">{formatDate(d)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-[7px] font-black uppercase text-emerald-500/50">Culto</span>
                        <select 
                          value={selectedSundayDate || ''} 
                          onChange={(e) => setSelectedSundayDate(e.target.value)}
                          className="bg-transparent text-[10px] font-black uppercase italic text-emerald-500 outline-none cursor-pointer"
                        >
                          {getMeetingDates('domingo').map(d => (
                            <option key={d} value={d} className="bg-slate-900">{formatDate(d)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                {isLeaderMode && <button onClick={() => setShowMemberForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg">+ NOVO MEMBRO</button>}
              </header>

              {isLeaderMode && activeCell && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className={`${t.card} p-6 border rounded-3xl flex flex-col items-center`}>
                    <h3 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest self-start flex items-center gap-2"><PieIcon size={12} /> Engajamento (Célula vs Culto)</h3>
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Ambos', value: stats.both, color: '#3b82f6' },
                              { name: 'Só Célula', value: stats.onlyCell, color: '#10b981' },
                              { name: 'Só Culto', value: stats.onlyCulto, color: '#f59e0b' },
                              { name: 'Nenhum', value: stats.none, color: '#475569' },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#3b82f6" stroke="none" />
                            <Cell fill="#10b981" stroke="none" />
                            <Cell fill="#f59e0b" stroke="none" />
                            <Cell fill="#475569" stroke="none" />
                          </Pie>
                          <Tooltip content={<CustomTooltip dark={darkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
                      {[
                        { label: 'Ambos', color: 'bg-blue-500' },
                        { label: 'Só Célula', color: 'bg-emerald-500' },
                        { label: 'Só Culto', color: 'bg-amber-500' },
                        { label: 'Nenhum', color: 'bg-slate-600' }
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                          <span className="text-[8px] font-black uppercase text-slate-400">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`${t.card} p-6 border rounded-3xl flex flex-col`}>
                    <h3 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest flex items-center gap-2"><Activity size={12} /> Conclusão de Cursos</h3>
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={courseStats} layout="vertical" margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#475569" fontSize={8} axisLine={false} tickLine={false} width={90} />
                          <Tooltip content={<CustomTooltip dark={darkMode} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                            {courseStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-2">
                      {courseStats.map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <p className="text-[7px] font-black uppercase text-slate-500 truncate" title={s.name}>{s.name}</p>
                          </div>
                          <p className="text-[9px] font-black italic ml-2" style={{ color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isLeaderMode && (
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className={`${t.card} border rounded-xl flex items-center px-4 py-2 gap-3 min-w-[200px]`}>
                    <Users size={16} className="text-blue-500" />
                    <select value={filterCellId || ''} onChange={e => setFilterCellId(e.target.value ? Number(e.target.value) : null)} className="bg-transparent font-black text-[10px] uppercase outline-none w-full italic">
                      <option value="">Todas as Células</option>
                      {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={`${t.card} border rounded-xl flex items-center px-4 py-2 gap-3 flex-1 min-w-[200px]`}>
                    <Menu size={16} className="text-slate-500" />
                    <input type="text" placeholder="BUSCAR POR NOME..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent font-black text-[10px] uppercase outline-none w-full italic" />
                  </div>
                </div>
              )}

              <div className={`${t.card} border rounded-2xl overflow-x-auto`}>
                <table className="w-full text-left min-w-[600px]">
                  <thead className={`${t.tableHead} border-b ${t.border}`}>
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase">Membro</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black uppercase">Célula</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black uppercase">Culto</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.border}`}>
                    {filteredMembers.map(m => (
                      <tr key={m.id} className={t.hover}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black italic uppercase tracking-tighter">{m.name}</p>
                            {m.pl && <span className="text-[7px] bg-indigo-500 text-white px-1 rounded font-black">PL</span>}
                            {hasAbsenceAlert(m) && (
                              <span className="flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[7px] font-black animate-bounce shadow-lg shadow-red-500/40">
                                <Activity size={8} /> ALERTA: 3+ FALTAS
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[9px] text-slate-500 font-bold">{m.phone || 'Sem Telefone'}</p>
                            {m.ministerios && <span className="text-[8px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">DISC</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.ecc && <span className="text-[7px] border border-blue-500/30 text-blue-500 px-1 rounded font-black uppercase">ECC</span>}
                            {m.bat && <span className="text-[7px] border border-emerald-500/30 text-emerald-500 px-1 rounded font-black uppercase">BAT</span>}
                            {m.integracao && <span className="text-[7px] border border-amber-500/30 text-amber-500 px-1 rounded font-black uppercase">FCC</span>}
                            {m.con && <span className="text-[7px] border border-red-500/30 text-red-500 px-1 rounded font-black uppercase">CON</span>}
                            {m.maturidade && <span className="text-[7px] border border-purple-500/30 text-purple-500 px-1 rounded font-black uppercase">TMC</span>}
                            {m.ctl && <span className="text-[7px] border border-slate-500/30 text-slate-500 px-1 rounded font-black uppercase">MSD</span>}
                            {m.outros && <span className="text-[7px] border border-pink-500/30 text-pink-500 px-1 rounded font-black uppercase">VS</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const att = attendance.find(a => a.member_id === m.id && a.date === selectedMeetingDate);
                            const isPresent = att?.status === 'P';
                            
                            return (
                              <button
                                onClick={() => toggleAttendance(m.id, 'attended_cell')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${isPresent ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-600'}`}
                              >
                                {isPresent ? 'Presente' : 'Faltou'}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const att = attendance.find(a => a.member_id === m.id && a.date === selectedSundayDate);
                            const isPresent = att?.status === 'P';
                            
                            return (
                              <button
                                onClick={() => toggleAttendance(m.id, 'attended_cult')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${isPresent ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-600'}`}
                              >
                                {isPresent ? 'Presente' : 'Faltou'}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingId(m.id); setMemberForm(m); setShowMemberForm(true); }} className="text-blue-500/30 hover:text-blue-500 p-2"><Edit2 size={16} /></button>
                            <button onClick={() => deleteItem('members', m.id)} className="text-red-500/30 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isLeaderMode && activeTab === 'leader-attendance' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Histórico de Frequência</h2></header>
              <div className={`${t.card} border rounded-2xl overflow-x-auto`}>
                <table className="w-full text-left">
                  <thead className={`${t.tableHead} border-b ${t.border}`}>
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase sticky left-0 z-10 bg-inherit border-r border-white/5">Nome do Membro</th>
                      {getMeetingDates(activeCell?.day_of_week).map(date => (
                        <th key={date} className="px-2 py-3 text-center text-[8px] font-black uppercase text-slate-300 border-x border-white/5 italic">
                          <div className="text-blue-400 mb-0.5">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.border}`}>
                    {filteredMembers.map(m => (
                      <tr key={m.id} className={t.hover}>
                        <td className="px-6 py-4 text-sm font-black italic sticky left-0 z-10 bg-inherit border-r border-white/5">{m.name}</td>
                        {getMeetingDates(activeCell?.day_of_week).map(d => {
                          const att = attendance.find(a => a.member_id === m.id && a.date === d);
                          return (
                            <td key={d} className="px-4 py-4 text-center">
                              <button
                                onClick={() => toggleHistoryAttendance(m.id, activeCell.id, d)}
                                className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${att?.status === 'P' ? 'bg-emerald-600 text-white shadow-lg' : att?.status === 'F' ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/5'}`}
                              >
                                {att?.status || '-'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'culto-geral' || activeTab === 'leader-culto') && (
            <div className="space-y-8">
              <header className="flex flex-col gap-1">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Frequência nos Cultos</h2>
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Monitoramento do Domingo</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${t.card} p-6 border rounded-2xl`}>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Total no Culto</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black italic text-blue-500">{members.filter(m => !m.attended_cult && (isLeaderMode ? m.cell_id === activeCell.id : true)).length}</p>
                    <p className="text-slate-500 text-xs font-black uppercase italic">Pessoas</p>
                  </div>
                </div>
                <div className={`${t.card} p-6 border rounded-2xl`}>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Faltaram</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black italic text-red-500">{members.filter(m => m.attended_cult && (isLeaderMode ? m.cell_id === activeCell.id : true)).length}</p>
                    <p className="text-slate-500 text-xs font-black uppercase italic">Pessoas</p>
                  </div>
                </div>
                <div className={`${t.card} p-6 border rounded-2xl`}>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">% de Engajamento</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black italic text-emerald-500">
                      {Math.round((members.filter(m => !m.attended_cult && (isLeaderMode ? m.cell_id === activeCell.id : true)).length / (members.filter(m => isLeaderMode ? m.cell_id === activeCell.id : true).length || 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${t.card} border rounded-2xl overflow-hidden`}>
                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Lista de Chamada do Culto</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowVisitorModal(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-black text-[8px] uppercase italic tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"><Users size={12}/> NOVO VISITANTE</button>
                    <button onClick={() => {
                      if (confirm('Marcar TODOS como presentes no culto?')) {
                        members.forEach(m => {
                          if (isLeaderMode ? m.cell_id === activeCell.id : true) {
                            if (!m.attended_cult) toggleAttendance(m.id, 'attended_cult');
                          }
                        });
                      }
                    }} className="text-[8px] font-black uppercase bg-blue-600/10 text-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20">Marcar Todos</button>
                    <button onClick={() => {
                      if (confirm('Limpar TODA a frequência de culto?')) {
                        members.forEach(m => {
                          if (isLeaderMode ? m.cell_id === activeCell.id : true) {
                            if (m.attended_cult) toggleAttendance(m.id, 'attended_cult');
                          }
                        });
                      }
                    }} className="text-[8px] font-black uppercase bg-red-600/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20">Limpar Tudo</button>
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/50 sticky top-0 z-10 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase">Membro</th>
                        {!isLeaderMode && <th className="px-6 py-4 text-[9px] font-black uppercase">Célula</th>}
                        <th className="px-6 py-4 text-center text-[9px] font-black uppercase">Faltou no Culto?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {members
                        .filter(m => isLeaderMode ? m.cell_id === activeCell.id : true)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(m => (
                          <tr key={m.id} className="hover:bg-white/5 transition-all">
                            <td className="px-6 py-4">
                              <p className="text-sm font-black italic uppercase tracking-tighter">{m.name}</p>
                            </td>
                            {!isLeaderMode && (
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-black uppercase text-slate-500 bg-white/5 px-2 py-1 rounded-md">{cells.find(c => c.id === m.cell_id)?.name || 'Sem Célula'}</span>
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleAttendance(m.id, 'attended_cult')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${m.attended_cult ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-600'}`}
                              >
                                {m.attended_cult ? 'Presente' : 'Faltou'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8">
              <header className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Inteligência de Dados</h2>
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Resumo Geral de Engajamento</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToExcel}
                    className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 px-6 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <FileDown size={16} /> EXCEL
                  </button>
                  <button onClick={openReportForm} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 group">
                    <ClipboardList size={20} className="group-hover:scale-110 transition-transform" />
                    <span>+ NOVO REGISTRO (AUTO)</span>
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                {[
                  { label: 'Membros', value: stats.total, color: 'text-white', filter: 'all' },
                  { label: 'Ambos', value: stats.both, color: 'text-emerald-500', filter: 'both' },
                  { label: 'Só Célula', value: stats.onlyCell, color: 'text-blue-400', filter: 'only-cell' },
                  { label: 'Só Culto', value: stats.onlyCult, color: 'text-purple-400', filter: 'only-culto' },
                  { label: 'Faltou Culto', value: stats.absentCult, color: 'text-red-400', filter: 'absent-culto' },
                  { label: 'Faltou Célula', value: stats.absentCell, color: 'text-orange-400', filter: 'absent-cell' },
                  { label: 'Ausente Ambos', value: stats.none, color: 'text-red-600', filter: 'none' },
                  { label: 'Visitantes', value: stats.visitors, color: 'text-pink-400', filter: 'visitors' },
                  { label: 'Células', value: cells.length, color: 'text-indigo-400', filter: null },
                ].map(kpi => (
                  <button
                    key={kpi.label}
                    onClick={() => kpi.filter && setAnalyticsFilter(analyticsFilter === kpi.filter ? null : kpi.filter)}
                    className={`${t.card} p-4 border rounded-2xl text-left hover:border-blue-500/50 transition-all ${analyticsFilter === kpi.filter ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
                  >
                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">{kpi.label}</p>
                    <p className={`text-xl font-black italic ${kpi.color}`}>{kpi.value}</p>
                  </button>
                ))}
              </div>

              {/* Lista Dinâmica de Membros Filtrada */}
              {analyticsFilter && (
                <div className={`${t.card} border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300`}>
                  <div className="p-4 border-b border-white/5 bg-blue-600/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic">
                      Lista: {
                        analyticsFilter === 'all' ? 'Todos os Membros' :
                          analyticsFilter === 'both' ? 'Comprometidos (Célula + Culto)' :
                            analyticsFilter === 'only-cell' ? 'Frequentes apenas na Célula' :
                              analyticsFilter === 'only-culto' ? 'Frequentes apenas no Culto' :
                                analyticsFilter === 'absent-culto' ? 'Ausentes no Culto' :
                                  analyticsFilter === 'absent-cell' ? 'Ausentes na Célula' :
                                    analyticsFilter === 'visitors' ? 'Visitantes Cadastrados' :
                                      'Inativos (Ausentes em Ambos)'
                      }
                    </h3>
                    <button onClick={() => setAnalyticsFilter(null)} className="text-[8px] font-black uppercase text-slate-500 hover:text-white">Fechar ×</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar-fine">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-white/5">
                        {members
                          .filter(m => {
                            if (isLeaderMode && activeCell && m.cell_id !== activeCell.id) return false;
                            const { isPresentCell, isPresentCult } = getMemberEngagement(m);

                            if (analyticsFilter === 'all') return true;
                            if (analyticsFilter === 'only-cell') return isPresentCell && !isPresentCult;
                            if (analyticsFilter === 'only-culto') return !isPresentCell && isPresentCult;
                            if (analyticsFilter === 'both') return isPresentCell && isPresentCult;
                            if (analyticsFilter === 'none') return !isPresentCell && !isPresentCult;
                            if (analyticsFilter === 'absent-culto') return !isPresentCult;
                            if (analyticsFilter === 'absent-cell') return !isPresentCell;
                            if (analyticsFilter === 'visitors') return m.outros;
                            return true;
                          })
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(m => (
                            <tr key={m.id} className="hover:bg-white/5">
                              <td className="px-6 py-3">
                                <p className="text-xs font-black uppercase italic">{m.name}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase">{cells.find(c => c.id === m.cell_id)?.name || 'Sem Célula'}</p>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button onClick={() => { setEditingId(m.id); setMemberForm(m); setShowMemberForm(true); }} className="text-blue-500 hover:text-blue-400 font-black text-[8px] uppercase tracking-widest">Ver Ficha</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Distribuição */}
                <div className={`${t.card} p-6 border rounded-2xl flex flex-col items-center`}>
                  <h3 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest self-start">Distribuição de Frequência</h3>
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Ambos', value: stats.both, color: '#10b981' },
                            { name: 'Só Célula', value: stats.onlyCell, color: '#f59e0b' },
                            { name: 'Só Culto', value: stats.onlyCult, color: '#a855f7' },
                            { name: 'Inativos', value: stats.none, color: '#ef4444' },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#a855f7" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Histórico de Relatórios Manuais */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Registros de Culto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reports.map(r => (
                      <div key={r.id} className={`${t.card} border rounded-2xl p-5 relative group hover:border-blue-500/30 transition-all overflow-hidden`}>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-600/10 p-2 rounded-lg text-blue-500"><Calendar size={18} /></div>
                            <p className="text-xs font-black italic tracking-tighter uppercase">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                          </div>
                          <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                            <p className="text-lg font-black tracking-tighter text-blue-500">{r.total || 0}</p>
                            <p className="text-[6px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">TOTAL</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                          <div className="text-center"><p className="text-[10px] font-black">{r.frequenters || 0}</p><p className="text-[6px] text-slate-500 uppercase font-bold">Freq.</p></div>
                          <div className="text-center border-x border-white/5"><p className="text-[10px] font-black">{r.visitors || 0}</p><p className="text-[6px] text-slate-500 uppercase font-bold">Visit.</p></div>
                          <div className="text-center"><p className="text-[10px] font-black">{r.members || 0}</p><p className="text-[6px] text-slate-500 uppercase font-bold">Memb.</p></div>
                        </div>

                        <button
                          onClick={() => deleteItem('reports', r.id)}
                          className="absolute -right-10 group-hover:right-2 top-2 p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Excluir Registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cells' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Células</h2>
                  {filterSectorId && (
                    <button onClick={() => setFilterSectorId(null)} className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-400 flex items-center gap-1 mt-1">
                      Setor: {sectors.find(s => s.id === filterSectorId)?.name} (Limpar ×)
                    </button>
                  )}
                </div>
                <button onClick={() => setShowCellForm(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg">+ NOVA CÉLULA</button>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cells.filter(cell => !filterSectorId || Number(cell.sector_id) === filterSectorId).map(cell => (<div key={cell.id} className={`${t.card} border rounded-2xl p-6 flex flex-col group`}><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all"><Home size={20} /></div><h3 className="text-lg font-black uppercase italic mb-1">{cell.name}</h3><p className="text-blue-500 text-[9px] font-black uppercase mb-2">{cell.leader}</p>                    <div className="grid grid-cols-2 gap-2 mb-4 border-y border-white/5 py-4">
                  <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase text-blue-400 italic notranslate" translate="no">
                    <Calendar size={14} /> {cell.day_of_week || '---'}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase text-emerald-400 italic border-l border-white/5 notranslate" translate="no">
                    <Clock size={14} /> {cell.meeting_time || '---'}
                  </div>
                </div><div className="flex gap-2"><button onClick={() => { const link = `${window.location.origin}${window.location.pathname}?cellId=${cell.id}`; navigator.clipboard.writeText(link); setCopiedId(cell.id); setTimeout(() => setCopiedId(null), 2000); }} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-black text-[8px] uppercase tracking-widest transition-all ${copiedId === cell.id ? 'bg-emerald-600 text-white' : 'bg-blue-600/10 text-blue-500'}`}>{copiedId === cell.id ? 'Copiado!' : 'Link Líder'}</button><button onClick={() => { setEditingCellId(cell.id); setCellForm(cell); setShowCellForm(true); }} className="p-2.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 hover:text-blue-400"><Edit2 size={12} /></button>
                    <button onClick={() => { setActiveCell(cell); setIsLeaderMode(true); setActiveTab('leader-members'); }} className="p-2.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5"><Eye size={12} /></button><button onClick={() => deleteItem('cells', cell.id)} className="p-2.5 rounded-lg text-red-500/30 hover:text-red-500"><Trash2 size={12} /></button></div></div>))}</div>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">Setores</h2><button onClick={() => setShowSectorForm(true)} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-xs">+ NOVO SETOR</button></header>
              <div className={`${t.card} border rounded-2xl overflow-hidden`}><table className="w-full text-left"><thead className={`${t.tableHead} border-b ${t.border}`}><tr><th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nome do Setor</th><th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest">Células</th><th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest">Ação</th></tr></thead><tbody className={`divide-y ${t.border}`}>{sectors.map(s => (<tr key={s.id} className={t.hover}><td className="px-6 py-4 text-lg font-black italic">{s.name}</td><td className="px-6 py-4 text-center">
                <button
                  onClick={() => { setFilterSectorId(s.id); setActiveTab('cells'); }}
                  className="bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase italic transition-all cursor-pointer border border-blue-600/20 shadow-lg shadow-blue-600/5"
                >
                  {cells.filter(c => Number(c.sector_id) === s.id).length} Células
                </button>
              </td><td className="px-6 py-4 text-right"><button onClick={() => deleteItem('sectors', s.id)} className="text-red-500/20 hover:text-red-500 p-1"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div></div>)}
          {activeTab === 'attendance-report' && <AttendanceReport members={members} cells={cells} getMemberEngagement={getMemberEngagement} darkMode={darkMode} />}
          {activeTab === 'pastoral-report' && (
            <PastoralReport 
              members={members} 
              cells={cells} 
              sectors={sectors} 
              attendance={attendance}
              getMemberEngagement={getMemberEngagement} 
              darkMode={darkMode} 
              selectedSectors={selectedSectors}
              setSelectedSectors={setSelectedSectors}
            />
          )}
        </div>
      </main>
      {showMemberForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-2xl max-h-[95vh] rounded-2xl border ${t.border} shadow-2xl flex flex-col relative`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">{editingId ? 'EDITAR' : 'NOVO'} ; {activeCell?.name || 'MEMBRO'}</h2>
              <button onClick={() => { setShowMemberForm(false); setEditingId(null); setMemberForm({ name: '', email: '', phone: '', cell_id: '', status: 'active', cep: '', address: '', number: '', neighborhood: '', city: '', pl: false, ecc: false, bat: false, con: false, maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false, attended_cell: false, attended_cult: false }); }} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"><X size={24} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar-fine">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InputCompact label="NOME COMPLETO" value={memberForm.name} onChange={val => setMemberForm({ ...memberForm, name: val })} dark={darkMode} />
                  <InputCompact label="TELEFONE" value={memberForm.phone} onChange={val => setMemberForm({ ...memberForm, phone: val })} dark={darkMode} />
                  <div className="relative"><InputCompact label="CEP" value={memberForm.cep} onChange={val => { setMemberForm({ ...memberForm, cep: val }); handleCepSearch(val, 'member'); }} dark={darkMode} />{searchingCep && <Loader2 className="absolute right-3 top-7 text-blue-500 animate-spin" size={14} />}</div>
                  <InputCompact label="ENDEREÇO" value={memberForm.address} onChange={val => setMemberForm({ ...memberForm, address: val })} dark={darkMode} />
                  <div className="grid grid-cols-2 gap-4"><InputCompact label="Nº" value={memberForm.number} onChange={val => setMemberForm({ ...memberForm, number: val })} dark={darkMode} /><InputCompact label="BAIRRO" value={memberForm.neighborhood} onChange={val => setMemberForm({ ...memberForm, neighborhood: val })} dark={darkMode} /></div>
                  <InputCompact label="CIDADE" value={memberForm.city} onChange={val => setMemberForm({ ...memberForm, city: val })} dark={darkMode} />
                  <CourseCheckCompact label="TEM DISCIPULADOR" checked={memberForm.ministerios} onChange={val => setMemberForm({ ...memberForm, ministerios: val })} dark={darkMode} />
                </div>
                <div className="space-y-6">
                  {/* Frequência Rápida */}
                  <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-500/10 space-y-3">
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Frequência desta Semana</p>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                        <input type="checkbox" checked={memberForm.attended_cell} onChange={e => setMemberForm({ ...memberForm, attended_cell: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-slate-800 text-blue-500" />
                        <span className="text-[10px] font-black uppercase italic">Célula</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                        <input type="checkbox" checked={memberForm.attended_cult} onChange={e => setMemberForm({ ...memberForm, attended_cult: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-slate-800 text-red-500" />
                        <span className="text-[10px] font-black uppercase italic text-red-500">Faltou no Culto</span>
                      </label>
                    </div>
                  </div>

                  {!isLeaderMode && (<div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">CÉLULA</p><select value={memberForm.cell_id} onChange={e => setMemberForm({ ...memberForm, cell_id: e.target.value })} className="w-full bg-transparent font-black text-sm outline-none"><option value="">Selecionar...</option>{cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Cursos</p>
                    <div className="grid grid-cols-1 gap-2">
                      <CourseCheckCompact label="ECC - CASAIS COM CRISTO" checked={memberForm.ecc} onChange={val => setMemberForm({ ...memberForm, ecc: val })} dark={darkMode} />
                      <CourseCheckCompact label="BAT - MEMBROS PARA BATIZAR" checked={memberForm.bat} onChange={val => setMemberForm({ ...memberForm, bat: val })} dark={darkMode} />
                      <CourseCheckCompact label="FCC - FREQUENTE CULTOS/CÉLULAS" checked={memberForm.integracao} onChange={val => setMemberForm({ ...memberForm, integracao: val })} dark={darkMode} />
                      <CourseCheckCompact label="CON - CONSOLIDAÇÃO PENDENTE" checked={memberForm.con} onChange={val => setMemberForm({ ...memberForm, con: val })} dark={darkMode} />
                      <CourseCheckCompact label="VS - VISITANTE DA SEMANA" checked={memberForm.outros} onChange={val => setMemberForm({ ...memberForm, outros: val })} dark={darkMode} />
                      <CourseCheckCompact label="TMC - MEMBRO COMPROMETIDO" checked={memberForm.maturidade} onChange={val => setMemberForm({ ...memberForm, maturidade: val })} dark={darkMode} />
                      <CourseCheckCompact label="MSD - SEM DISCIPULADOR" checked={memberForm.ctl} onChange={val => setMemberForm({ ...memberForm, ctl: val })} dark={darkMode} />
                      <CourseCheckCompact label="PL - POTENCIAL LÍDER" checked={memberForm.pl} onChange={val => setMemberForm({ ...memberForm, pl: val })} dark={darkMode} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex gap-4 shrink-0 bg-inherit rounded-b-2xl">
              <button onClick={() => setShowMemberForm(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
              <button onClick={addMember} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Salvar {activeCell?.id ? 'na Célula' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {showCellForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-xl max-h-[95vh] rounded-2xl border ${t.border} shadow-2xl flex flex-col relative`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">{editingCellId ? 'Editar' : 'Nova'} Célula</h2>
              <button onClick={() => { setShowCellForm(false); setEditingCellId(null); setCellForm({ name: '', sector_id: '', leader: '', leader_phone: '', cep: '', address: '', number: '', neighborhood: '', city: '', day_of_week: 'quarta', meeting_time: '19:30', login_email: '', login_password: '' }); }} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar-fine text-left">
              <InputCompact label="NOME DA CÉLULA" value={cellForm.name} onChange={val => setCellForm({ ...cellForm, name: val })} dark={darkMode} />
              <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">SETOR</p><select value={cellForm.sector_id} onChange={e => setCellForm({ ...cellForm, sector_id: e.target.value })} className="w-full bg-transparent font-black text-sm outline-none"><option value="">Selecionar...</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <InputCompact label="LÍDER" value={cellForm.leader} onChange={val => setCellForm({ ...cellForm, leader: val })} dark={darkMode} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}><p className="text-[8px] font-black text-slate-500 uppercase mb-2">DIA DA SEMANA</p><select value={cellForm.day_of_week} onChange={e => setCellForm({ ...cellForm, day_of_week: e.target.value })} className="w-full bg-transparent font-black text-sm outline-none"><option value="segunda">Segunda</option><option value="terça">Terça</option><option value="quarta">Quarta</option><option value="quinta">Quinta</option><option value="sexta">Sexta</option><option value="sábado">Sábado</option><option value="domingo">Domingo</option></select></div>
                <InputCompact label="HORÁRIO" value={cellForm.meeting_time} onChange={val => setCellForm({ ...cellForm, meeting_time: val })} dark={darkMode} />
              </div>
              <div className="relative"><InputCompact label="CEP LOCAL" value={cellForm.cep} onChange={val => { setCellForm({ ...cellForm, cep: val }); handleCepSearch(val, 'cell'); }} dark={darkMode} />{searchingCep && <Loader2 className="absolute right-3 top-7 text-blue-500 animate-spin" size={14} />}</div>
              <InputCompact label="ENDEREÇO" value={cellForm.address} onChange={val => setCellForm({ ...cellForm, address: val })} dark={darkMode} />
              <div className="grid grid-cols-2 gap-4">
                <InputCompact label="Nº" value={cellForm.number} onChange={val => setCellForm({ ...cellForm, number: val })} dark={darkMode} />
                <InputCompact label="BAIRRO" value={cellForm.neighborhood} onChange={val => setCellForm({ ...cellForm, neighborhood: val })} dark={darkMode} />
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex gap-4 shrink-0 bg-inherit rounded-b-2xl">
              <button onClick={() => setShowCellForm(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
              <button onClick={addCell} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-sm uppercase italic transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Salvar Célula</button>
            </div>
          </div>
        </div>
      )}

      {showSectorForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-2xl border ${t.border} shadow-2xl flex flex-col relative`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Novo Setor</h2>
              <button onClick={() => setShowSectorForm(false)} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-6">
              <InputCompact label="NOME DO SETOR" value={sectorForm.name} onChange={val => setSectorForm({ ...sectorForm, name: val })} dark={darkMode} />
            </div>
            <div className="p-6 border-t border-white/5 flex gap-4 shrink-0 bg-inherit rounded-b-2xl">
              <button onClick={() => setShowSectorForm(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
              <button onClick={addSector} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-black text-sm uppercase italic transition-all shadow-lg active:scale-95">Criar Setor</button>
            </div>
          </div>
        </div>
      )}

      {showReportForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md max-h-[95vh] rounded-2xl border ${t.border} shadow-2xl flex flex-col relative text-left`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Relatório</h2>
              <button onClick={() => setShowReportForm(false)} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar-fine">
              <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border} transition-all`}>
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">DATA (DD/MM/AAAA)</p>
                <input
                  type="text"
                  placeholder="00/00/0000"
                  value={reportForm.date.split('-').reverse().join('/')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length === 10) {
                      const parts = val.split('/');
                      if (parts.length === 3) {
                        setReportForm({ ...reportForm, date: `${parts[2]}-${parts[1]}-${parts[0]}` });
                      }
                    } else {
                      const parts = val.split('/');
                      if (parts.length === 3 && parts[2].length === 4) {
                        setReportForm({ ...reportForm, date: `${parts[2]}-${parts[1]}-${parts[0]}` });
                      }
                    }
                  }}
                  className={`w-full bg-transparent ${darkMode ? 'text-white' : 'text-slate-900'} font-black text-sm outline-none italic uppercase`}
                />
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-500/10">
                  <p className="text-[9px] font-black uppercase text-blue-500 mb-3 tracking-[0.2em]">Culto da Manhã</p>
                  <div className="grid grid-cols-3 gap-2">
                    <InputCompact label="PESSOAS" value={reportForm.morning_people} onChange={val => setReportForm({ ...reportForm, morning_people: val })} dark={darkMode} />
                    <InputCompact label="VISIT." value={reportForm.morning_visitors} onChange={val => setReportForm({ ...reportForm, morning_visitors: val })} dark={darkMode} />
                    <InputCompact label="CRIAN." value={reportForm.morning_kids} onChange={val => setReportForm({ ...reportForm, morning_kids: val })} dark={darkMode} />
                  </div>
                </div>

                <div className="p-4 bg-purple-600/5 rounded-2xl border border-purple-500/10">
                  <p className="text-[9px] font-black uppercase text-purple-500 mb-3 tracking-[0.2em]">Culto da Noite</p>
                  <div className="grid grid-cols-3 gap-2">
                    <InputCompact label="PESSOAS" value={reportForm.night_people} onChange={val => setReportForm({ ...reportForm, night_people: val })} dark={darkMode} />
                    <InputCompact label="VISIT." value={reportForm.night_visitors} onChange={val => setReportForm({ ...reportForm, night_visitors: val })} dark={darkMode} />
                    <InputCompact label="CRIAN." value={reportForm.night_kids} onChange={val => setReportForm({ ...reportForm, night_kids: val })} dark={darkMode} />
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}>
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">OBSERVAÇÕES</p>
                <textarea value={reportForm.notes} onChange={e => setReportForm({ ...reportForm, notes: e.target.value })} className="w-full bg-transparent font-bold text-xs outline-none h-20 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 shrink-0 bg-inherit rounded-b-2xl">
              <button onClick={addReport} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">Gravar Relatório</button>
            </div>
          </div>
        </div>
      )}

      {isChangingPassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleChangePassword} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-2xl p-8 border ${t.border} shadow-2xl relative text-left`}>
            <button type="button" onClick={() => setIsChangingPassword(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24} /></button>
            <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">Mudar Senha</h2>
            <div className="space-y-4">
              <InputCompact label="NOVA SENHA" value={authForm.newPassword} onChange={val => setAuthForm({ ...authForm, newPassword: val })} dark={darkMode} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase mt-6">Confirmar Nova Senha</button>
          </form>
        </div>
      )}

      {showLeaderConfig && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-hidden">
          <form onSubmit={saveLeaderConfig} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-md rounded-2xl border ${t.border} shadow-2xl flex flex-col relative text-left`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">
                {activeCell ? `Configurar Acesso: ${activeCell.name}` : 'Configurar Meu Acesso'}
              </h2>
              <button type="button" onClick={() => setShowLeaderConfig(false)} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">Defina o e-mail e a senha que você usará para acessar o painel da sua célula sem precisar de links.</p>
              <InputCompact label="E-MAIL DE ACESSO" value={leaderConfigForm.email} onChange={val => setLeaderConfigForm({...leaderConfigForm, email: val})} dark={darkMode} />
              <InputCompact label="SENHA DE ACESSO" value={leaderConfigForm.password} onChange={val => setLeaderConfigForm({...leaderConfigForm, password: val})} dark={darkMode} />
              
              {!searchParams.get('role') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                  <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}>
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Dia da Reunião</p>
                    <select 
                      value={leaderConfigForm.day_of_week} 
                      onChange={e => setLeaderConfigForm({...leaderConfigForm, day_of_week: e.target.value})} 
                      className="w-full bg-transparent font-black text-sm outline-none text-white italic"
                    >
                      <option value="segunda" className="bg-slate-900">Segunda</option>
                      <option value="terça" className="bg-slate-900">Terça</option>
                      <option value="quarta" className="bg-slate-900">Quarta</option>
                      <option value="quinta" className="bg-slate-900">Quinta</option>
                      <option value="sexta" className="bg-slate-900">Sexta</option>
                      <option value="sábado" className="bg-slate-900">Sábado</option>
                      <option value="domingo" className="bg-slate-900">Domingo</option>
                    </select>
                  </div>
                  <InputCompact label="Horário" value={leaderConfigForm.meeting_time} onChange={val => setLeaderConfigForm({...leaderConfigForm, meeting_time: val})} dark={darkMode} />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/5 flex gap-3">
              <button type="button" onClick={() => setShowLeaderConfig(false)} className="flex-1 py-3 text-slate-500 font-black uppercase text-[10px] hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 transition-all">Salvar Acesso</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Lançamento Rápido de Cultos */}
      {showQuickEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className={`${darkMode ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'} w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
            <header className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent text-left">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Lançamento Rápido</h3>
                <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">Contagem Direta de Culto</p>
              </div>
              <button onClick={() => setShowQuickEntry(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all"><X size={24} /></button>
            </header>
            
            <div className="p-8 space-y-6 text-left">
              <InputCompact type="date" label="Data do Culto" value={quickEntryForm.date} onChange={val => setQuickEntryForm({...quickEntryForm, date: val})} dark={darkMode} />
              
              <div className="grid grid-cols-3 gap-3">
                {['manha', 'noite', 'sabado'].map(type => (
                  <button
                    key={type}
                    onClick={() => setQuickEntryForm({...quickEntryForm, type})}
                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${quickEntryForm.type === type ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-600/20 scale-105' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'}`}
                  >
                    {type === 'manha' ? 'Manhã' : type === 'noite' ? 'Noite' : 'Sábado'}
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <InputCompact label="Total de Pessoas" value={quickEntryForm.total} onChange={val => setQuickEntryForm({...quickEntryForm, total: val})} dark={darkMode} placeholder="Ex: 150" />
                <div className="grid grid-cols-2 gap-4">
                  <InputCompact label="Visitantes" value={quickEntryForm.visitors} onChange={val => setQuickEntryForm({...quickEntryForm, visitors: val})} dark={darkMode} />
                  <InputCompact label="Crianças" value={quickEntryForm.kids} onChange={val => setQuickEntryForm({...quickEntryForm, kids: val})} dark={darkMode} />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex gap-4">
              <button onClick={() => setShowQuickEntry(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 rounded-2xl transition-all">Cancelar</button>
              <button onClick={saveQuickEntry} className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">Salvar Contagem</button>
            </div>
          </div>
        </div>
      )}

      {showVisitorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <form onSubmit={addVisitor} className={`${darkMode ? 'bg-[#0f172a]' : 'bg-white'} w-full max-w-2xl max-h-[95vh] rounded-2xl border ${t.border} shadow-2xl flex flex-col relative text-left`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Star size={20}/></div>
                <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Ficha de Visitante</h2>
              </div>
              <button type="button" onClick={() => setShowVisitorModal(false)} className="p-2 text-slate-500 hover:text-white rounded-full transition-all"><X size={24}/></button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar-fine">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2">Dados Pessoais</p>
                  <InputCompact label="NOME COMPLETO" value={visitorForm.name} onChange={val => setVisitorForm({...visitorForm, name: val})} dark={darkMode} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputCompact label="TELEFONE" value={visitorForm.phone} onChange={val => setVisitorForm({...visitorForm, phone: val})} dark={darkMode} />
                    <InputCompact label="E-MAIL" value={visitorForm.email} onChange={val => setVisitorForm({...visitorForm, email: val})} dark={darkMode} />
                  </div>
                  <InputCompact label="DISCIPULADOR (SE TIVER)" value={visitorForm.ministerios} onChange={val => setVisitorForm({...visitorForm, ministerios: val})} dark={darkMode} />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2">Localização e Célula</p>
                  <div className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${t.border}`}>
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">CEP (AUTO-PREENCHE)</p>
                    <input 
                      type="text" 
                      maxLength={8}
                      placeholder="Apenas números"
                      value={visitorForm.cep}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setVisitorForm({...visitorForm, cep: val});
                        if (val.length === 8) handleVisitorCep(val);
                      }}
                      className={`w-full bg-transparent ${darkMode ? 'text-white' : 'text-slate-900'} font-black text-sm outline-none`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><InputCompact label="ENDEREÇO" value={visitorForm.address} onChange={val => setVisitorForm({...visitorForm, address: val})} dark={darkMode} /></div>
                    <InputCompact label="Nº" value={visitorForm.number} onChange={val => setVisitorForm({...visitorForm, number: val})} dark={darkMode} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputCompact label="BAIRRO" value={visitorForm.neighborhood} onChange={val => setVisitorForm({...visitorForm, neighborhood: val})} dark={darkMode} />
                    <InputCompact label="CIDADE" value={visitorForm.city} onChange={val => setVisitorForm({...visitorForm, city: val})} dark={darkMode} />
                  </div>

                  {visitorForm.suggested_cell && (
                    <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-xl animate-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Célula Recomendada</p>
                      </div>
                      <p className="text-base font-black italic uppercase text-white leading-tight">{visitorForm.suggested_cell.name}</p>
                      <select 
                        value={visitorForm.suggested_cell.id} 
                        onChange={e => {
                          const cell = cells.find(c => c.id === e.target.value);
                          setVisitorForm({...visitorForm, suggested_cell: cell});
                        }}
                        className="w-full bg-transparent text-[9px] font-black uppercase text-slate-400 mt-2 outline-none cursor-pointer"
                      >
                        {cells.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name} (Líder: {c.leader})</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 shrink-0 bg-inherit rounded-b-2xl">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-sm uppercase transition-all shadow-xl shadow-blue-900/20 active:scale-95">Salvar e Conectar Visitante</button>
            </div>
          </form>
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

function InputCompact({ label, value, onChange, dark, type = "text", autoCapitalize = "on" }) {
  return (
    <div className={`${dark ? 'bg-white/5' : 'bg-slate-50'} p-3 rounded-xl border ${dark ? 'border-white/10' : 'border-slate-200'} transition-all`}>
      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <input 
        type={type}
        value={value} 
        onChange={e => onChange(e.target.value)} 
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'off' ? 'off' : 'on'}
        className={`w-full bg-transparent ${dark ? 'text-white' : 'text-slate-900'} font-black text-sm outline-none italic`} 
      />
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

function StatCard({ label, value, icon, color, dark, highlight, onClick }) {
  const colors = { blue: 'text-blue-500', indigo: 'text-indigo-500', yellow: 'text-yellow-500', purple: 'text-purple-500', emerald: 'text-emerald-500', orange: 'text-orange-500', red: 'text-red-500' };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`${dark ? 'bg-[#0f172a]/40 border-white/5 shadow-xl' : 'bg-white border-slate-100 shadow-sm'} border p-4 rounded-2xl text-left hover:border-blue-500/30 transition-all group ${highlight ? 'ring-2 ring-emerald-500/20' : ''} ${onClick ? 'cursor-pointer active:scale-95' : ''} w-full`}>
      <div className="flex justify-between items-start mb-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span><div className={`${colors[color]} opacity-40 group-hover:opacity-100 transition-all`}>{icon}</div></div>
      <p className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'} italic tracking-tighter`}>{value}</p>
    </Tag>
  );
}

function MenuBtn({ icon, label, active, onClick, open, dark }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : `${dark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}`}>
      <div className={`${active ? 'scale-110' : ''}`}>{icon}</div> {open && <span className="font-bold tracking-tight italic uppercase text-[10px]">{label}</span>}
    </button>
  );
}

function AttendanceReport({ members, cells, getMemberEngagement, darkMode }) {
  const [selectedCell, setSelectedCell] = useState('all');
  
  const t = {
    card: darkMode ? 'bg-[#0f172a]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm',
    text: darkMode ? 'text-white' : 'text-slate-900',
    subText: darkMode ? 'text-slate-500' : 'text-slate-400',
    header: darkMode ? 'bg-white/5' : 'bg-slate-50',
    row: darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
  };

  const filteredMembers = members.filter(m => selectedCell === 'all' ? true : Number(m.cell_id) === Number(selectedCell));
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 text-left">
        <div>
          <h1 className={`text-4xl font-black ${t.text} tracking-tight italic uppercase`}>Relatório de Presença</h1>
          <p className={t.subText}>Auditória detalhada de frequência da semana</p>
        </div>
        <select 
          value={selectedCell} 
          onChange={(e) => setSelectedCell(e.target.value)}
          className="bg-blue-600 text-white border-none p-3 px-6 rounded-2xl font-black text-[10px] uppercase italic outline-none shadow-xl shadow-blue-600/20 cursor-pointer hover:bg-blue-500 transition-all"
        >
          <option value="all" className="bg-slate-900">TODAS AS CÉLULAS</option>
          {cells.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
          <p className="text-emerald-600 font-black text-[10px] uppercase mb-1">PRESENÇA TOTAL</p>
          <p className="text-3xl font-black text-emerald-500 italic">{members.filter(m => m.attended_cell).length} <span className="text-sm opacity-50">Membros na Célula</span></p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl">
          <p className="text-blue-600 font-black text-[10px] uppercase mb-1">PRESENÇA NO CULTO</p>
          <p className="text-3xl font-black text-blue-500 italic">{members.filter(m => m.attended_cult).length} <span className="text-sm opacity-50">Membros no Culto</span></p>
        </div>
      </div>

      <div className={`${t.card} rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`${t.header} border-b ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
                <th className={`px-6 py-4 text-[10px] font-black ${t.subText} uppercase tracking-widest`}>Membro / Célula</th>
                <th className={`px-6 py-4 text-[10px] font-black ${t.subText} uppercase tracking-widest text-center`}>Célula</th>
                <th className={`px-6 py-4 text-[10px] font-black ${t.subText} uppercase tracking-widest text-center`}>Culto</th>
                <th className={`px-6 py-4 text-[10px] font-black ${t.subText} uppercase tracking-widest`}>Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filteredMembers.map(m => {
                const { isPresentCell, isPresentCult } = getMemberEngagement(m);
                return (
                <tr key={m.id} className={`${t.row} transition-colors`}>
                  <td className="px-6 py-4">
                    <p className={`font-black ${t.text} text-sm uppercase italic`}>{m.name}</p>
                    <p className={`text-[8px] font-black ${t.subText} uppercase`}>{cells.find(c => Number(c.id) === Number(m.cell_id))?.name || 'Sem Célula'}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isPresentCell ? 
                      <div className="inline-flex p-1 bg-emerald-500/20 text-emerald-500 rounded-lg"><Check size={16} /></div> : 
                      <div className="inline-flex p-1 bg-red-500/20 text-red-500 rounded-lg"><X size={16} /></div>
                    }
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isPresentCult ? 
                      <div className="inline-flex p-1 bg-emerald-500/20 text-emerald-500 rounded-lg"><Check size={16} /></div> : 
                      <div className="inline-flex p-1 bg-red-500/20 text-red-500 rounded-lg"><X size={16} /></div>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${isPresentCell && isPresentCult ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'}`}>
                      {isPresentCell && isPresentCult ? 'ENGANJADO' : 'PENDENTE'}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, dark }) {
  if (active && payload && payload.length) {
    return (
      <div className={`${dark ? 'bg-slate-900 border-white/10 shadow-2xl' : 'bg-white shadow-xl border-slate-100'} p-4 rounded-2xl border backdrop-blur-md min-w-[140px]`}>
        <p className="text-[9px] font-black mb-3 uppercase tracking-widest text-slate-500 pb-2 border-b border-white/5">{payload[0].payload.fullDate || label}</p>
        <div className="space-y-2">
          {payload.sort((a, b) => b.value - a.value).map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                <span className="text-[9px] font-black uppercase text-slate-400">{p.name}</span>
              </div>
              <span className="text-sm font-black italic tracking-tighter" style={{ color: p.color || p.fill }}>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function PastoralReport({ members, cells, sectors, attendance, getMemberEngagement, darkMode, selectedSectors, setSelectedSectors }) {
  const t = {
    card: darkMode ? 'bg-[#0f172a]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm',
    text: darkMode ? 'text-white' : 'text-slate-900',
    subText: darkMode ? 'text-slate-500' : 'text-slate-400',
    border: darkMode ? 'border-white/5' : 'border-slate-100',
    tableHead: darkMode ? 'bg-white/5' : 'bg-slate-50',
    hover: darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
  };

  const toggleSector = (id) => {
    setSelectedSectors(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const filteredCells = cells.filter(c => selectedSectors.length === 0 || selectedSectors.includes(Number(c.sector_id)));
  const filteredCellIds = filteredCells.map(c => c.id);
  const filteredMembers = members.filter(m => filteredCellIds.includes(Number(m.cell_id)));

  const stats = filteredMembers.reduce((acc, m) => {
    const { isPresentCell, isPresentCult } = getMemberEngagement(m);
    acc.total++;
    if (isPresentCell) acc.cellPresent++;
    if (isPresentCult) acc.cultPresent++;
    if (isPresentCell && isPresentCult) acc.both++;
    return acc;
  }, { total: 0, cellPresent: 0, cultPresent: 0, both: 0 });

  const exportExcel = () => {
    const data = filteredMembers.map(m => {
      const { isPresentCell, isPresentCult } = getMemberEngagement(m);
      const cell = cells.find(c => c.id === m.cell_id);
      const sector = sectors.find(s => s.id === Number(cell?.sector_id));
      
      return {
        'NOME': m.name,
        'TELEFONE': m.phone || '',
        'SETOR': sector?.name || 'Sem Setor',
        'CÉLULA': cell?.name || 'Sem Célula',
        'LÍDER': cell?.leader || '',
        'PRESENÇA CÉLULA': isPresentCell ? 'SIM' : 'NÃO',
        'PRESENÇA CULTO': isPresentCult ? 'SIM' : 'NÃO',
        'STATUS': isPresentCell && isPresentCult ? 'ENGAJADO' : (isPresentCell || isPresentCult ? 'PARCIAL' : 'AUSENTE')
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    // Auto-size columns
    const max_width = data.reduce((w, r) => Math.max(w, r.NOME.length), 10);
    ws['!cols'] = [{ wch: max_width + 5 }];

    XLSX.writeFile(wb, `RELATORIO_PASTORAL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-4xl font-black ${t.text} italic uppercase tracking-tighter`}>Relatório Pastoral</h2>
          <p className={t.subText}>Visão semanal estratégica por setor</p>
        </div>
        <button 
          onClick={exportExcel}
          disabled={filteredMembers.length === 0}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2 group"
        >
          <FileDown size={20} className="group-hover:scale-110 transition-transform" />
          <span>Baixar Excel</span>
        </button>
      </header>

      <div className={`${t.card} p-6 border rounded-3xl`}>
        <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Selecionar Setores</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setSelectedSectors([])}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${selectedSectors.length === 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/5'}`}
          >
            Todos os Setores
          </button>
          {sectors.map(s => (
            <button
              key={s.id}
              onClick={() => toggleSector(s.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${selectedSectors.includes(s.id) ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/5'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total de Membros" value={stats.total} icon={<Users size={16}/>} color="blue" dark={darkMode} />
        <StatCard label="Presença Célula" value={stats.cellPresent} icon={<Home size={16}/>} color="emerald" dark={darkMode} />
        <StatCard label="Presença Culto" value={stats.cultPresent} icon={<Star size={16}/>} color="purple" dark={darkMode} />
        <StatCard label="Engajamento 100%" value={`${Math.round((stats.both / stats.total) * 100 || 0)}%`} icon={<Activity size={16}/>} color="blue" dark={darkMode} />
      </div>

      <div className={`${t.card} border rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`${t.tableHead} border-b ${t.border}`}>
              <tr>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Membro</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Célula / Setor</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest">Célula</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest">Culto</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.border}`}>
              {filteredMembers.sort((a, b) => a.name.localeCompare(b.name)).map(m => {
                const { isPresentCell, isPresentCult } = getMemberEngagement(m);
                const cell = cells.find(c => c.id === m.cell_id);
                const sector = sectors.find(s => s.id === Number(cell?.sector_id));
                
                return (
                  <tr key={m.id} className={t.hover}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black italic uppercase tracking-tighter">{m.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{m.phone || 'Sem Telefone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-black uppercase italic">{cell?.name || '---'}</p>
                      <p className="text-[8px] font-black text-blue-500 uppercase">{sector?.name || 'Sem Setor'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex p-1 rounded-lg ${isPresentCell ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                        {isPresentCell ? <Check size={14} /> : <X size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex p-1 rounded-lg ${isPresentCult ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                        {isPresentCult ? <Check size={14} /> : <X size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${isPresentCell && isPresentCult ? 'bg-emerald-500/20 text-emerald-500' : (isPresentCell || isPresentCult ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500')}`}>
                        {isPresentCell && isPresentCult ? 'ENGAJADO' : (isPresentCell || isPresentCult ? 'PARCIAL' : 'AUSENTE')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-black italic uppercase text-xs">Nenhum membro encontrado nos setores selecionados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function App() { return <ChurchAppWrapper />; }
