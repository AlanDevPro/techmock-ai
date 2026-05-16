const cacheService = {
  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch {
      console.error(`[cacheService] Error al leer clave "${key}"`);
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error(`[cacheService] Error al guardar clave "${key}"`);
    }
  },

  remove(key: string): void {
    sessionStorage.removeItem(key);
  },
};

export default cacheService;