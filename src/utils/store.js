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

// Account-specific store, use localStorage, use key `${NAMESPACE}:${ACCOUNT_DID}:${key}`
const accountStore = {
  get: (category, key) => {
    const did = store.session.get('currentAccountDid');
    if (!did) return null;
    const KEY = `@${did}:${category}`;
    const categoryValue = store.local.getJSON(KEY);
    if (!categoryValue) return null;
    return categoryValue[key]?.value;
  },
  set: (category, key, value) => {
    const did = store.session.get('currentAccountDid');
    if (!did) return null;
    const KEY = `@${did}:${category}`;
    const categoryValue = store.local.getJSON(KEY) || {};
    categoryValue[key] = { value, lastUpdated: Date.now() };
    store.local.setJSON(KEY, categoryValue);
  },
  del: (category, key) => {
    const did = store.session.get('currentAccountDid');
    if (!did) return null;
    const KEY = `@${did}:${category}`;
    const categoryValue = store.local.getJSON(KEY);
    if (!categoryValue) return null;
    if (key) {
      delete categoryValue[key];
      store.local.setJSON(KEY, categoryValue);
    } else {
      store.local.del(KEY);
    }
  },
};

store.account = accountStore;

export default store;
