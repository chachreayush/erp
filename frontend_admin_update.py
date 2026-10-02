with open('src/pages/admin/RegisterClientModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_form = """                  <input 
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                />
              </div>
            </div>"""

new_form = """                  <input 
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
              <input 
                type="checkbox" 
                name="is_admin_company" 
                checked={formData.is_admin_company || False} 
                onChange={e => setFormData({ ...formData, is_admin_company: e.target.checked })} 
                id="is_admin_company"
              />
              <div>
                <label htmlFor="is_admin_company" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'block' }}>
                  Create as Admin Company (Reseller / Master Admin)
                </label>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  This organization will be able to create its own sub-clients and manage them.
                </div>
              </div>
            </div>"""

content = content.replace(old_form, new_form)

old_state = """    const [formData, setFormData] = useState({
      org_name: '',
      org_code: '',
      admin_name: '',
      admin_username: '',
      admin_password: ''
    })"""

new_state = """    const [formData, setFormData] = useState({
      org_name: '',
      org_code: '',
      admin_name: '',
      admin_username: '',
      admin_password: '',
      is_admin_company: false
    })"""

content = content.replace(old_state, new_state)

old_reset = """          org_code: '',
          admin_name: '',
          admin_username: '',
          admin_password: ''
        })"""
new_reset = """          org_code: '',
          admin_name: '',
          admin_username: '',
          admin_password: '',
          is_admin_company: false
        })"""
content = content.replace(old_reset, new_reset)

with open('src/pages/admin/RegisterClientModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
