"use client";

import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { getFirebaseServices } from "@/lib/firebase/client";

function isRegisteredUser(user: User | null): user is User {
  return Boolean(user && !user.isAnonymous);
}

export async function ensureAnonymousSession(): Promise<User> {
  const { auth } = getFirebaseServices();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function waitForUser(): Promise<User> {
  const { auth } = getFirebaseServices();

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

export function waitForAuthState(): Promise<User | null> {
  const { auth } = getFirebaseServices();

  if (auth.currentUser !== null) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

export async function requireAuthenticatedUser(): Promise<User> {
  const { auth } = getFirebaseServices();
  const resolvedUser = auth.currentUser ?? (await waitForAuthState());
  const isAnonymousSession = Boolean(resolvedUser && resolvedUser.isAnonymous);

  if (isRegisteredUser(resolvedUser)) {
    return resolvedUser;
  }

  if (isAnonymousSession) {
    await signOut(auth);
  }

  throw new Error("AUTH_LOGIN_REQUIRED");
}
