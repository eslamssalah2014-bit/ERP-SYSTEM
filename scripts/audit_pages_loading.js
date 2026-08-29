const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/app');

function getFiles(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(getFiles(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      files.push(fullPath);
    }
  });
  return files;
}

const allFiles = getFiles(srcDir);
const pageFiles = allFiles.filter(f => f.includes('page.tsx'));

console.log(`Found ${pageFiles.length} page files.`);
pageFiles.forEach(pf => {
  const content = fs.readFileSync(pf, 'utf8');
  const usesERP = content.includes('useERP(');
  const usesLoading = content.includes('isLoadingData');
  const relPath = path.relative(srcDir, pf);
  console.log(`- ${relPath}: usesERP=${usesERP}, usesLoadingData=${usesLoading}`);
});
