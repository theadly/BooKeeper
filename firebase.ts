// Firebase integration has been removed for Local Mode.
// These stubs prevent runtime crashes if legacy code attempts to access auth/db.

export const auth = {
  currentUser: null,
  signOut: async () => {},
  onAuthStateChanged: (cb: any) => { cb(null); return () => {}; }
} as any;

export const db = {} as any;
export const googleProvider = {} as any;
export const serverTimestamp = () => new Date().toISOString();

export default {};