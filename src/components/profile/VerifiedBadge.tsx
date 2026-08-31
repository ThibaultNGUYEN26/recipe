import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ className = 'w-4 h-4', showLabel = false }: { className?: string; showLabel?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center ${showLabel ? 'gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700' : ''}`}
      aria-label="Verified user"
      title="Identity and account ownership reviewed by Savor"
      role="img"
    >
      <BadgeCheck className={`${className} shrink-0 fill-blue-50 text-blue-500`} aria-hidden="true" />
      {showLabel && <span>Verified User</span>}
    </span>
  );
}
