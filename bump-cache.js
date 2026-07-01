const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const today = new Date();
const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random letter A-Z
const newVersion = dateStr + suffix;

let count = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.match(/ppk-api\.js\?v=\w+/)) {
        content = content.replace(/ppk-api\.js\?v=\w+/g, 'ppk-api.js?v=' + newVersion);
        fs.writeFileSync(f, content, 'utf8');
        count++;
    }
});
console.log('Successfully updated ' + count + ' files to version: ' + newVersion);
