export function slugify(value: string) {
  const primaryTitle = value
    .replace(/\s*[([{].*$/u, '')
    .trim();

  return primaryTitle
    .replace(/[đĐ]/g, (character) => character === 'Đ' ? 'D' : 'd')
    .replace(/[łŁ]/g, (character) => character === 'Ł' ? 'L' : 'l')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
