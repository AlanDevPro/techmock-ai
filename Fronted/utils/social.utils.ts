// 📁 app/utils/social.utils.ts

/**
 * Construye la URL completa de GitHub a partir del nombre de usuario
 */
export const getGithubUrl = (username: string): string | null => {
  if (!username) return null;
  return `https://github.com/${username.replace(/^@/, '')}`;
};

/**
 * Construye la URL completa de LinkedIn a partir del nombre de usuario
 */
export const getLinkedinUrl = (username: string): string | null => {
  if (!username) return null;
  return `https://linkedin.com/in/${username.replace(/^@/, '')}`;
};

/**
 * Construye la URL completa de Twitter a partir del nombre de usuario
 */
export const getTwitterUrl = (username: string): string | null => {
  if (!username) return null;
  const clean = username.replace(/^@/, '');
  return `https://twitter.com/${clean}`;
};