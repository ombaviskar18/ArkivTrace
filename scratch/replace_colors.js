const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../frontend/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (/\.(tsx|ts|css)$/.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/#00C8FF/gi, '#3b82f6');
  content = content.replace(/#55E5FF/gi, '#60a5fa');
  content = content.replace(/#087DEB/gi, '#2563eb');
  content = content.replace(/rgba\(\s*0\s*,\s*200\s*,\s*255\s*,/g, 'rgba(59, 130, 246, ');
  content = content.replace(/rgba\(\s*8\s*,\s*125\s*,\s*235\s*,/g, 'rgba(37, 99, 235, ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${path.relative(srcDir, file)}`);
    changedCount++;
  }
});

console.log(`Done! Updated ${changedCount} files.`);
