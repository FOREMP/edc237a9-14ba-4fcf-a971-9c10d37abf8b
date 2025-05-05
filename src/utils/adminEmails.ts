
/**
 * Centralized list of admin emails for the application
 * Use this module to check admin access by email consistently
 */

// List of email addresses that should always have admin access
export const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

/**
 * Checks if a given email address has admin privileges
 * @param email Email address to check
 * @returns true if the email is in the admin list
 */
export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  // Make case-insensitive comparison to avoid issues with email capitalization
  return ADMIN_EMAILS.some(adminEmail => 
    adminEmail.toLowerCase() === email.toLowerCase()
  );
};
