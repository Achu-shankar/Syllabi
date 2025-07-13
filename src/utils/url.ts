/**
 * Get the base URL for the application
 * In development: uses localhost
 * In production: uses environment variable or falls back to window.location.origin
 */
export function getBaseUrl(): string {
  // For server-side rendering, use environment variable
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  // For client-side, use environment variable if available, otherwise window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

/**
 * Get the production base URL for generated code
 * This ensures generated code always uses the production URL, 
 * even when users are in development mode
 */
export function getProductionBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get the current environment base URL
 * This respects the current environment (dev/prod)
 */
export function getCurrentBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  return window.location.origin;
} 