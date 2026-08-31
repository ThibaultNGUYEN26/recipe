import { ChefHat } from 'lucide-react';

export default function ChefBadge({ className = 'w-4 h-4', showLabel = false }: { className?: string; showLabel?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center ${showLabel ? 'gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900' : ''}`}
      aria-label="Verified professional chef"
      title="Professional chef credentials reviewed by Savor"
      role="img"
    >
      <ChefHat className={`${className} shrink-0 text-amber-700`} aria-hidden="true" />
      {showLabel && <span>Verified Chef</span>}
    </span>
  );
}
