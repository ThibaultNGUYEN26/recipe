import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <BadgeCheck
      className={`${className} shrink-0 text-blue-500 fill-blue-50`}
      aria-label="Verified creator"
      role="img"
    />
  );
}
