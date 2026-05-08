
import sys

def audit_nesting_v3(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    level = 0
    paren_level = 0
    in_string = None # ', ", or `
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
                if line_num % 100 == 0:
                    print(f"Line {line_num}: L{level} P{paren_level}")
        
        i += 1
    
    print(f"Final levels: L{level} P{paren_level}")

audit_nesting_v3('src/app/page.js')
