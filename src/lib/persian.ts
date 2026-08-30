import jalaali from "jalaali-js";

// Persian Digits mapping
const LATIN_TO_PERSIAN_MAP: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
};

const PERSIAN_TO_LATIN_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/**
 * Converts English/Latin digits to Persian digits
 */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, (char) => LATIN_TO_PERSIAN_MAP[char] || char);
}

/**
 * Converts Persian/Arabic digits to Latin digits
 */
export function toLatinDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[۰-۹٠-٩]/g, (char) => PERSIAN_TO_LATIN_MAP[char] || char);
}

/**
 * Formats a number as Persian currency (تومان) with 3-digit comma separation and Persian digits
 */
export function formatToman(amount: number | null | undefined, includeUnit: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeUnit ? "۰ تومان" : "۰";
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "،");
  const persianFormatted = toPersianDigits(formatted);
  return includeUnit ? `${persianFormatted} تومان` : persianFormatted;
}

/**
 * Formats carpet dimensions in standard Persian format (e.g. ۳×۴ متر [۱۲ متری])
 */
export function formatCarpetSize(sizeCode: string): string {
  const sizeMap: Record<string, string> = {
    "2x3": "۲×۳ متر (۶ متری)",
    "2.5x3.5": "۲.۵×۳.۵ متر (۹ متری)",
    "3x4": "۳×۴ متر (۱۲ متری)",
    "1.5x2.25": "۱.۵×۲.۲۵ متر (۴ متری)",
    "1x1.5": "۱×۱.۵ متر (قالیچه)",
    "1x2": "۱×۲ متر (کناره)",
    "1x3": "۱×۳ متر (کناره بلند)",
    "1x4": "۱×۴ متر (راهرویی)",
    "padri": "۰.۵×۰.۸ متر (پادری)",
    "circle-1.5": "قطر ۱.۵ متر (گرد)",
    "circle-2": "قطر ۲ متر (گرد)",
  };
  return sizeMap[sizeCode] || toPersianDigits(sizeCode);
}

/**
 * Converts a Gregorian Date to formatted Jalali Date string (۱۴۰۳/۱۲/۰۵)
 */
export function formatJalaliDate(
  date: Date | string | null | undefined,
  includeTime: boolean = false
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const year = toPersianDigits(j.jy);
  const month = toPersianDigits(String(j.jm).padStart(2, "0"));
  const day = toPersianDigits(String(j.jd).padStart(2, "0"));

  const dateStr = `${year}/${month}/${day}`;
  if (!includeTime) return dateStr;

  const hours = toPersianDigits(String(d.getHours()).padStart(2, "0"));
  const minutes = toPersianDigits(String(d.getMinutes()).padStart(2, "0"));
  return `${dateStr} - ${hours}:${minutes}`;
}

/**
 * Returns human-readable Persian relative time (لحظاتی پیش، ۲ ساعت پیش، ۳ روز پیش)
 */
export function formatPersianRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "هم‌اکنون";
  if (diffMinutes < 60) return `${toPersianDigits(diffMinutes)} دقیقه پیش`;
  if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
  if (diffDays < 7) return `${toPersianDigits(diffDays)} روز پیش`;
  return formatJalaliDate(d);
}

/**
 * Normalizes Iranian Mobile Numbers to 09xxxxxxxxx format
 */
export function normalizeIranianPhone(rawPhone: string): string {
  const latin = toLatinDigits(rawPhone).replace(/[^0-9+]/g, "");
  if (latin.startsWith("+98")) {
    return "0" + latin.slice(3);
  }
  if (latin.startsWith("98")) {
    return "0" + latin.slice(2);
  }
  if (latin.startsWith("9") && latin.length === 10) {
    return "0" + latin;
  }
  return latin;
}

/**
 * Validates Iranian 11-digit mobile format
 */
export function isValidIranianMobile(phone: string): boolean {
  const normalized = normalizeIranianPhone(phone);
  return /^09[0-9]{9}$/.test(normalized);
}

/**
 * Format phone for display (۰۹۱۲ ۳۴۵ ۶۷۸۹)
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "-";
  const normalized = normalizeIranianPhone(phone);
  if (normalized.length === 11) {
    const formatted = `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
    return toPersianDigits(formatted);
  }
  return toPersianDigits(phone);
}

/**
 * List of Major Iranian Provinces & Carpet Hubs
 */
