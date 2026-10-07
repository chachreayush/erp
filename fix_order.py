with open("src/pages/finance/ExpenseManagement.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = "  useReturnNavigation(isModalOpen);\n  const [isModalOpen, setIsModalOpen] = useState(false);"
replacement = "  const [isModalOpen, setIsModalOpen] = useState(false);\n  useReturnNavigation(isModalOpen);"
code = code.replace(target, replacement)

with open("src/pages/finance/ExpenseManagement.tsx", "w", encoding="utf-8") as f:
    f.write(code)
