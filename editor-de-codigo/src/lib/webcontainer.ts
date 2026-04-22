import { WebContainer } from '@webcontainer/api';
import { defaultFiles } from './files';

let webcontainerInstance: WebContainer | null = null;
let shellProcess: any = null;

// Convert our simplistic file structure to WebContainer FileSystemTree
const convertToWebContainerFs = (files: { [key: string]: string }) => {
  const rootTree: any = {};
  
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean);
    let currentLevel = rootTree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (content === "DIRECTORY:") {
          currentLevel[part] = { directory: {} };
        } else if (content.startsWith("BASE64:")) {
          const b64 = content.substring(7);
          const binStr = atob(b64);
          const bytes = new Uint8Array(binStr.length);
          for (let j = 0; j < binStr.length; j++) {
            bytes[j] = binStr.charCodeAt(j);
          }
          currentLevel[part] = { file: { contents: bytes } };
        } else {
          currentLevel[part] = {
            file: {
              contents: content
            }
          };
        }
      } else {
        // It's a directory
        if (!currentLevel[part]) {
          currentLevel[part] = { directory: {} };
        }
        currentLevel = currentLevel[part].directory;
      }
    }
  }
  
  return rootTree;
};

let bootPromise: Promise<WebContainer> | null = null;

export async function bootWebContainer() {
  if (bootPromise) return bootPromise;
  
  bootPromise = (async () => {
    // Call only once
    const instance = await WebContainer.boot();
    webcontainerInstance = instance;
    
    // Mount files
    await instance.mount(convertToWebContainerFs(defaultFiles));
    
    return instance;
  })();
  
  return bootPromise;
}

export function getWebContainer() {
  return webcontainerInstance;
}

export async function readWebContainerFiles(): Promise<{ [key: string]: string }> {
  if (!webcontainerInstance) return {};
  
  const fsFlat: { [key: string]: string } = {};
  
  async function readDir(dir: string) {
    // Read contents of directory
    const entries = await webcontainerInstance!.fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // No blocks: Read everything
      const fullPath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
      
      if (entry.isDirectory()) {
        fsFlat[fullPath] = 'DIRECTORY:';
        await readDir(fullPath);
      } else if (entry.isFile()) {
        try {
          const content = await webcontainerInstance!.fs.readFile(fullPath, 'utf-8');
          fsFlat[fullPath] = content;
        } catch (e) {
          // It's probably a binary file, map it so it visually shows in UI
          fsFlat[fullPath] = 'BINARIO:';
        }
      }
    }
  }
  
  await readDir('/');
  return fsFlat;
}

export function getFileSystem() {
  // Returns our local state representation
  return defaultFiles;
}

export async function updateFile(path: string, content: string) {
  if (!webcontainerInstance) return;
  
  // Remove leading slash if exists
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  await webcontainerInstance.fs.writeFile(normalizedPath, content);
}
