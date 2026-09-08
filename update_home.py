import re

with open('src/pages/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the layout
new_layout = '''  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '20px', animation: 'fadeIn 0.3s ease-in-out', height: '100%', overflow: 'hidden', display: 'flex', gap: '24px' }}>
      
      {/* LEFT COLUMN: Welcome & Modules */}
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '24px', flexShrink: 0 }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
            Select a module below to begin, or check the latest company bulletins.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
          alignContent: 'start',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {modules.map(mod => (
            <div 
              key={mod.path}
              onClick={() => navigate(mod.path)}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)',
                height: '100%'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 12px -3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = mod.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                backgroundColor: ${mod.color}15, color: mod.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {mod.icon}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text)' }}>
                  {mod.label}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {mod.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Bulletin Board */}
      <div style={{ 
        flex: '1', 
        borderLeft: '1px solid var(--color-border)', 
        paddingLeft: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
          <BulletinBoard />
        </div>
      </div>

    </div>
  )'''

# We need to replace everything from eturn ( to the end of the file.
content = re.sub(r'return\s*\(\s*<div.*?</div>\s*\)\s*\}\s*$', new_layout + '\\n}', content, flags=re.DOTALL)

with open('src/pages/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated HomeScreen.tsx')
