export function slugify(value: string) {
  const arabicTransliteration: Record<string, string> = {
    ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
    د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
    ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
    ي: 'y', ى: 'a', ة: 'a', ء: '', ئ: 'y', ؤ: 'w',
  };
  const primaryTitle = value
    .replace(/\s*[([{].*$/u, '')
    .trim();

  return [...primaryTitle]
    .map((character) => arabicTransliteration[character] ?? character)
    .join('')
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
