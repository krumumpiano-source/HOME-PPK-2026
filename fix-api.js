const fs = require('fs');
let c = fs.readFileSync('ppk-api.js', 'utf8');

c = c.replace(
    /var notifRows = await sbGet\('notifications', \{ house_number: 'eq\.' \+ houseNumber, order: 'sent_at\.desc', limit: '1' \}\);\s*notifRow = notifRows && notifRows\[0\];\s*if \(notifRow && notifRow\.sent_at\) \{[\s\S]*?\}\s*\}\s*catch\(e\) \{\}/,
    'var notifRows = await sbGet(\'notifications\', { house_number: \'eq.\' + houseNumber, period: \'eq.\' + period, order: \'sent_at.desc\', limit: \'1\' });\n                        notifRow = notifRows && notifRows[0];\n                    } catch(e) {}'
);

c = c.replace(
    /_sent_at: notifRow\.sent_at\s*\}\;\s*period = notifRow\.period\;\s*try \{/,
    '_sent_at: notifRow.sent_at\n                    };\n                    try {'
);

fs.writeFileSync('ppk-api.js', c);
console.log('done');