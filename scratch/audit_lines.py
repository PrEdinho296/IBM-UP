
import sys

def audit_nesting_lines(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    level = 0
    paren_level = 0
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                level += 1
            elif char == '}':
                level -= 1
            elif char == '(':
                paren_level += 1
            elif char == ')':
                paren_level -= 1
        
        if (i+1) % 100 == 0:
            print(f"Line {i+1}: BraceLevel={level} ParenLevel={paren_level}")
    
    print(f"Final levels: BraceLevel={level} ParenLevel={paren_level}")

audit_nesting_lines('src/app/page.js')
