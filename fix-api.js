const fs = require('fs');
let c = fs.readFileSync('ppk-api.js', 'utf8');

c = c.replace(/apicache_/, 'apicache_v2_');

c = c.replace(
    /var notifRows = await sbGet\('notifications', \{ house_number: 'eq\.' \+ houseNumber, period: 'eq\.' \+ period, order: 'sent_at\.desc', limit: '1' \}\);/,
    'var notifRows = await sbGet(\'notifications\', { house_number: \'eq.\' + houseNumber, order: \'sent_at.desc\', limit: \'1\' });'
);

c = c.replace(
    /notifRow = notifRows && notifRows\[0\];/,
    'notifRow = notifRows && notifRows[0];\n                        if (notifRow && notifRow.sent_at) {\n                            var _nDate = new Date(notifRow.sent_at);\n                            if (!isNaN(_nDate.getTime()) && ((now.getTime() - _nDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {\n                                notifRow = null;\n                            }\n                        }'
);

c = c.replace(
    /_sent_at: notifRow\.sent_at\s*\};\s*try\s*\{/,
    '_sent_at: notifRow.sent_at\n                    };\n                    period = notifRow.period;\n                    try {'
);

fs.writeFileSync('ppk-api.js', c);
console.log('done');