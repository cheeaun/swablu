import {
  createStore,
  get,
  getMany,
  set,
  setMany,
  del,
  delMany,
  update,
  clear,
  entries,
} from 'idb-keyval';

const draftsStore = createStore('drafts-db', 'drafts-store');

const drafts = {
  get: (key) => get(key, draftsStore),
  getMany: (keys) => getMany(keys, draftsStore),
  set: (key, value) => set(key, value, draftsStore),
  setMany: (entries) => setMany(entries, draftsStore),
  update: (key, value) => update(key, value, draftsStore),
  del: (key) => del(key, draftsStore),
  delMany: (keys) => delMany(keys, draftsStore),
  clear: () => clear(draftsStore),
  entries: () => entries(draftsStore),
};

export default drafts;
