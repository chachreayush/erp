with open("src/pages/finance/ExpenseManagement.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("import { useReturnNavigation } from '../../hooks/useReturnNavigation';", "import { useReturnNavigation } from '../../hooks/useReturnNavigation';\nimport ExpenseClaimEntryModal from './ExpenseClaimEntryModal';")

code = code.replace("const { handleReturn } = useReturnNavigation();", "const { handleReturn } = useReturnNavigation();\n  const [isModalOpen, setIsModalOpen] = useState(false);")

code = code.replace("onClick={() => alert('New Expense Claim UI placeholder')}", "onClick={() => setIsModalOpen(true)}")

code = code.replace("</div>\n    </div>\n  );\n}", "</div>\n      <ExpenseClaimEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchClaims(); }} />\n    </div>\n  );\n}")

with open("src/pages/finance/ExpenseManagement.tsx", "w", encoding="utf-8") as f:
    f.write(code)
