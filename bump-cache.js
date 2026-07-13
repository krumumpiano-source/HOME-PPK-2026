const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const today = new Date();
const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random letter A-Z
const newVersion = dateStr + suffix;

let htmlCount = 0;

// 1. Update version in HTML files
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // อัพเดต ?v=... สำหรับไฟล์ .js และ .css ภายในโปรเจกต์
    if (content.match(/\.(js|css)\?v=\w+/g)) {
        content = content.replace(/(\.(?:js|css))\?v=\w+/g, '$1?v=' + newVersion);
        fs.writeFileSync(f, content, 'utf8');
        htmlCount++;
    }
});

// 2. Update CACHE_NAME in sw.js
let swUpdated = false;
if (fs.existsSync('sw.js')) {
    let swContent = fs.readFileSync('sw.js', 'utf8');
    if (swContent.match(/var CACHE_NAME = 'ppk-v\w+';/)) {
        swContent = swContent.replace(/var CACHE_NAME = 'ppk-v\w+';/, `var CACHE_NAME = 'ppk-v${newVersion}';`);
        fs.writeFileSync('sw.js', swContent, 'utf8');
        swUpdated = true;
    }
}

console.log(`Successfully updated ${htmlCount} HTML files to version: ${newVersion}`);
if (swUpdated) {
    console.log(`Successfully updated Service Worker (sw.js) cache to: ppk-v${newVersion}`);
} else {
    console.log(`Warning: Could not update sw.js`);
}
