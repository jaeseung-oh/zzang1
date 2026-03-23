"use client";

import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirebaseServices } from "@/lib/firebase/client";

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
