import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase/client";

export type StoredUserProfile = {
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  provider: string;
  providerLabel: string;
  nickname: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type UpsertUserProfileInput = {
  uid: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
  provider?: string | null;
  providerLabel?: string | null;
  nickname?: string | null;
};

export async function getUserProfile(uid: string) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as StoredUserProfile;
}

export async function upsertUserProfile(input: UpsertUserProfileInput) {
  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new Error("실명을 입력해 주세요.");
  }

  const { db } = getFirebaseServices();
  await setDoc(
    doc(db, "users", input.uid),
    {
      fullName,
      email: input.email ?? null,
      phoneNumber: input.phoneNumber ?? null,
      provider: input.provider ?? "anonymous",
      providerLabel: input.providerLabel ?? "익명 세션",
      nickname: input.nickname ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
