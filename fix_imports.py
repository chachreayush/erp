import os

files = [
    'src/pages/inventory/CustomerClaims.tsx',
    'src/pages/inventory/VendorClaims.tsx',
    'src/pages/inventory/Replenishment.tsx'
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("import React, { useEffect, { useState } from 'react';", 
                              "import React, { useEffect, useState } from 'react';")
                              
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print('Fixed', path)
