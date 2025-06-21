
// Centralized admin email configuration
export const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
