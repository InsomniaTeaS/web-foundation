export function createStorage(prefix = "site") {
  const key = (name) => `${prefix}:${name}`;

  return {
    read(name, fallback = null) {
      try {
        const raw = localStorage.getItem(key(name));
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    write(name, value) {
      try {
        localStorage.setItem(key(name), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(name) {
      try {
        localStorage.removeItem(key(name));
        return true;
      } catch {
        return false;
      }
    }
  };
}
