'use client';

import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

export default function Home() {
  return (
    <main 
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="fixed inset-0 w-full h-full bg-slate-950 flex items-center justify-center"
    >
      <div 
        style={{ width: '100%', height: '100%', maxWidth: '448px', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        className="w-full h-full max-w-md bg-slate-900 shadow-2xl relative overflow-hidden"
      >
        <Game />
      </div>
    </main>
  );
}
