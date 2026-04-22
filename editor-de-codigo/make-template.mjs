import fs from 'fs';
import path from 'path';

// Get the source folder from command line arguments
const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error('Uso: node make-template.mjs <ruta_a_tu_proyecto>');
  process.exit(1);
}

const resolvePath = path.resolve(sourceDir);

if (!fs.existsSync(resolvePath)) {
  console.error(`Error: La carpeta no existe -> ${resolvePath}`);
  process.exit(1);
}

const isBinary = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  // SVG is text, so we remove it from binary list.
  return ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4'].includes(ext);
};

const fileTree = {};

const walkDir = (dir, rootDir) => {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'dist') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Add empty directory just in case
      const relativeDirPath = '/' + path.relative(rootDir, fullPath).replace(/\\/g, '/');
      fileTree[relativeDirPath] = "DIRECTORY:";
      walkDir(fullPath, rootDir);
    } else {
      const relativePath = '/' + path.relative(rootDir, fullPath).replace(/\\/g, '/');
      
      try {
        if (isBinary(file)) {
          const content = fs.readFileSync(fullPath);
          fileTree[relativePath] = "BASE64:" + content.toString('base64');
        } else {
          const content = fs.readFileSync(fullPath, 'utf8');
          const escapedContent = content
            .replace(/\\/g, '\\\\')
            .replace(/\`/g, '\\`')
            .replace(/\$/g, '\\$');
            
          fileTree[relativePath] = escapedContent;
        }
      } catch (e) {
        console.log(`[!] Error leyendo el archivo ${fullPath}`);
      }
    }
  }
};

console.log(`Leyendo el proyecto: ${resolvePath}`);
walkDir(resolvePath, resolvePath);

// Generate the TypeScript file content
let tsOutput = 'export const defaultFiles: { [key: string]: string } = {\n';
for (const [filePath, content] of Object.entries(fileTree)) {
  tsOutput += `  '${filePath}': \`${content}\`,\n`;
}
tsOutput += '};\n';

// Write to src/lib/files.ts
const targetFile = path.resolve('./src/lib/files.ts');
fs.writeFileSync(targetFile, tsOutput, 'utf8');

console.log('✅ ¡Éxito! El proyecto ha sido inyectado en src/lib/files.ts y ahora es la plantilla predeterminada.');
