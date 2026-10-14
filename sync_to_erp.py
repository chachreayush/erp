import os
import subprocess

src_dir = r"C:\Users\DELL\OneDrive\Desktop\erp2"
dest_dir = r"C:\Users\DELL\OneDrive\Desktop\erp"

print(f"Syncing from {src_dir} to {dest_dir}...")

# 1. Sync src
print("\n[1/3] Syncing src...")
cmd1 = [
    "robocopy",
    os.path.join(src_dir, "src"),
    os.path.join(dest_dir, "src"),
    "/MIR", "/XD", "node_modules"
]
res1 = subprocess.run(cmd1)
print(f"src exit code: {res1.returncode}")

# 2. Sync backend
print("\n[2/3] Syncing backend...")
cmd2 = [
    "robocopy",
    os.path.join(src_dir, "backend"),
    os.path.join(dest_dir, "backend"),
    "/MIR", "/XD", "__pycache__", ".venv", ".pytest_cache"
]
res2 = subprocess.run(cmd2)
print(f"backend exit code: {res2.returncode}")

# 3. Sync root documents and configs
print("\n[3/3] Syncing root documentation and configs...")
cmd3 = [
    "robocopy",
    src_dir,
    dest_dir,
    "*.md", "*.json", "*.txt", "*.html", "*.py", "*.docx", "*.png",
    "/XF", "package-lock.json",
    "/XD", "node_modules", "backend", "src", ".git"
]
res3 = subprocess.run(cmd3)
print(f"root docs exit code: {res3.returncode}")

print("\nRobocopy sync finished successfully!")
