
import sys

def audit_nesting(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    level = 0
    paren_level = 0
    for i, char in enumerate(content):
        if char == '{':
            level += 1
        elif char == '}':
            level -= 1
            if level < 0:
                print(f"Error: Extra closing brace at char {i}")
                # level = 0
        elif char == '(':
            paren_level += 1
        elif char == ')':
            paren_level -= 1
            if paren_level < 0:
                print(f"Error: Extra closing paren at char {i}")
                # paren_level = 0
    
    print(f"Final brace level: {level}")
    print(f"Final paren level: {paren_level}")

audit_nesting('src/app/page.js')
