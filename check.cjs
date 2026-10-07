const fs = require('fs');
const path = require('path');

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const imports = [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g), ...content.matchAll(/import\s+['"](\.[^'"]+)['"]/g)];
            for (const match of imports) {
                const imp = match[1];
                const targetPath = path.resolve(dir, imp);
                const targetDir = path.dirname(targetPath);
                const targetBase = path.basename(targetPath);
                
                if (fs.existsSync(targetDir)) {
                    const actualFiles = fs.readdirSync(targetDir);
                    let matched = false;
                    for (const actual of actualFiles) {
                        const actualNoExt = actual.replace(/\.[^/.]+$/, "");
                        if (actual.toLowerCase() === targetBase.toLowerCase() || actualNoExt.toLowerCase() === targetBase.toLowerCase()) {
                            matched = true;
                            if (actual !== targetBase && actualNoExt !== targetBase) {
                                console.error(`CASE MISMATCH in ${fullPath}: Imported '${imp}', Actual: '${actual}'`);
                            }
                        }
                    }
                }
            }
        }
    }
}
checkDir('./src');
console.log('Done');
