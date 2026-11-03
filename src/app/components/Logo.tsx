import { TrendingUp } from 'lucide-react';

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--ns-cyan,#45c8a1)]/10 border border-[var(--ns-cyan,#45c8a1)]/25 shadow-sm">
        <TrendingUp
          className="size-5"
          style={{
            color: 'var(--ns-cyan, #45c8a1)',
          }}
        />
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <span style={{ color: 'var(--ns-cyan, #45c8a1)' }}>
          Fin
        </span>
        <span className="text-white font-medium">Max</span>
      </span>
    </div>
  );
}
