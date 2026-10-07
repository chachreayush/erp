with open("src/pages/finance/ExpenseManagement.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Fix useReturnNavigation usage
code = code.replace("const { handleReturn } = useReturnNavigation();", "useReturnNavigation(isModalOpen);")

# Remove redundant Escape key listener that uses handleReturn
listener_block = """    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReturn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);"""

code = code.replace(listener_block, "")

with open("src/pages/finance/ExpenseManagement.tsx", "w", encoding="utf-8") as f:
    f.write(code)