export const IRANIAN_PROVINCES = [
  { name: "تهران", cities: ["تهران", "شهریار", "اسلامشهر", "ری", "دماوند", "پردیس", "ورامین"] },
  { name: "اصفهان", cities: ["اصفهان", "کاشان", "نجف‌آباد", "شاهین‌شهر", "خمینی‌شهر", "شهرضا", "آران و بیدگل", "نائین"] },
  { name: "آذربایجان شرقی", cities: ["تبریز", "مراغه", "مرند", "میانه", "اهر", "بناب", "سراب"] },
  { name: "خراسان رضوی", cities: ["مشهد", "نیشابور", "سبزوار", "تربت حیدریه", "کاشمر", "قوچان", "گناباد"] },
  { name: "فارس", cities: ["شیراز", "مرودشت", "کازرون", "جهرم", "فسا", "لار", "آباده"] },
  { name: "یزد", cities: ["یزد", "میبد", "اردکان", "مهریز", "بافق", "ابرکوه"] },
  { name: "قم", cities: ["قم", "قنوات", "جعفریه", "کهک"] },
  { name: "مرکزی", cities: ["اراک", "ساوه", "خمین", "محلات", "دلیجان", "فراهان"] },
  { name: "همدان", cities: ["همدان", "ملایر", "نهاوند", "تویسرکان", "کبودرآهنگ"] },
  { name: "کرمان", cities: ["کرمان", "سیرجان", "رفسنجان", "جیرفت", "بم", "زرند"] },
  { name: "خوزستان", cities: ["اهواز", "دزفول", "آبادان", "ماهشهر", "خرمشهر", "بهبهان"] },
  { name: "گیلان", cities: ["رشت", "بندر انزلی", "لاهیجان", "لنگرود", "فومن", "تالش"] },
  { name: "مازندران", cities: ["ساری", "بابل", "آمل", "قائم‌شهر", "چالوس", "تنکابن", "بابلسر"] },
  { name: "البرز", cities: ["کرج", "فردیس", "کمال‌شهر", "نظرآباد", "هشتگرد"] },
  { name: "کرمانشاه", cities: ["کرمانشاه", "اسلام‌آباد غرب", "کنگاور", "سنقر", "هرسین"] },
  { name: "قزوین", cities: ["قزوین", "الوند", "تاکستان", "بوئین‌زهرا", "محمدیه"] },
  { name: "سمنان", cities: ["سمنان", "شاهرود", "دامغان", "گرمسار", "مهدی‌شهر"] },
  { name: "زنجان", cities: ["زنجان", "ابهر", "خرمدره", "قیدار"] },
  { name: "کردستان", cities: ["سنندج", "سقز", "مریوان", "بانه", "قروه", "بیجار"] },
  { name: "چهارمحال و بختیاری", cities: ["شهرکرد", "بروجن", "فارسان", "لردگان"] },
  { name: "لرستان", cities: ["خرم‌آباد", "بروجرد", "دورود", "کوهدشت", "الیگودرز"] },
  { name: "بوشهر", cities: ["بوشهر", "برازجان", "کنگان", "گناوه", "عسلویه"] },
  { name: "هرمزگان", cities: ["بندرعباس", "میناب", "قشم", "کیش", "بندر لنگه"] },
  { name: "سیستان و بلوچستان", cities: ["زاهدان", "زابل", "ایرانشهر", "چابهار", "سراوان"] },
  { name: "اردبیل", cities: ["اردبیل", "پارس‌آباد", "مشگین‌شهر", "خلخال"] },
  { name: "گلستان", cities: ["گرگان", "گنبد کاووس", "علی‌آباد کتول", "بندر ترکمن"] },
  { name: "آذربایجان غربی", cities: ["ارومیه", "خوی", "بوکان", "مهاباد", "میاندوآب"] },
  { name: "خراسان جنوبی", cities: ["بیرجند", "قائن", "فردوس", "طبس", "نهبندان"] },
  { name: "خراسان شمالی", cities: ["بجنورد", "شیروان", "اسفراین", "آشخانه"] },
  { name: "ایلام", cities: ["ایلام", "دهلران", "ایوان", "آبدانان"] },
  { name: "کهگیلویه و بویراحمد", cities: ["یاسوج", "دوگنبدان (گچساران)", "دهدشت"] },
];
