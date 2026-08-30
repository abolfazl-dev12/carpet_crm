import { formatCarpetSize, formatToman, toPersianDigits } from "./persian";

export interface CarpetRecommendationInput {
  preferredSizes: string[];       // e.g. ["2x3", "3x4"]
  preferredShane?: string | null;  // e.g. "1200"
  preferredDensity?: string | null;// e.g. "3600"
  preferredColors: string[];      // e.g. ["سرمه‌ای", "کرم"]
  preferredStyle?: string | null;  // e.g. "کلاسیک", "مدرن"
  preferredCollection?: string | null; // e.g. "اصفهان", "کاشان"
  budgetMax?: number | null;
  paymentPreference?: "CASH" | "INSTALLMENT" | "HYBRID";
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
  images: string; // JSON array
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    cashPrice: number;
    installmentPrice: number;
    stock: number;
    reservedStock: number;
  }>;
}

export interface CarpetRecommendationResult {
  product: CarpetProductWithVariants;
  matchedVariant: CarpetProductWithVariants["variants"][0];
  matchScore: number; // 0 - 100
  matchReasons: string[];
  stockStatus: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
}

/**
 * Deterministic Carpet Recommendation Matching Engine
 */
export function recommendCarpets(
  input: CarpetRecommendationInput,
  products: CarpetProductWithVariants[]
): CarpetRecommendationResult[] {
  const results: CarpetRecommendationResult[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Size matching (Weight: 30 pts)
      if (input.preferredSizes.length > 0) {
        if (input.preferredSizes.includes(variant.size)) {
          score += 30;
          reasons.push(`تطابق دقیق ابعاد انتخابی (${formatCarpetSize(variant.size)})`);
        } else {
          // Partial size penalty
          score += 5;
        }
      } else {
        score += 15; // neutral
      }

      // 2. Shane & Density matching (Weight: 25 pts)
      if (input.preferredShane) {
        const shaneNum = parseInt(input.preferredShane, 10);
        if (product.shane === shaneNum) {
          score += 15;
          reasons.push(`شانه دقیق (${toPersianDigits(product.shane)} شانه)`);
        } else if (Math.abs(product.shane - shaneNum) <= 300) {
          score += 8;
        }
      } else {
        score += 10;
      }

      if (input.preferredDensity) {
        const densityNum = parseInt(input.preferredDensity, 10);
        if (product.density === densityNum) {
          score += 10;
          reasons.push(`تراکم بافت مطابق نیاز (${toPersianDigits(product.density)})`);
        }
      }

      // 3. Color matching (Weight: 20 pts)
      if (input.preferredColors.length > 0) {
        const hasColor = input.preferredColors.some((c) =>
          product.primaryColor.includes(c) || c.includes(product.primaryColor)
        );
        if (hasColor) {
          score += 20;
          reasons.push(`همخوانی رنگ زمینه (${product.primaryColor}) با سلیقه مشتری`);
        }
      } else {
        score += 10;
      }

      // 4. Style & Collection (Weight: 15 pts)
      if (input.preferredStyle && product.style === input.preferredStyle) {
        score += 10;
        reasons.push(`سبک بافت ${product.style}`);
      }
      if (
        input.preferredCollection &&
        (product.collection.includes(input.preferredCollection) ||
          input.preferredCollection.includes(product.collection))
      ) {
        score += 5;
        reasons.push(`کلکسیون اصیل ${product.collection}`);
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
          score += 5; // Close to budget
          reasons.push(`اختلاف جزئی با بودجه (${formatToman(effectivePrice - input.budgetMax)} اضافه)`);
        }
      } else {
        score += 8;
      }

      // Stock availability evaluation
      const availableStock = variant.stock - variant.reservedStock;
      let stockStatus: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" = "OUT_OF_STOCK";
      if (availableStock > 2) {
        stockStatus = "AVAILABLE";
      } else if (availableStock > 0) {
        stockStatus = "LOW_STOCK";
        reasons.push("موجودی انبار محدود (نیاز به اقدام سریع)");
      } else {
        stockStatus = "OUT_OF_STOCK";
        // Deduct points if completely out of stock
        score = Math.max(0, score - 15);
      }

      // Cap score between 0 and 100
      const finalScore = Math.min(100, Math.max(0, score));

      if (finalScore >= 35) {
        results.push({
          product,
          matchedVariant: variant,
          matchScore: finalScore,
          matchReasons: reasons,
          stockStatus,
        });
      }
    }
  }

  // Sort descending by match score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
