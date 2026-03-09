import SnakeGame from '@/components/SnakeGame';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <SnakeGame />
    </main>
  );
}
