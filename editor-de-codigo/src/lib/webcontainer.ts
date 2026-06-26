import { WebContainer, type FileSystemTree, type WebContainerProcess } from '@webcontainer/api';
import { defaultFiles } from './files';

let webcontainerInstance: WebContainer | null = null;
const shellProcess: WebContainerProcess | null = null;

// Convert our simplistic file structure to WebContainer FileSystemTree
const convertToWebContainerFs = (files: { [key: string]: string }): FileSystemTree => {
  const rootTree: FileSystemTree = {};
  
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
        
        const nextLevel = currentLevel[part];
        if ('directory' in nextLevel) {
          currentLevel = nextLevel.directory as FileSystemTree;
        }
      }
    }
  }
  
  return rootTree;
};

let bootPromise: Promise<WebContainer> | null = null;

/**
 * Obtiene el sistema de archivos REAL del WebContainer
 * Recursivamente lee todos los archivos y directorios
 */
export async function getRealFileSystem(): Promise<{ [key: string]: string }> {
  if (!webcontainerInstance) return {};
  
  const fsFlat: { [key: string]: string } = {};
  
  async function readDir(dir: string) {
    try {
      const entries = await webcontainerInstance!.fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
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
    } catch (error) {
      console.warn(`Error leyendo directorio ${dir}:`, error);
    }
  }
  
  await readDir('/');
  return fsFlat;
}

/**
 * Inicializa el WebContainer y monta los archivos iniciales
 * Después de montar, sincroniza el estado con el sistema de archivos real
 */
export async function bootWebContainer() {
  if (bootPromise) return bootPromise;
  
  bootPromise = (async () => {
    // Call only once
    const instance = await WebContainer.boot();
    webcontainerInstance = instance;
    
    // Mount initial files
    await instance.mount(convertToWebContainerFs(defaultFiles));
    
    // 🔥 IMPORTANTE: Leer el sistema de archivos real y actualizar defaultFiles
    // Esto asegura que el estado local esté sincronizado con el WebContainer
    try {
      const realFs = await getRealFileSystem();
      // Actualizar defaultFiles con el estado real
      Object.assign(defaultFiles, realFs);
      console.log('✅ Sistema de archivos sincronizado:', Object.keys(realFs).length, 'archivos');
    } catch (error) {
      console.error('❌ Error sincronizando sistema de archivos:', error);
    }
    
    return instance;
  })();
  
  return bootPromise;
}

/**
 * Obtiene la instancia del WebContainer
 */
export function getWebContainer() {
  return webcontainerInstance;
}

/**
 * Lee todos los archivos del WebContainer y los devuelve como un objeto plano
 * 🔥 MEJORADO: Con mejor manejo de errores
 */
export async function readWebContainerFiles(): Promise<{ [key: string]: string }> {
  if (!webcontainerInstance) return {};
  
  const fsFlat: { [key: string]: string } = {};
  
  async function readDir(dir: string) {
    try {
      const entries = await webcontainerInstance!.fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
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
    } catch (error) {
      console.warn(`Error leyendo directorio ${dir}:`, error);
    }
  }
  
  await readDir('/');
  return fsFlat;
}

/**
 * Obtiene el sistema de archivos local (estado en memoria)
 * Devuelve una copia del estado actual para evitar mutaciones accidentales
 */
export function getFileSystem() {
  // Returns a copy of our local state representation
  return { ...defaultFiles };
}

/**
 * Actualiza un archivo en el WebContainer
 * @param path - Ruta del archivo (ej: /src/App.vue)
 * @param content - Contenido del archivo
 */
export async function updateFile(path: string, content: string) {
  if (!webcontainerInstance) {
    console.warn('⚠️ WebContainer no inicializado');
    return;
  }
  
  // Remove leading slash if exists
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    await webcontainerInstance.fs.writeFile(normalizedPath, content);
    console.log(`✅ Archivo actualizado: ${path}`);
  } catch (error) {
    console.error(`❌ Error actualizando archivo ${path}:`, error);
    throw error;
  }
}

/**
 * Crea un nuevo archivo en el WebContainer
 * @param path - Ruta del archivo (ej: /src/nuevo.vue)
 * @param content - Contenido inicial (opcional)
 */
export async function createFile(path: string, content: string = '') {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    await webcontainerInstance.fs.writeFile(normalizedPath, content);
    console.log(`✅ Archivo creado: ${path}`);
    return path;
  } catch (error) {
    console.error(`❌ Error creando archivo ${path}:`, error);
    throw error;
  }
}

