
import sys

try:
    with open('src/app/page.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Single quotes: {content.count(chr(39))}")
    print(f"Double quotes: {content.count(chr(34))}")
    print(f"Backticks: {content.count(chr(96))}")
    print(f"Open braces: {content.count('{')}")
    print(f"Close braces: {content.count('}')}")
    print(f"Open parens: {content.count('(')}")
    print(f"Close parens: {content.count(')')}")
    print(f"Open brackets: {content.count('[')}")
    print(f"Close brackets: {content.count(']')}")

except Exception as e:
    print(f"Error: {e}")
