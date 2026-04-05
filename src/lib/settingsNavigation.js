/**
 * Returns the correct settings path based on user email.
 * Admin user idoal9932@gmail.com should navigate to /admin/settings
 * All other users navigate to /settings
 */
export const getSettingsPath = (userEmail) => {
  return userEmail === "idoal9932@gmail.com" ? "/admin/settings" : "/settings";
};