/**
 * Crea un nuevo directorio en el WebContainer
 * @param path - Ruta del directorio (ej: /src/components)
 */
export async function createDirectory(path: string) {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    await webcontainerInstance.fs.mkdir(normalizedPath, { recursive: true });
    console.log(`✅ Directorio creado: ${path}`);
    return path;
  } catch (error) {
    console.error(`❌ Error creando directorio ${path}:`, error);
    throw error;
  }
}

/**
 * Elimina un archivo o directorio del WebContainer
 * @param path - Ruta del archivo o directorio
 */
export async function deleteFile(path: string) {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    await webcontainerInstance.fs.rm(normalizedPath, { recursive: true, force: true });
    console.log(`✅ Eliminado: ${path}`);
    return path;
  } catch (error) {
    console.error(`❌ Error eliminando ${path}:`, error);
    throw error;
  }
}

/**
 * Renombra un archivo o directorio en el WebContainer
 * @param oldPath - Ruta actual
 * @param newPath - Nueva ruta
 */
export async function renameFile(oldPath: string, newPath: string) {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedOldPath = oldPath.startsWith('/') ? oldPath.substring(1) : oldPath;
  const normalizedNewPath = newPath.startsWith('/') ? newPath.substring(1) : newPath;
  
  try {
    await webcontainerInstance.fs.rename(normalizedOldPath, normalizedNewPath);
    console.log(`✅ Renombrado: ${oldPath} → ${newPath}`);
    return newPath;
  } catch (error) {
    console.error(`❌ Error renombrando ${oldPath} → ${newPath}:`, error);
    throw error;
  }
}

/**
 * 🔥 MEJORADO: Lee el contenido de un archivo del WebContainer
 * @param path - Ruta del archivo
 */
export async function readFileContent(path: string): Promise<string> {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    const content = await webcontainerInstance.fs.readFile(normalizedPath, 'utf-8');
    console.log(`✅ [readFileContent] Leído: ${path} (${content.length} caracteres)`);
    return content;
  } catch (error) {
    console.error(`❌ [readFileContent] Error leyendo archivo ${path}:`, error);
    throw error;
  }
}

/**
 * 🔥 SOLUCIONADO: Verifica si un archivo o directorio existe en el WebContainer
 * @param path - Ruta del archivo o carpeta
 */
export async function fileExists(path: string): Promise<boolean> {
  if (!webcontainerInstance) {
    console.warn('⚠️ [fileExists] WebContainer no inicializado');
    return false;
  }

  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

  try {
    // Si la ruta está vacía o es la raíz, asumimos que existe
    if (!normalizedPath) return true;

    // Buscamos el archivo inspeccionando el directorio padre
    const pathParts = normalizedPath.split('/');
    const targetName = pathParts.pop();
    const parentDir = pathParts.join('/');

    const entries = await webcontainerInstance.fs.readdir(parentDir || '.');
    const exists = entries.includes(targetName || '');

    if (exists) {
      console.log(`✅ [fileExists] El archivo/directorio existe: ${path}`);
      return true;
    }
    
    console.log(`❌ [fileExists] El archivo/directorio NO existe: ${path}`);
    return false;
  } catch (error) {
    // Si falla leer el directorio padre, es que la ruta completa o intermedia no existe
    console.log(`❌ [fileExists] El archivo/directorio NO existe: ${path}`);
    return false;
  }
}

/**
 * 🔥 SOLUCIONADO: Obtiene simulación de estadísticas de un archivo o directorio
 * @param path - Ruta del archivo o directorio
 */
export async function getFileStats(path: string) {
  if (!webcontainerInstance) {
    throw new Error('WebContainer no inicializado');
  }
  
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  try {
    // Como .stat() no existe, validamos su tipo listando el directorio contenedor
    const pathParts = normalizedPath.split('/');
    const targetName = pathParts.pop();
    const parentDir = pathParts.join('/');

    const entries = await webcontainerInstance.fs.readdir(parentDir || '.', { withFileTypes: true });
    const targetEntry = entries.find(e => e.name === targetName);

    if (!targetEntry) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    return {
      isDirectory: () => targetEntry.isDirectory(),
      isFile: () => targetEntry.isFile(),
      size: 0 // WebContainer no expone el tamaño directamente en readdir sin leer
    };
  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas de ${path}:`, error);
    throw error;
  }
}