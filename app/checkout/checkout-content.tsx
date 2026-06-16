"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { basicApplicationProduct, getApplicationProduct } from "@/lib/course/application-products";
import { getCertificateIdentity, getUserProfile } from "@/lib/firebase/user-profile";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { buttonClass } from "@/app/components/ui/button-styles";

const appOrigin = paymentConfig.siteUrl;
const defaultCheckoutProduct = basicApplicationProduct;

const CARD_APPROVAL_DELAY_MESSAGE =
  "안녕하세요. 리셋에듀센터입니다.\n\n결제 과정에서 카드 승인 후 수강권 반영이 지연된 것으로 확인됩니다.\n중복 결제는 하지 말아주시고, 승인 문자 또는 결제 시각을 보내주시면 확인 후 수강권을 즉시 반영해드리겠습니다.\n\n이용에 불편을 드려 죄송합니다.";

type PortOnePaymentResponse = Awaited<ReturnType<typeof PortOne.requestPayment>>;

function createPaymentId(seed: string) {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0]?.toString(36) || "0";
  const safeSeed = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "member";
  return `pay${Date.now().toString(36)}${safeSeed}${randomValue}`.slice(0, 40);
}

function buildPaymentFailureUrl(courseId: string, code?: string, message?: string) {
  const params = new URLSearchParams({ courseId });
  if (code) params.set("code", code);
  if (message) params.set("message", message);
  return `/payment/fail?${params.toString()}`;
}

