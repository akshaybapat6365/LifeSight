/**
 * Utility functions for URL handling
 */

/**
 * Gets the base URL from environment variables or defaults to localhost
 */
export function getBaseURL(): string {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fall back to localhost if not in production
  return 'http://localhost:3000';
}

/**
 * Converts a relative URL to an absolute URL
 */
export function toAbsoluteURL(relativeURL: string): string {
  // If the URL is already absolute, return it as is
  if (relativeURL.startsWith('http://') || relativeURL.startsWith('https://')) {
    return relativeURL;
  }
  
  // Make sure the relative URL starts with a slash
  const normalizedPath = relativeURL.startsWith('/') 
    ? relativeURL 
    : `/${relativeURL}`;
  
  // Combine with base URL, avoiding double slashes
  const baseURL = getBaseURL().endsWith('/') 
    ? getBaseURL().slice(0, -1) 
    : getBaseURL();
  
  return `${baseURL}${normalizedPath}`;
} 