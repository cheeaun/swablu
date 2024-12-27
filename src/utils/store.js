const NAMESPACE = 'SWABLU';

function storageFactory(storage) {
  if (!storage) {
    throw new Error('Storage not available');
  }
  const _store = {
    get: (key) => {
      try {
        return storage.getItem(`${NAMESPACE}:${key}`);
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    getJSON: (key) => {
      const value = _store.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    set: (key, value) => {
      try {
        storage.setItem(`${NAMESPACE}:${key}`, value);
      } catch (e) {
        console.error(e);
      }
    },
    setJSON: (key, value) => {
      try {
        _store.set(key, JSON.stringify(value));
      } catch (e) {
        console.error(e);
      }
    },
    del: (key) => {
      try {
        storage.removeItem(`${NAMESPACE}:${key}`);
      } catch (e) {
        console.error(e);
      }
    },
    clear: () => {
      try {
        storage.clear();
      } catch (e) {
        console.error(e);
      }
    },
  };
  return _store;
}

const store = {
  local: storageFactory(localStorage),
  session: storageFactory(sessionStorage),
};

export default store;
