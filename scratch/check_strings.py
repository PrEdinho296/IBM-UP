
import sys

def check_strings(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    in_string = None
    line = 1
    col = 1
    for i, char in enumerate(content):
        if in_string:
            if char == in_string:
                # print(f"Closed {in_string} at {line}:{col}")
                in_string = None
            elif char == '\n':
                line += 1
                col = 1
                if in_string != '`':
                    print(f"Error: Unclosed {in_string} at line {line-1}")
                    in_string = None
            else:
                col += 1
        else:
            if char in ["'", '"', '`']:
                in_string = char
                # print(f"Opened {in_string} at {line}:{col}")
            elif char == '\n':
                line += 1
                col = 1
            else:
                col += 1
    
    if in_string:
        print(f"Error: File ended with unclosed {in_string}")

check_strings('src/app/page.js')
