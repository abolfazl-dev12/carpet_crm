import { formatCarpetSize, formatToman, toPersianDigits } from "./persian";

export interface CarpetRecommendationInput {
  preferredSizes?: string[];       // e.g. ["2x3", "3x4"]
  preferredShane?: string | null;  // e.g. "1200"
  preferredDensity?: string | null;// e.g. "3600"
  preferredColors?: string[];      // e.g. ["سرمه‌ای", "کرم"]
  preferredStyle?: string | null;  // e.g. "کلاسیک", "مدرن"
  preferredCollection?: string | null; // e.g. "اصفهان", "کاشان"
  budgetMax?: number | null;
  budgetMin?: number | null;
  paymentPreference?: "CASH" | "INSTALLMENT" | "HYBRID";
  previousPurchasedCollections?: string[]; // for repeat affinity bonus
}

export interface CarpetProductWithVariants {
  id: string;
  code: string;
  name: string;
  pattern: string;
  collection: string;
  shane: number;
  density: number;
  style: string;
  primaryColor: string;
  images: unknown;
  description?: string | null;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    areaSquareMeters: number;
    cashPrice: number;
    installmentPrice: number;
    stock: number;
    reservedStock: number;
    soldStock?: number;
  }>;
}

export interface CarpetRecommendationResult {
  product: CarpetProductWithVariants;
  matchedVariant: CarpetProductWithVariants["variants"][0];
  matchScore: number; // 0 - 100 strictly normalized
  matchReasons: string[];
  stockStatus: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
  availableStock: number;
  isPersonalized: boolean;
}

/**
 * Deterministic, Normalized Carpet Recommendation Matching Engine (Max 100 pts)
 * Weights:
 * - Size: 30 pts
 * - Shane: 15 pts
 * - Density: 10 pts
 * - Color: 20 pts
 * - Style: 10 pts
 * - Collection: 5 pts
 * - Budget: 10 pts
 * Total = 100 pts
 */
export function recommendCarpets(
  input: CarpetRecommendationInput,
  products: CarpetProductWithVariants[]
): CarpetRecommendationResult[] {
  const results: CarpetRecommendationResult[] = [];

  const hasPreferences = Boolean(
    (input.preferredSizes && input.preferredSizes.length > 0) ||
    input.preferredShane ||
    input.preferredDensity ||
    (input.preferredColors && input.preferredColors.length > 0) ||
    input.preferredStyle ||
    input.preferredCollection ||
    (input.budgetMax && input.budgetMax > 0)
  );

  for (const product of products) {
    for (const variant of product.variants) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Size matching (Weight: 30 pts)
      if (input.preferredSizes && input.preferredSizes.length > 0) {
        if (input.preferredSizes.includes(variant.size)) {
          score += 30;
          reasons.push(`تطابق دقیق ابعاد انتخابی (${formatCarpetSize(variant.size)})`);
        } else {
          score += 5; // partial
        }
      } else {
        score += 15; // neutral midpoint
      }

      // 2. Shane (Weight: 15 pts) & Density (Weight: 10 pts)
      if (input.preferredShane) {
        const shaneNum = parseInt(input.preferredShane, 10);
        if (product.shane === shaneNum) {
          score += 15;
          reasons.push(`شانه دقیق (${toPersianDigits(product.shane)} شانه)`);
        } else if (Math.abs(product.shane - shaneNum) <= 300) {
          score += 8;
        }
      } else {
        score += 8; // neutral
      }

      if (input.preferredDensity) {
        const densityNum = parseInt(input.preferredDensity, 10);
        if (product.density === densityNum) {
          score += 10;
          reasons.push(`تراکم بافت مطابق سلیقه (${toPersianDigits(product.density)})`);
        } else if (Math.abs(product.density - densityNum) <= 600) {
          score += 5;
        }
      } else {
        score += 5; // neutral
      }

      // 3. Color matching (Weight: 20 pts)
      if (input.preferredColors && input.preferredColors.length > 0) {
        const hasColor = input.preferredColors.some((c) =>
          product.primaryColor.includes(c) || c.includes(product.primaryColor)
        );
        if (hasColor) {
          score += 20;
          reasons.push(`همخوانی رنگ زمینه (${product.primaryColor}) با دکوراسیون مشتری`);
        }
      } else {
        score += 10; // neutral
      }

      // 4. Style (Weight: 10 pts) & Collection (Weight: 5 pts)
      if (input.preferredStyle && product.style === input.preferredStyle) {
        score += 10;
        reasons.push(`سبک بافت ${product.style}`);
      } else if (!input.preferredStyle) {
        score += 5;
      }

      if (
        input.preferredCollection &&
        (product.collection.includes(input.preferredCollection) ||
          input.preferredCollection.includes(product.collection))
      ) {
        score += 5;
        reasons.push(`کلکسیون اصیل ${product.collection}`);
      } else if (!input.preferredCollection) {
        score += 2;
      }

      // 5. Budget matching (Weight: 10 pts)
      const effectivePrice =
        input.paymentPreference === "INSTALLMENT"
          ? variant.installmentPrice
          : variant.cashPrice;

      if (input.budgetMax && input.budgetMax > 0) {
        if (effectivePrice <= input.budgetMax) {
          score += 10;
          reasons.push(`قیمت در محدوده بودجه مصوب (${formatToman(effectivePrice)})`);
        } else if (effectivePrice <= input.budgetMax * 1.15) {
          score += 5; // close to budget
          reasons.push(`اختلاف جزئی با بودجه (${formatToman(effectivePrice - input.budgetMax)} اضافه)`);
        }
      } else {
        score += 5; // neutral
      }

      // Stock availability evaluation
      const availableStock = Math.max(0, variant.stock - (variant.reservedStock || 0));
      let stockStatus: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" = "OUT_OF_STOCK";

      if (availableStock > 2) {
        stockStatus = "AVAILABLE";
        reasons.push(`موجودی آماده تحویل (${toPersianDigits(availableStock)} تخته)`);
      } else if (availableStock > 0) {
        stockStatus = "LOW_STOCK";
        reasons.push(`موجودی محدود انبار (${toPersianDigits(availableStock)} تخته)`);
      } else {
        stockStatus = "OUT_OF_STOCK";
        // Significant penalty so out-of-stock items never rank above in-stock alternatives
        score = Math.max(0, score - 25);
      }

      // Strict normalization 0 - 100
      const finalScore = Math.min(100, Math.max(0, Math.round(score)));

      if (finalScore >= 30) {
        results.push({
          product,
          matchedVariant: variant,
          matchScore: finalScore,
          matchReasons: reasons,
          stockStatus,
          availableStock,
          isPersonalized: hasPreferences,
        });
      }
    }
  }

  // Sort descending: by matchScore, then by availableStock
  return results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.availableStock - a.availableStock;
  });
}
