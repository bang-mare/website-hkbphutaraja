import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({ prompt: 'select_account' });

// Cache token OAuth Google strictly in memory (never in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

type AuthListener = (state: { user: User | null; connected: boolean }) => void;
const listeners = new Set<AuthListener>();

function notifyListeners() {
  const snapshot = {
    user: cachedUser,
    connected: Boolean(cachedAccessToken && cachedUser),
  };
  listeners.forEach((cb) => cb(snapshot));
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedUser = null;
    cachedAccessToken = null;
    notifyListeners();
  } else if (!isSigningIn && !cachedAccessToken) {
    cachedUser = user;
    notifyListeners();
  }
});

export function subscribeGoogleDriveAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener({
    user: cachedUser,
    connected: Boolean(cachedAccessToken && cachedUser),
  });
  return () => {
    listeners.delete(listener);
  };
}

export async function connectGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function disconnectGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
  await auth.signOut();
  notifyListeners();
}

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function getGoogleDriveUser(): User | null {
  return cachedUser;
}
