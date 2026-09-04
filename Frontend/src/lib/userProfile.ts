import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, type User } from './firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  provider: string;
  createdAt: unknown;
  lastLoginAt: unknown;
}

/**
 * Create or update user profile in Firestore after auth.
 * Called on every successful login/signup.
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!db) return;

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const profileData: Record<string, unknown> = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Operator',
    email: user.email || '',
    photoURL: user.photoURL,
    provider: user.providerData?.[0]?.providerId || 'unknown',
    lastLoginAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    // New user — store creation time
    profileData.createdAt = serverTimestamp();
  }

  await setDoc(ref, profileData, { merge: true });
}

/**
 * Get user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}
