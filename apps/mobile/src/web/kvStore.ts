/**
 * Web stand-in for 'expo-sqlite/kv-store' (wired in metro.config.js for web
 * only). The real one needs SQLite in the browser, which needs server headers
 * GitHub Pages can't send; localStorage is enough for these small values.
 */
const store = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const memory = new Map<string, string>();

const kv = {
  getItemSync(key: string): string | null {
    return store()?.getItem(key) ?? memory.get(key) ?? null;
  },
  setItemSync(key: string, value: string) {
    try {
      store()?.setItem(key, value);
    } catch {}
    memory.set(key, value);
  },
  removeItemSync(key: string) {
    try {
      store()?.removeItem(key);
    } catch {}
    memory.delete(key);
  },
  getItem: async (key: string) => kv.getItemSync(key),
  setItem: async (key: string, value: string) => kv.setItemSync(key, value),
  removeItem: async (key: string) => kv.removeItemSync(key),
};

export default kv;
export const Storage = kv;
