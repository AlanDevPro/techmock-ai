"use client";

import dynamic from 'next/dynamic';

const IDE = dynamic(() => import('@/components/IDE'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--vscode-bg)] text-[var(--vscode-text)]">
      <IDE />
    </main>
  );
}
