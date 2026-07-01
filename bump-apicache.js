const fs = require('fs');
let c = fs.readFileSync('ppk-api.js', 'utf8');

c = c.replace(/var key = 'apicache_v2_' \+ action/g, "var key = 'apicache_v3_' + action");

fs.writeFileSync('ppk-api.js', c);
console.log('Cache key bumped to v3!');
