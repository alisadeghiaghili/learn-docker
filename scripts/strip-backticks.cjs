const fs = require('fs');
const p = 'src/levels/coverage-pack.ts';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(/`/g, "'");
fs.writeFileSync(p, t);
console.log('stripped backticks');
