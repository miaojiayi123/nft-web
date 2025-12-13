const fs = require('fs');
const path = require('path');

// --- 配置 ---
// 输出文件名
const OUTPUT_FILE = 'project_code.xml';

// 需要忽略的文件夹 (非常重要，防止文件过大)
const IGNORE_DIRS = [
  'node_modules',
  '.next',
  '.git',
  '.vscode',
  'public', // 图片资源通常不需要代码上下文
  'dist',
  'build'
];

// 需要忽略的文件 (保护隐私)
const IGNORE_FILES = [
  'package-lock.json',
  'yarn.lock',
  '.env',
  '.env.local',
  '.DS_Store',
  'pack_code.js', // 别把自己也打包进去了
  OUTPUT_FILE
];

// 需要包含的文件后缀 (只读取代码文件)
const INCLUDE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.sol', '.md'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    // 检查是否是文件夹
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // 检查文件
      const ext = path.extname(file);
      if (!IGNORE_FILES.includes(file) && INCLUDE_EXTS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function generateXML() {
  const rootDir = process.cwd();
  console.log(`🔍 Scanning directory: ${rootDir}`);
  
  const allFiles = getAllFiles(rootDir);
  let output = `<project_root>\n`;

  console.log(`📦 Found ${allFiles.length} files. Packaging...`);

  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(rootDir, file);
      
      // 简单的 XML 结构
      output += `  <file path="${relativePath}">\n`;
      output += `<![CDATA[\n${content}\n]]>\n`; // 使用 CDATA 防止特殊字符破坏 XML
      output += `  </file>\n`;
    } catch (err) {
      console.error(`❌ Error reading ${file}: ${err.message}`);
    }
  });

  output += `</project_root>`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`✅ Success! Code packaged into: ${OUTPUT_FILE}`);
}

generateXML();