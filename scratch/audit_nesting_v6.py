
import sys

def audit_nesting_v6(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    level = 0
    paren_level = 0
    in_string = None
    i = 0
    line_num = 1
    while i < len(content):
        char = content[i]
        
        if in_string:
            if char == in_string:
                in_string = None
            elif char == '\n':
                line_num += 1
        else:
            if char in ["'", '"', '`']:
                in_string = char
            elif char == '{':
                level += 1
            elif char == '}':
                level -= 1
            elif char == '(':
                paren_level += 1
            elif char == ')':
                paren_level -= 1
            elif char == '\n':
                line_num += 1
        
        if i+1 < len(content) and content[i+1] == '\n':
             if 530 <= line_num <= 540:
                 print(f"L{line_num}: Brace={level} Paren={paren_level}")
        
        i += 1
    
    print(f"Final levels: BraceLevel={level} ParenLevel={paren_level}")

audit_nesting_v6('src/app/page.js')