export default function CheckoutContent() {
  const router = useRouter();
  const [paymentId, setPaymentId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(defaultCheckoutProduct.id);
  const [customerUid, setCustomerUid] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBirthDate, setBuyerBirthDate] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNoticeChecked, setOrderNoticeChecked] = useState(false);
  const [refundNoticeChecked, setRefundNoticeChecked] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = getApplicationProduct("dui", selectedProductId) || defaultCheckoutProduct;
  const hasPaymentConfig = Boolean(paymentConfig.storeId && paymentConfig.kcpChannelKey);
  const canSubmit = hasPaymentConfig && isMember && profileReady && orderNoticeChecked && refundNoticeChecked && !isInitializing && !isSubmitting;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const requestedProductId = params.get("productId");
    if (getApplicationProduct("dui", requestedProductId)) {
      setSelectedProductId(requestedProductId || defaultCheckoutProduct.id);
    }

    const prepareOrder = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const profile = await getUserProfile(user.uid);
        if (cancelled) return;

        const identity = getCertificateIdentity(profile);
        const realName = identity.realName.trim();
        const birthDate = identity.dateOfBirth.trim();

        setIsMember(true);
        setCustomerUid(user.uid);
        setBuyerName(realName);
        setBuyerBirthDate(birthDate);
        setBuyerEmail(user.email || profile?.email || "");
        setBuyerPhone(profile?.phoneNumber || "");
        setPaymentId(createPaymentId(user.uid));
        setProfileReady(Boolean(realName && birthDate));
        if (!realName || !birthDate) {
          setError("결제 전 회원정보에서 수료증에 출력될 실명과 생년월일을 정확히 저장해 주세요.");
        }
      } catch (authError) {
        if (cancelled) return;
        const message = authError instanceof Error ? authError.message : "";
        if (message !== "AUTH_LOGIN_REQUIRED") console.error(authError);
        setIsMember(false);
        setProfileReady(false);
        setCustomerUid("");
        setPaymentId("");
        const next = window.location.pathname + window.location.search;
        setError("로그인 후 결제할 수 있습니다.");
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    void prepareOrder();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRequestPayment = async () => {
    let verifiedUid = customerUid;
    let verifiedName = buyerName.trim();
    let verifiedBirthDate = buyerBirthDate.trim();

    try {
      const user = await requireAuthenticatedUser();
      const profile = await getUserProfile(user.uid);
      const identity = getCertificateIdentity(profile);
      verifiedUid = user.uid;
      verifiedName = identity.realName.trim();
      verifiedBirthDate = identity.dateOfBirth.trim();
      if (!verifiedName || !verifiedBirthDate) {
        throw new Error("PROFILE_REQUIRED");
      }
      setCustomerUid(user.uid);
      setBuyerName(verifiedName);
      setBuyerBirthDate(verifiedBirthDate);
      setBuyerEmail(user.email || profile?.email || "");
      setBuyerPhone(profile?.phoneNumber || "");
      setIsMember(true);
      setProfileReady(true);
      if (!paymentId) setPaymentId(createPaymentId(user.uid));
    } catch (guardError) {
      const message = guardError instanceof Error ? guardError.message : "";
      if (message === "AUTH_LOGIN_REQUIRED") {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        setError("로그인 후 결제할 수 있습니다.");
        return;
      }
      setError("결제 전 회원정보에서 수료증에 출력될 실명과 생년월일을 정확히 저장해 주세요.");
      return;
    }

    if (!hasPaymentConfig) {
      setError("결제 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!orderNoticeChecked || !refundNoticeChecked) {
      setError("필수 확인 항목에 동의한 뒤 결제를 진행해 주세요.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    let recoveryPaymentId = paymentId;
    let recoveryProductId = selectedProduct.id;
    let paymentWindowRequested = false;

    try {
      const activePaymentId = paymentId || createPaymentId(verifiedUid);
      recoveryPaymentId = activePaymentId;
      recoveryProductId = selectedProduct.id;
      if (!paymentId) setPaymentId(activePaymentId);
      window.localStorage.setItem("resetedu:pending-portone-order", JSON.stringify({ paymentId: activePaymentId, categoryId: "dui", productId: selectedProduct.id, courseId: duiPreventionCourseProduct.courseId, amount: selectedProduct.price, certificateName: verifiedName, certificateBirthDate: verifiedBirthDate, savedAt: new Date().toISOString() }));
      try {
        const paymentUser = await requireAuthenticatedUser();
        if (paymentUser.uid !== verifiedUid) throw new Error("USER_MISMATCH");
        const idToken = await paymentUser.getIdToken();
        const orderCreateUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-order");
        const orderResponse = await fetch(orderCreateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
          body: JSON.stringify({ paymentId: activePaymentId, uid: verifiedUid, categoryId: "dui", productId: selectedProduct.id, courseId: duiPreventionCourseProduct.courseId, amount: selectedProduct.price }),
        });
        if (!orderResponse.ok) {
          const orderPayload = await orderResponse.json().catch(() => ({}));
          console.error("PortOne pending order create failed", orderPayload);
        }
      } catch (orderCreateError) {
        console.error("PortOne pending order create failed", orderCreateError);
      }

      paymentWindowRequested = true;
      const response: PortOnePaymentResponse = await PortOne.requestPayment({
        storeId: paymentConfig.storeId,
        channelKey: paymentConfig.kcpChannelKey,
        paymentId: activePaymentId,
        orderName: duiPreventionCourseProduct.courseTitle,
        totalAmount: selectedProduct.price,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl: `${appOrigin}/payment/success?courseId=${duiPreventionCourseProduct.courseId}&productId=${selectedProduct.id}`,
        noticeUrls: [paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-webhook")],
        locale: "KO_KR",
        customer: {
          fullName: verifiedName,
          email: buyerEmail.trim() || undefined,
          phoneNumber: buyerPhone.trim() || undefined,
        },
        bypass: {
          kcp_v2: {
            site_name: "리셋 에듀센터",
            kcp_pay_title: "리셋 에듀센터 수강권 결제",
            shop_user_id: verifiedUid,
          },
        },
        customData: {
          uid: verifiedUid,
          courseId: duiPreventionCourseProduct.courseId,
          purchaseType: "member",
          categoryId: "dui",
          productId: selectedProduct.id,
          paymentMethod: "card",
          certificateName: verifiedName,
          certificateBirthDate: verifiedBirthDate,
        },
      });

      if (response?.code !== undefined) {
        const failureMessage = response.message || "결제가 완료되지 않았습니다.";
        if (/fetch|network|timeout|통신|네트워크/i.test(failureMessage)) {
          window.location.href = `/payment/success?paymentId=${encodeURIComponent(activePaymentId)}&courseId=${encodeURIComponent(duiPreventionCourseProduct.courseId)}&productId=${encodeURIComponent(selectedProduct.id)}&recovery=1`;
          return;
        }
        window.location.href = buildPaymentFailureUrl(duiPreventionCourseProduct.courseId, response.code, failureMessage);
        return;
      }

      const confirmedPaymentId = response?.paymentId || activePaymentId;
      window.location.href = `/payment/success?paymentId=${encodeURIComponent(confirmedPaymentId)}&courseId=${encodeURIComponent(duiPreventionCourseProduct.courseId)}&productId=${encodeURIComponent(selectedProduct.id)}`;
    } catch (paymentError) {
      console.error(paymentError);
      setError(CARD_APPROVAL_DELAY_MESSAGE);
      setIsSubmitting(false);
      if (paymentWindowRequested && recoveryPaymentId) {
        window.location.href = `/payment/success?paymentId=${encodeURIComponent(recoveryPaymentId)}&courseId=${encodeURIComponent(duiPreventionCourseProduct.courseId)}&productId=${encodeURIComponent(recoveryProductId)}&recovery=1`;
      }
    }
  };

  return (
    <main className="keep-korean min-h-screen bg-[#f3f6f9] text-slate-950">
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">수강권 결제</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">결제 정보를 확인한 후 결제를 진행해 주세요.</p>
          </div>
          <Link href="/courses/dui-prevention" className={buttonClass("secondary", "md", "rounded-full px-5 font-semibold")}>
            상품 상세보기
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8">
        <section className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">주문 상품</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{duiPreventionCourseProduct.courseTitle} 수강권</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{duiPreventionCourseProduct.description}</p>
                <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{selectedProduct.title}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-slate-50 px-5 py-4 text-left sm:text-right">
                <p className="text-xs font-semibold text-slate-500">금액</p>
                <p className="mt-1 text-3xl font-bold text-[#10213f]">{formatKrw(selectedProduct.price)}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">교육 과정</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">{defaultCourse.title}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">강의 수</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">총 {duiPreventionCourseProduct.totalLessons}강</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">수강기간</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">결제일로부터 {duiPreventionCourseProduct.durationDays}일</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">제공자료</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">수강 즉시 수료증 출력</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">구매자 정보</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">결제자 정보</h2>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {isMember ? "회원 결제" : "로그인 필요"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-700">
                수료증 성명
                <input
                  value={buyerName}
                  readOnly
                  placeholder="회원정보에 저장된 실명"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                이메일
                <input
                  value={buyerEmail}
                  onChange={(event) => setBuyerEmail(event.target.value)}
                  placeholder="선택 입력"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#10213f] focus:ring-2 focus:ring-[#10213f]/10"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                생년월일
                <input
                  value={buyerBirthDate}
                  readOnly
                  placeholder="YYYY-MM-DD"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none"
                />
              </label>
            </div>
            {!isInitializing && !isMember ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-bold">로그인 후 결제할 수 있습니다.</p><Link href={`/login?next=${encodeURIComponent("/checkout")}`} className="mt-2 inline-flex font-bold text-[#10213f] underline underline-offset-4">로그인 또는 회원가입하기</Link></div> : null}
            {!isInitializing && isMember && !profileReady ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-bold">수료증에 출력될 실명과 생년월일이 필요합니다.</p><p>회원정보에서 실제 성명과 생년월일을 정확히 저장한 뒤 결제를 진행해 주세요.</p><Link href={`/login?next=${encodeURIComponent("/checkout")}`} className="mt-2 inline-flex font-bold text-[#10213f] underline underline-offset-4">회원정보 저장하기</Link></div> : null}
          </article>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-slate-950">결제 요약</h2>

            <dl className="mt-5 space-y-4 border-b border-slate-200 pb-5">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">상품명</dt>
                <dd className="text-right text-sm font-bold text-slate-950">{duiPreventionCourseProduct.courseTitle} 수강권</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">결제수단</dt>
                <dd className="text-sm font-bold text-slate-950">신용카드</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">수강기간</dt>
                <dd className="text-sm font-bold text-slate-950">결제일로부터 {duiPreventionCourseProduct.durationDays}일</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-end justify-between gap-4">
              <span className="text-base font-bold text-slate-700">결제금액</span>
              <strong className="text-3xl font-bold text-[#10213f]">{formatKrw(selectedProduct.price)}</strong>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                <input type="checkbox" checked={orderNoticeChecked} onChange={(event) => setOrderNoticeChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#10213f]" />
                <span>상품명, 결제금액, 수강기간을 확인했습니다.</span>
              </label>
              <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                <input type="checkbox" checked={refundNoticeChecked} onChange={(event) => setRefundNoticeChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#10213f]" />
                <span>
                  <Link href="/terms" className="font-semibold text-[#10213f] underline underline-offset-4">이용약관</Link>,{" "}
                  <Link href="/privacy-policy" className="font-semibold text-[#10213f] underline underline-offset-4">개인정보처리방침</Link>,{" "}
                  <Link href="/refund-policy" className="font-semibold text-[#10213f] underline underline-offset-4">환불규정</Link>에 동의합니다.
                </span>
              </label>
            </div>

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</p> : null}
            {isInitializing ? <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">주문서를 준비하는 중입니다...</p> : null}
            {!isInitializing && !isMember ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">로그인 및 회원가입 후 결제를 진행할 수 있습니다.</p> : null}
            {!isInitializing && isMember && !profileReady ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">수료증에 출력될 실명과 생년월일을 회원정보에 먼저 저장해 주세요.</p> : null}
            {!isInitializing && !hasPaymentConfig ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">결제 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.</p> : null}

            <button type="button" onClick={() => void handleRequestPayment()} disabled={!canSubmit} className={buttonClass("primary", "lg", "mt-5 w-full rounded-xl font-bold disabled:opacity-100")}>
              {isSubmitting ? "결제 진행 중..." : `${formatKrw(selectedProduct.price)} 결제하기`}
            </button>

            <div className="mt-4 space-y-1 text-center text-xs font-medium leading-5 text-slate-500">
              <p>결제 완료 후 즉시 수강을 시작할 수 있습니다.</p>
              <p>수강 즉시 수료증을 출력할 수 있습니다.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
