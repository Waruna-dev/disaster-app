const fs = require('fs');
const path = require('path');
function fix(dir) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) fix(p);
    else if (p.endsWith('.tsx')) {
      const content = fs.readFileSync(p, 'utf8');
      if (content.includes('// Placeholder')) {
        const name = path.basename(p, '.tsx').replace(/[^a-zA-Z]/g, '');
        const CompName = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Screen';
        fs.writeFileSync(p, `import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function ${CompName}() {\n  return (\n    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n      <Text>${CompName}</Text>\n    </View>\n  );\n}\n`);
      }
    }
  });
}
fix('app');
console.log('Fixed placeholders');
