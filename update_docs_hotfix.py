
import datetime
today = datetime.datetime.now().strftime('%Y-%m-%d')
def append(fn, content):
    with open(fn, 'a', encoding='utf-8') as f:
        f.write(content)

append('PROJECT_MEMORY.md', '- **Sales Bill Hotfix**: Resolved React-Babel JSX nesting issue (Unterminated JSX contents) to stabilize the edge-to-edge layout.\n')
append('DEVELOPER_MANUAL.md', '- **Sales Bill Layout Notes**: When modifying SalesBill.tsx, ensure the MAIN WORKSPACE SPLIT flex container is properly terminated before the FOOTER ACTION BAR to prevent React-Babel parsing errors.\n')

