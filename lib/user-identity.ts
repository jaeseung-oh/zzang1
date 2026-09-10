export type UserIdentityLike = {
  [key: string]: unknown;
  certificateIdentity?: {
    realName?: string | null;
    dateOfBirth?: string | null;
    birthDate?: string | null;
  } | null;
  realName?: string | null;
  fullName?: string | null;
  userName?: string | null;
  name?: string | null;
  displayName?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  birthday?: string | null;
  birth?: string | null;
  buyerBirthDate?: string | null;
  certificateBirthDate?: string | null;
  userBirthDate?: string | null;
  date_of_birth?: string | null;
  birth_date?: string | null;
};

function normalizeIdentityBirthDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
  return value;
}

export function firstNonEmptyIdentityText(...values: unknown[]) {
  const stack = [...values];
  while (stack.length) {
    const value = stack.shift();
    if (Array.isArray(value)) {
      stack.unshift(...value);
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function getCustomDataBirthDate(user?: UserIdentityLike | null): string {
  const rawResponse = user?.rawResponse as { customData?: unknown } | undefined;
  const customData = rawResponse?.customData;
  if (!customData) return "";
  if (typeof customData === "string") {
    try {
      return getUserBirthDate(JSON.parse(customData) as UserIdentityLike);
    } catch {
      return "";
    }
  }
  return getUserBirthDate(customData as UserIdentityLike);
}

export function getUserBirthDate(user?: UserIdentityLike | null): string {
  const value = firstNonEmptyIdentityText(
    user?.certificateIdentity?.dateOfBirth,
    user?.certificateIdentity?.birthDate,
    user?.dateOfBirth,
    user?.birthDate,
    user?.birthday,
    user?.birth,
    user?.buyerBirthDate,
    user?.certificateBirthDate,
    user?.userBirthDate,
    user?.date_of_birth,
    user?.birth_date,
    getCustomDataBirthDate(user),
  );
  return value ? normalizeIdentityBirthDate(value) : "";
}

export function getUserDisplayName(user?: UserIdentityLike | null) {
  return firstNonEmptyIdentityText(
    user?.certificateIdentity?.realName,
    user?.realName,
    user?.fullName,
    user?.userName,
    user?.name,
    user?.displayName,
  );
}
