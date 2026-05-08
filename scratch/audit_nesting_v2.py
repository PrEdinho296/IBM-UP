
import sys

def audit_nesting_correctly(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    level = 0
    paren_level = 0
    in_string = None # ', ", or `
    i = 0
    while i < len(content):
        char = content[i]
        
        if in_string:
            if char == in_string:
                # Check for escaped char? Simplified.
                in_string = None
            elif char == '$' and in_string == '`' and i+1 < len(content) and content[i+1] == '{':
                # Nesting in backticks!
                level += 1
                i += 1
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
        
        i += 1
    
    print(f"Final levels: L{level} P{paren_level}")

audit_nesting_correctly('src/app/page.js')
