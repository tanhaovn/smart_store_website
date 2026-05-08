import os

extensions = ('.py', '.jsx', '.js', '.css', '.ts', '.tsx')
total_lines = 0
file_count = 0
exclude_dirs = {'node_modules', '__pycache__', '.git', '.pytest_cache', 'venv', 'env'}

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.endswith(extensions):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = len(f.readlines())
                    total_lines += lines
                    file_count += 1
            except:
                pass

print("Tong so file code: " + str(file_count))
print("Tong so dong code: " + str(total_lines))
