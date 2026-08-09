def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    brace_count = 0
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
        if brace_count < 0:
            print(f"Brace count dropped below 0 at line {i+1}: {line}")
            break
    print(f"Final brace count: {brace_count}")

check_braces('src/pages/inventory/Products.tsx')
