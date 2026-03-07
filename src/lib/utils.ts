import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts Western Arabic numerals (1, 2, 3...) to Eastern Arabic numerals (١, ٢, ٣...).
 */
export function toArabicNumerals(num: number | string): string {
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}
