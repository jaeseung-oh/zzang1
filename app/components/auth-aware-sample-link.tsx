"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";

type AuthAwareSampleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  signupHref?: string;
};

export default function AuthAwareSampleLink({ href, signupHref, ...props }: AuthAwareSampleLinkProps) {
  const guestHref = useMemo(() => signupHref ?? `/signup?next=${encodeURIComponent(href)}`, [href, signupHref]);
  const [targetHref, setTargetHref] = useState(guestHref);

  useEffect(() => {
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, (user) => {
      setTargetHref(user && !user.isAnonymous ? href : guestHref);
    });
  }, [guestHref, href]);

  return <Link href={targetHref} {...props} />;
}
