/**
 * Utilities for generating URL-friendly slugs
 */

/**
 * Generates a URL-friendly slug from a given text
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlugFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if length was truncated
    .replace(/-+$/g, '');
}

/**
 * Generates a short random suffix for slug uniqueness
 * @param length - Length of the suffix
 * @returns A random alphanumeric string
 */
export function generateRandomSuffix(length?: number): string {
  const suffixLength = length || 4;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < suffixLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  
  return result;
} 