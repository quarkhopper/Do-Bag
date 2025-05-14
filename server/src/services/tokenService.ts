// Simple token generator using Math.random (simplified for testing)
// In production, use a more secure method like crypto.randomBytes

// Generate a random token for email verification
export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

// Generate an expiration date (24 hours from now)
export function generateTokenExpiration(): Date {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 24);
  return expirationDate;
}

// Check if a token is expired
export function isTokenExpired(expirationDate: Date): boolean {
  if (!expirationDate) return true;
  return new Date() > expirationDate;
} 