/**
 * URL utility functions
 */

/**
 * Check if a string is a valid URL
 * @param url URL to validate
 * @returns True if URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    // Create URL object to validate URL
    const urlObj = new URL(url);
    
    // Check if URL has http or https protocol
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL is allowed for redirection
 * This helps prevent open redirect vulnerabilities
 * @param url URL to validate
 * @param allowedDomains Array of allowed domains (optional)
 * @returns True if URL is allowed, false otherwise
 */
export function isAllowedRedirectUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    // First check if it's a valid URL
    if (!isValidUrl(url)) {
      return false;
    }
    
    // If no allowed domains are specified, use a default safe approach
    if (!allowedDomains || allowedDomains.length === 0) {
      // Only allow localhost and 127.0.0.1 as default safe domains
      const urlObj = new URL(url);
      return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
    }
    
    // Parse URL
    const urlObj = new URL(url);
    
    // Check if domain is in allowed domains
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || 
      urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Append a parameter to a URL
 * @param url Base URL
 * @param paramName Parameter name
 * @param paramValue Parameter value
 * @returns URL with appended parameter
 */
export function appendUrlParameter(url: string, paramName: string, paramValue: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.append(paramName, paramValue);
    return urlObj.toString();
  } catch (error) {
    // If URL is invalid, try a simple string approach
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${paramName}=${encodeURIComponent(paramValue)}`;
  }
}