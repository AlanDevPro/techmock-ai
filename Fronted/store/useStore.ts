import { create } from "zustand";

// TIPOS
type FileNode = {
  id: string;
  name: string;
  type: "file";
  language: string;
  content: string;
};

type FolderNode = {
  id: string;
  name: string;
  type: "folder";
  collapsed: boolean;
  children: (FileNode | FolderNode)[];
};

type Tab = {
  fileId: string;
  name: string;
  language: string;
  content: string;
};

type Store = {
  tree: FolderNode[];
  openTabs: Tab[];
  activeTabId: string | null;

  output: string;
  isRunning: boolean;

  theme: "dark" | "light";

  setTheme: (theme: "dark" | "light") => void;
  setTree: (tree: FolderNode[]) => void;
  setOpenTabs: (tabs: Tab[]) => void;
  setActiveTabId: (id: string) => void;

  setOutput: (output: string) => void;
  setIsRunning: (val: boolean) => void;
};

// STORE
export const useStore = create<Store>((set) => ({
  tree: [
    {
      id: "root",
      name: "proyecto",
      type: "folder",
      collapsed: false,
      children: [
        {
          id: "html",
          name: "index.html",
          type: "file",
          language: "html",
          content: "<h1>Hola mundo</h1>",
        },
        {
          id: "js",
          name: "script.js",
          type: "file",
          language: "javascript",
          content: "console.log('Hola desde JS');",
        },
        {
          id: "py",
          name: "main.py",
          type: "file",
          language: "python",
          content: "print('Hola Python')",
        },
      ],
    },
  ],

  openTabs: [],
  activeTabId: null,

  output: "",
  isRunning: false,

  theme: "dark",

  setTheme: (theme) => set({ theme }),
  setTree: (tree) => set({ tree }),
  setOpenTabs: (tabs) => set({ openTabs: tabs }),
  setActiveTabId: (id) => set({ activeTabId: id }),

  setOutput: (output) => set({ output }),
  setIsRunning: (val) => set({ isRunning: val }),
}));