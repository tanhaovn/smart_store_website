import os

extensions = {'.py': 0, '.jsx': 0, '.js': 0, '.css': 0, '.ts': 0, '.tsx': 0}
exclude_dirs = {'node_modules', '__pycache__', '.git', '.pytest_cache', 'venv', '.venv', 
                'env', '.env', 'dist', 'build', '.next', '.vercel', 'migrations', 'backups',
                'postman', 'uploads', '.pytest', '__pycache__'}

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        for ext in extensions:
            if file.endswith(ext):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len(f.readlines())
                        extensions[ext] += lines
                except:
                    pass
                break

total = sum(extensions.values())
print("\n=== TONG CODE CHI TÍNH CODE CHINH ===\n")
for ext, count in sorted(extensions.items(), key=lambda x: x[1], reverse=True):
    if count > 0:
        print(f"{ext:6s}: {count:8,} lines")
print("-" * 30)
print(f"{'TONG':6s}: {total:8,} lines\n")
