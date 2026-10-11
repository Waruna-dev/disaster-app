/**
 * In-memory stand-in for `firebase/firestore`. Refs and constraints are plain
 * descriptor objects so tests can assert on exactly what was queried/written,
 * and `onSnapshot` records each listener in `__listeners` so a test can push
 * snapshots into a hook or screen with `__emit`.
 */

class Timestamp {
  constructor(seconds, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static fromMillis(ms) {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  static fromDate(date) {
    return Timestamp.fromMillis(date.getTime());
  }
  static now() {
    return Timestamp.fromMillis(Date.now());
  }
  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  toDate() {
    return new Date(this.toMillis());
  }
}

const listeners = [];

function makeDocSnap(id, data) {
  return {
    id,
    exists: () => data !== undefined && data !== null,
    data: () => (data === null ? undefined : data),
  };
}

function makeQuerySnap(docs) {
  const snaps = docs.map((d) => makeDocSnap(d.id, d.data ?? omitId(d)));
  return { docs: snaps, size: snaps.length, empty: snaps.length === 0, forEach: (fn) => snaps.forEach(fn) };
}

function omitId(d) {
  const { id, ...rest } = d;
  return rest;
}

function pathOf(segments) {
  return segments.filter((s) => typeof s === 'string').join('/');
}

const defaults = {
  getFirestore: () => ({ __type: 'firestore' }),
  collection: (_db, ...segments) => ({ __type: 'collection', path: pathOf(segments) }),
  doc: (_db, ...segments) => {
    const path = pathOf(segments);
    return { __type: 'doc', path, id: path.split('/').pop() };
  },
  query: (ref, ...constraints) => ({ __type: 'query', ref, path: ref.path, constraints }),
  where: (field, op, value) => ({ type: 'where', field, op, value }),
  orderBy: (field, dir = 'asc') => ({ type: 'orderBy', field, dir }),
  limit: (n) => ({ type: 'limit', n }),
  documentId: () => '__name__',
  serverTimestamp: () => ({ __serverTimestamp: true }),
  deleteField: () => ({ __deleteField: true }),
  addDoc: async () => ({ id: 'new-doc-id' }),
  setDoc: async () => undefined,
  updateDoc: async () => undefined,
  deleteDoc: async () => undefined,
  getDoc: async (ref) => makeDocSnap(ref.id, undefined),
  getDocs: async () => makeQuerySnap([]),
  runTransaction: async () => undefined,
  onSnapshot: (target, next, error) => {
    const entry = { target, next, error, unsubscribe: jest.fn() };
    listeners.push(entry);
    return entry.unsubscribe;
  },
};

const fns = {};
for (const [name, impl] of Object.entries(defaults)) {
  fns[name] = jest.fn(impl);
}

function __reset() {
  listeners.length = 0;
  for (const [name, impl] of Object.entries(defaults)) {
    fns[name].mockReset();
    fns[name].mockImplementation(impl);
  }
}

/** Latest listener whose target path matches (or every listener when no path given). */
function __listenersFor(path) {
  return listeners.filter((l) => !path || l.target.path === path);
}

/** Push a snapshot into every active listener on `path`. Pass an array for a query, or {id,data} for a doc. */
function __emit(path, payload) {
  const targets = __listenersFor(path);
  if (targets.length === 0) throw new Error(`No onSnapshot listener registered for "${path}"`);
  for (const l of targets) {
    const snap = Array.isArray(payload) ? makeQuerySnap(payload) : makeDocSnap(payload.id, payload.data);
    l.next(snap);
  }
}

function __emitError(path, err) {
  for (const l of __listenersFor(path)) l.error && l.error(err);
}

module.exports = {
  ...fns,
  Timestamp,
  FieldValue: class FieldValue {},
  __listeners: listeners,
  __listenersFor,
  __emit,
  __emitError,
  __reset,
  __makeDocSnap: makeDocSnap,
  __makeQuerySnap: makeQuerySnap,
};
