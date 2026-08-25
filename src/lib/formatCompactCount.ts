export function formatCompactCount(value: number, language: string): string {
  const count = Math.max(0, Number.isFinite(value) ? value : 0);
  if (count < 1_000) return new Intl.NumberFormat(language).format(count);

  const [divisor, suffix]: [number, string] = count >= 1_000_000_000
    ? [1_000_000_000, language === 'fr' ? 'Md' : language === 'es' ? ' mil M' : 'B']
    : count >= 1_000_000
      ? [1_000_000, 'M']
      : [1_000, 'k'];

  const compact = new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(count / divisor);
  return `${compact}${suffix}`;
}
