import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase/client";

export type CertificateIdentity = {
  realName?: string;
  dateOfBirth?: string;
  lockedAt?: unknown;
  lockSource?: string | null;
  purchaseId?: string | null;
};

export type StoredUserProfile = {
  fullName: string;
  realName?: string;
  dateOfBirth?: string;
  birthDate?: string;
  email: string | null;
  isEmailVerified?: boolean;
  emailVerifiedAt?: unknown;
  phoneNumber: string | null;
  provider: string;
  providerLabel: string;
  nickname: string | null;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  sensitiveInfoAccepted?: boolean;
  certificateIdentity?: CertificateIdentity;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type UpsertUserProfileInput = {
  uid: string;
  fullName: string;
  realName?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  isEmailVerified?: boolean;
  phoneNumber?: string | null;
  provider?: string | null;
  providerLabel?: string | null;
  nickname?: string | null;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  sensitiveInfoAccepted?: boolean;
};

export type EnsureCertificateIdentityLockInput = {
  uid: string;
  purchaseId?: string | null;
  lockSource?: "payment" | "completion" | "admin";
};

function assertValidDateOfBirth(value?: string | null) {
  if (!value) {
    throw new Error("생년월일을 입력해 주세요.");
  }

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    throw new Error("생년월일은 YYYY-MM-DD 형식이어야 합니다.");
  }

  const [, yearText, monthText, dayText] = matched;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(year, month - 1, day);

  const isSameCalendarDate =
    !Number.isNaN(candidate.getTime()) &&
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!isSameCalendarDate) {
    throw new Error("유효한 생년월일을 입력해 주세요.");
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (candidate > todayStart) {
    throw new Error("유효한 생년월일을 입력해 주세요.");
  }
}

export function getCertificateIdentity(profile: StoredUserProfile | null) {
  const lockedName = profile?.certificateIdentity?.realName?.trim();
  const lockedDateOfBirth = profile?.certificateIdentity?.dateOfBirth?.trim();

  if (lockedName && lockedDateOfBirth) {
    return {
      realName: lockedName,
      dateOfBirth: lockedDateOfBirth,
      lockedAt: profile?.certificateIdentity?.lockedAt,
      lockSource: profile?.certificateIdentity?.lockSource ?? null,
      purchaseId: profile?.certificateIdentity?.purchaseId ?? null,
      isLocked: true,
    } as const;
  }

  return {
    realName: profile?.realName?.trim() || profile?.fullName?.trim() || "",
    dateOfBirth: profile?.dateOfBirth?.trim() || profile?.birthDate?.trim() || "",
    lockedAt: null,
    lockSource: null,
    purchaseId: null,
    isLocked: false,
  } as const;
}

export async function getUserProfile(uid: string) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as StoredUserProfile;
}

export async function ensureCertificateIdentityLock(input: EnsureCertificateIdentityLockInput) {
  const { db } = getFirebaseServices();
  const userRef = doc(db, "users", input.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("회원 정보를 먼저 저장해 주세요.");
  }

  const profile = snapshot.data() as StoredUserProfile;
  const currentIdentity = getCertificateIdentity(profile);

  if (currentIdentity.isLocked) {
    return currentIdentity;
  }

  const realName = currentIdentity.realName.trim();
  const dateOfBirth = currentIdentity.dateOfBirth.trim();

  if (!realName) {
    throw new Error("수료증 발급 기준 잠금을 위해 실명을 먼저 저장해 주세요.");
  }

  assertValidDateOfBirth(dateOfBirth);

  await setDoc(
    userRef,
    {
      certificateIdentity: {
        realName,
        dateOfBirth,
        lockedAt: serverTimestamp(),
        lockSource: input.lockSource ?? "payment",
        purchaseId: input.purchaseId ?? null,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    realName,
    dateOfBirth,
    lockedAt: new Date().toISOString(),
    lockSource: input.lockSource ?? "payment",
    purchaseId: input.purchaseId ?? null,
    isLocked: true,
  } as const;
}

export async function upsertUserProfile(input: UpsertUserProfileInput) {
  const realName = (input.realName ?? input.fullName).trim();
  if (!realName) {
    throw new Error("실명을 입력해 주세요.");
  }

  assertValidDateOfBirth(input.dateOfBirth ?? null);

  const { db } = getFirebaseServices();
  await setDoc(
    doc(db, "users", input.uid),
    {
      fullName: realName,
      realName,
      dateOfBirth: input.dateOfBirth,
      birthDate: input.dateOfBirth,
      email: input.email ?? null,
      isEmailVerified: input.isEmailVerified ?? false,
      emailVerifiedAt: input.isEmailVerified ? serverTimestamp() : null,
      phoneNumber: input.phoneNumber ?? null,
      provider: input.provider ?? "password",
      providerLabel: input.providerLabel ?? "이메일 회원",
      nickname: input.nickname ?? null,
      termsAccepted: input.termsAccepted ?? false,
      privacyAccepted: input.privacyAccepted ?? false,
      sensitiveInfoAccepted: input.sensitiveInfoAccepted ?? false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
