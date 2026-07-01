"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { basicApplicationProduct, formatApplicationKrw, getApplicationCategory, getApplicationProduct } from "@/lib/course/application-products";
import { getCertificateIdentity, getUserProfile } from "@/lib/firebase/user-profile";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { getVerifiedUserEnrollments, isEnrollmentActive, type EnrollmentRecord } from "@/lib/course/enrollment-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackBeginCheckout } from "@/lib/analytics/ga";

const appOrigin = paymentConfig.siteUrl;
const defaultCheckoutProduct = basicApplicationProduct;

const CARD_APPROVAL_DELAY_MESSAGE =
  "안녕하세요. 리셋에듀센터입니다.\n\n결제 과정에서 카드 승인 후 수강권 반영이 지연된 것으로 확인됩니다.\n중복 결제는 하지 말아주시고, 승인 문자 또는 결제 시각을 보내주시면 확인 후 수강권을 즉시 반영해드리겠습니다.\n\n이용에 불편을 드려 죄송합니다.";

type PortOnePaymentResponse = Awaited<ReturnType<typeof PortOne.requestPayment>>;
type CheckoutPaymentMethod = "card" | "kakaopay";

const paymentMethodOptions: Array<{ id: CheckoutPaymentMethod; label: string; description: string }> = [
  { id: "card", label: "신용카드 결제", description: "NHN KCP 카드 결제" },
  { id: "kakaopay", label: "카카오페이 결제", description: "카카오페이머니 또는 카드" },
];

const paymentMethodLabels: Record<CheckoutPaymentMethod, string> = {
  card: "신용카드",
  kakaopay: "카카오페이",
};

function paymentMethodButtonClass(isSelected: boolean, isUnavailable: boolean) {
  const stateClass = isSelected ? "border-[#10213f] bg-[#eef3f8] shadow-[0_10px_22px_rgba(16,33,63,0.10)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";
  const availabilityClass = isUnavailable ? "cursor-not-allowed opacity-50" : "";
  return `flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${stateClass} ${availabilityClass}`;
}

function paymentMethodIcon(method: CheckoutPaymentMethod) {
  if (method === "kakaopay") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEE500] text-[11px] font-black lowercase tracking-tight text-[#111111] shadow-sm">
        pay
      </span>
    );
  }

  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10213f] shadow-sm">
      <span className="h-7 w-9 rounded-md bg-white shadow-sm">
        <span className="mt-2 block h-1.5 w-full bg-[#d3b271]" />
        <span className="ml-1 mt-1 block h-1 w-4 rounded bg-slate-300" />
      </span>
    </span>
  );
}

function paymentMethodIndicatorClass(isSelected: boolean) {
  return `ml-auto h-4 w-4 shrink-0 rounded-full border ${isSelected ? "border-[#10213f] bg-[#10213f] shadow-[inset_0_0_0_3px_white]" : "border-slate-300 bg-white"}`;
}

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
  const [selectedCategoryId, setSelectedCategoryId] = useState("dui");
  const [selectedProductId, setSelectedProductId] = useState(defaultCheckoutProduct.id);
  const [customerUid, setCustomerUid] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBirthDate, setBuyerBirthDate] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<CheckoutPaymentMethod>("card");
  const [isMember, setIsMember] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNoticeChecked, setOrderNoticeChecked] = useState(false);
  const [refundNoticeChecked, setRefundNoticeChecked] = useState(false);
  const [activeEnrollment, setActiveEnrollment] = useState<EnrollmentRecord | null>(null);
  const [enrollmentCheckFailed, setEnrollmentCheckFailed] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = getApplicationCategory(selectedCategoryId) || getApplicationCategory("dui");
  const selectedProduct = getApplicationProduct(selectedCategoryId, selectedProductId) || defaultCheckoutProduct;
  const selectedCourseId = selectedProduct.courseId || duiPreventionCourseProduct.courseId;
  const selectedCourseTitle = selectedProduct.courseId ? selectedProduct.title : duiPreventionCourseProduct.courseTitle;
  const selectedTotalLessons = selectedProduct.courseId ? 5 : 3;
  const selectedResourceLabel = selectedProduct.id === "dui-cbt-advanced" ? "수료증 · 3종 서식 · CBT 이수증 · 상세 내역서" : selectedProduct.id === "dui-documents" ? "수료증 · 반성문 가이드/예시 · 3종 서식" : "수료증 · 반성문 가이드/예시";
  const selectedChannelKey = selectedPaymentMethod === "kakaopay" ? paymentConfig.kakaoPayChannelKey : paymentConfig.kcpChannelKey;
  const selectedPaymentProvider = selectedPaymentMethod === "kakaopay" ? "portone-kakaopay-v2" : "portone-kcp-v2";
  const hasPaymentConfig = Boolean(paymentConfig.storeId && selectedChannelKey);
  const hasActiveEnrollment = isEnrollmentActive(activeEnrollment);
  const canSubmit = hasPaymentConfig && isMember && profileReady && !hasActiveEnrollment && !enrollmentCheckFailed && orderNoticeChecked && refundNoticeChecked && !isInitializing && !isSubmitting;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const requestedCategoryId = params.get("categoryId") || params.get("category") || "dui";
    const requestedCategory = getApplicationCategory(requestedCategoryId) || getApplicationCategory("dui");
    const requestedProductId = params.get("productId") || requestedCategory?.defaultProductId || defaultCheckoutProduct.id;
    if (requestedCategory) setSelectedCategoryId(requestedCategory.id);
    if (requestedCategory && getApplicationProduct(requestedCategory.id, requestedProductId)) {
      setSelectedProductId(requestedProductId);
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
        try {
          const enrollments = await getVerifiedUserEnrollments(user, selectedCourseId);
          if (cancelled) return;
          setActiveEnrollment(enrollments.find((row) => row.courseId === selectedCourseId) ?? null);
          setEnrollmentCheckFailed(false);
        } catch (enrollmentError) {
          if (cancelled) return;
          console.error("Verified enrollment lookup failed before checkout", enrollmentError);
          setEnrollmentCheckFailed(true);
          setError("기존 결제 내역을 확인하지 못해 중복 결제 방지를 위해 결제를 중단했습니다. 잠시 후 다시 시도해 주세요.");
        }
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
  }, [router, selectedCourseId, selectedCategoryId]);

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
      let enrollment: EnrollmentRecord | null = null;
      try {
        const enrollments = await getVerifiedUserEnrollments(user, selectedCourseId);
        enrollment = enrollments.find((row) => row.courseId === selectedCourseId) ?? null;
        setEnrollmentCheckFailed(false);
      } catch (enrollmentError) {
        console.error("Verified enrollment lookup failed immediately before payment", enrollmentError);
        setEnrollmentCheckFailed(true);
        setError("기존 결제 내역을 확인하지 못해 중복 결제 방지를 위해 결제를 중단했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (isEnrollmentActive(enrollment)) {
        setActiveEnrollment(enrollment);
        setError("이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.");
        return;
      }
      setActiveEnrollment(enrollment);
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
      if (message === "PROFILE_REQUIRED") {
        setError("결제 전 회원정보에서 수료증에 출력될 실명과 생년월일을 정확히 저장해 주세요.");
      } else {
        console.error("Payment preflight failed", guardError);
        setError("결제 전 회원정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }

    if (hasActiveEnrollment) {
      setError("이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.");
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
      window.localStorage.setItem("resetedu:pending-portone-order", JSON.stringify({ paymentId: activePaymentId, categoryId: selectedCategoryId, productId: selectedProduct.id, courseId: selectedCourseId, amount: selectedProduct.price, certificateName: verifiedName, certificateBirthDate: verifiedBirthDate, savedAt: new Date().toISOString() }));
      try {
        const paymentUser = await requireAuthenticatedUser();
        if (paymentUser.uid !== verifiedUid) throw new Error("USER_MISMATCH");
        const idToken = await paymentUser.getIdToken();
        const orderCreateUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-order");
        const orderResponse = await fetch(orderCreateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
          body: JSON.stringify({ paymentId: activePaymentId, uid: verifiedUid, categoryId: selectedCategoryId, productId: selectedProduct.id, courseId: selectedCourseId, amount: selectedProduct.price, paymentMethod: selectedPaymentMethod, paymentProvider: selectedPaymentProvider }),
        });
        if (!orderResponse.ok) {
          const orderText = await orderResponse.text().catch(() => "");
          let orderPayload: unknown = {};
          try { orderPayload = orderText ? JSON.parse(orderText) : {}; } catch { orderPayload = { raw: orderText }; }
          console.error("PortOne pending order create failed", { url: orderCreateUrl, method: "POST", status: orderResponse.status, responseText: orderText, payload: orderPayload, paymentId: activePaymentId });
        }
      } catch (orderCreateError) {
        console.error("PortOne pending order create failed", orderCreateError);
      }

      paymentWindowRequested = true;
      trackBeginCheckout({
        value: selectedProduct.price,
        currency: "KRW",
        items: [{ item_id: selectedProduct.id, item_name: selectedCourseTitle, price: selectedProduct.price, quantity: 1 }],
      });
      console.info("PortOne requestPayment started", { paymentId: activePaymentId, amount: selectedProduct.price, paymentMethod: selectedPaymentMethod, provider: selectedPaymentProvider, confirmUrl: paymentConfig.confirmUrl, webhookUrl: paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-webhook") });
      const response: PortOnePaymentResponse = await PortOne.requestPayment({
        storeId: paymentConfig.storeId,
        channelKey: selectedChannelKey,
        paymentId: activePaymentId,
        orderName: selectedCourseTitle,
        totalAmount: selectedProduct.price,
        currency: "KRW",
        payMethod: selectedPaymentMethod === "kakaopay" ? "EASY_PAY" : "CARD",
        redirectUrl: `${appOrigin}/payment/success?courseId=${selectedCourseId}&productId=${selectedProduct.id}`,
        noticeUrls: [paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-webhook")],
        locale: "KO_KR",
        customer: {
          customerId: verifiedUid,
          fullName: verifiedName,
          email: buyerEmail.trim() || undefined,
          phoneNumber: buyerPhone.trim() || undefined,
        },
        ...(selectedPaymentMethod === "kakaopay"
          ? { windowType: { pc: "IFRAME", mobile: "REDIRECTION" } }
          : {
              bypass: {
                kcp_v2: {
                  site_name: "리셋 에듀센터",
                  kcp_pay_title: "리셋 에듀센터 수강권 결제",
                  shop_user_id: verifiedUid,
                },
              },
            }),
        customData: {
          uid: verifiedUid,
          courseId: selectedCourseId,
          purchaseType: "member",
          categoryId: selectedCategoryId,
          productId: selectedProduct.id,
          paymentMethod: selectedPaymentMethod,
          paymentProvider: selectedPaymentProvider,
          certificateName: verifiedName,
          certificateBirthDate: verifiedBirthDate,
        },
      });

      console.info("PortOne requestPayment returned", { requestedPaymentId: activePaymentId, returnedPaymentId: response?.paymentId, code: response?.code, message: response?.message });
      if (response?.paymentId && response.paymentId !== activePaymentId) console.error("PortOne paymentId mismatch", { requestedPaymentId: activePaymentId, returnedPaymentId: response.paymentId });

      if (response?.code !== undefined) {
        const failureMessage = response.message || "결제가 완료되지 않았습니다.";
        if (/fetch|network|timeout|통신|네트워크/i.test(failureMessage)) {
          window.location.href = `/payment/success?paymentId=${encodeURIComponent(activePaymentId)}&courseId=${encodeURIComponent(selectedCourseId)}&productId=${encodeURIComponent(selectedProduct.id)}&recovery=1`;
          return;
        }
        window.location.href = buildPaymentFailureUrl(selectedCourseId, response.code, failureMessage);
        return;
      }

      const confirmedPaymentId = response?.paymentId || activePaymentId;
      window.location.href = `/payment/success?paymentId=${encodeURIComponent(confirmedPaymentId)}&courseId=${encodeURIComponent(selectedCourseId)}&productId=${encodeURIComponent(selectedProduct.id)}`;
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : String(paymentError);
      console.error("PortOne requestPayment failed", { stage: paymentWindowRequested ? "requestPayment_or_redirect" : "before_requestPayment", paymentId: recoveryPaymentId, productId: recoveryProductId, message, error: paymentError });
      setError(`결제창 처리 실패: ${message}. paymentId=${recoveryPaymentId || "없음"}`);
      setIsSubmitting(false);
      if (paymentWindowRequested && recoveryPaymentId) {
        window.location.href = `/payment/success?paymentId=${encodeURIComponent(recoveryPaymentId)}&courseId=${encodeURIComponent(selectedCourseId)}&productId=${encodeURIComponent(recoveryProductId)}&recovery=1`;
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
          <Link href={selectedProduct.id === "dui-cbt-advanced" ? "/courses/apply?category=dui&productId=dui-cbt-advanced" : "/courses/dui-prevention"} className={buttonClass("secondary", "md", "rounded-full px-5 font-semibold")}>
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
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{selectedCourseTitle} 수강권</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{selectedProduct.courseId ? selectedProduct.description : duiPreventionCourseProduct.description}</p>
                <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{selectedProduct.title}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-slate-50 px-5 py-4 text-left sm:text-right">
                <p className="text-xs font-semibold text-slate-500">금액</p>
                <p className="mt-1 text-3xl font-bold text-[#10213f]">{formatKrw(selectedProduct.price)}</p>
              </div>
            </div>

            {selectedCategory ? (
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-500">수강권 선택</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {selectedCategory.products.map((product) => {
                    const isSelected = selectedProduct.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        disabled={isSubmitting}
                        className={`min-h-[220px] rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#10213f] focus:ring-offset-2 ${isSelected ? "border-[#10213f] bg-[#10213f] text-white shadow-[0_18px_42px_rgba(16,33,63,0.22)]" : "border-slate-200 bg-white text-slate-950 hover:border-[#10213f]/45 hover:bg-slate-50"}`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex min-h-12 items-start justify-between gap-3">
                          <h3 className={isSelected ? "text-base font-black leading-snug text-white" : "text-base font-black leading-snug text-slate-950"}>{product.title}</h3>
                          <span className={isSelected ? "rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#10213f]" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"}>{product.badge}</span>
                        </div>
                        <p className={isSelected ? "mt-3 text-2xl font-black text-white" : "mt-3 text-2xl font-black text-[#10213f]"}>{formatApplicationKrw(product.price)}</p>
                        <p className={isSelected ? "mt-3 text-sm leading-6 text-slate-100" : "mt-3 text-sm leading-6 text-slate-700"}>{product.description}</p>
                        <ul className="mt-4 space-y-2">
                          {product.includes.slice(0, product.id === "dui-cbt-advanced" ? 10 : 5).map((item) => (
                            <li key={item} className={isSelected ? "flex gap-2 text-xs font-semibold leading-5 text-slate-100" : "flex gap-2 text-xs font-semibold leading-5 text-slate-700"}>
                              <span className={isSelected ? "text-[#f4d58d]" : "text-[#10213f]"}>✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">교육 과정</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">{selectedProduct.courseId ? selectedProduct.title : defaultCourse.title}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">강의 수</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">총 {selectedTotalLessons}강</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">수강기간</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">결제일로부터 {duiPreventionCourseProduct.durationDays}일</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">제공자료</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">{selectedResourceLabel}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-2xl border border-[#d3b271]/45 bg-[#fffaf0] p-4 sm:p-5">
              <p className="text-sm font-bold text-[#10213f]">결제 회원 제공 자료</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {selectedProduct.id === "dui-cbt-advanced" ? "결제 완료 후 음주운전 예방교육 1~3강과 인지행동기반 재발방지 교육을 모두 수강하고 수료증, 3종 서식, CBT 이수증, 상세 내역서를 출력할 수 있습니다." : selectedProduct.id === "dui-documents" ? "결제 완료 후 반성문 작성 가이드와 음주운전 반성문 예시, 재발방지 관련 3종 서식을 열람하고 인쇄하거나 PDF로 저장할 수 있습니다." : "결제 완료 후 반성문 작성 가이드와 음주운전 반성문 예시를 열람하고 인쇄하거나 PDF로 저장할 수 있습니다."}
              </p>
            </div>
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
            {!isInitializing && !isMember ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-bold">로그인 후 결제할 수 있습니다.</p><Link href={`/login?next=${encodeURIComponent("/courses/apply/?category=dui")}`} className="mt-2 inline-flex font-bold text-[#10213f] underline underline-offset-4">로그인 또는 회원가입하기</Link></div> : null}
            {!isInitializing && isMember && !profileReady ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-bold">수료증에 출력될 실명과 생년월일이 필요합니다.</p><p>회원정보에서 실제 성명과 생년월일을 정확히 저장한 뒤 결제를 진행해 주세요.</p><Link href={`/login?next=${encodeURIComponent("/courses/apply/?category=dui")}`} className="mt-2 inline-flex font-bold text-[#10213f] underline underline-offset-4">회원정보 저장하기</Link></div> : null}
          </article>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-slate-950">선택한 과정의 제공내용을 다시 확인하세요</h2>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-500">결제수단</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {paymentMethodOptions.map((option) => {
                  const isSelected = selectedPaymentMethod === option.id;
                  const isUnavailable = option.id === "kakaopay" && !paymentConfig.kakaoPayChannelKey;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => { if (!isUnavailable) setSelectedPaymentMethod(option.id); }}
                      disabled={isUnavailable || isSubmitting}
                      className={paymentMethodButtonClass(isSelected, isUnavailable)}
                      aria-pressed={isSelected}
                    >
                      {paymentMethodIcon(option.id)}
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-extrabold text-slate-950">{option.label}</span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">{isUnavailable ? "채널키 설정 필요" : option.description}</span>
                      </span>
                      <span className={paymentMethodIndicatorClass(isSelected)} />
                    </button>
                  );
                })}
              </div>
            </div>

            <dl className="mt-5 space-y-4 border-b border-slate-200 pb-5">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">상품명</dt>
                <dd className="text-right text-sm font-bold text-slate-950">{selectedCourseTitle} 수강권</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">결제수단</dt>
                <dd className="text-sm font-bold text-slate-950">{paymentMethodLabels[selectedPaymentMethod]}</dd>
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
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs leading-6 text-amber-950">본 교육과 자료는 예방교육, 자기점검 및 재발방지 계획 수립을 지원하기 위한 콘텐츠입니다. 교육 수강이나 자료 제출만으로 개별 사건의 선처, 감형 또는 특정한 법률적 결과가 보장되지는 않습니다.</div>
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
            {enrollmentCheckFailed ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">기존 결제 내역 확인에 실패했습니다. 중복 결제 방지를 위해 결제를 진행하지 않습니다.</p> : null}
            {hasActiveEnrollment ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900"><p className="font-bold">이미 결제 완료된 수강권이 있습니다.</p><p>중복 결제를 막기 위해 결제 버튼을 비활성화했습니다.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/course-room" className={buttonClass("primary", "sm", "rounded-full px-4 font-bold")}>강의실로 이동</Link><Link href="/certificate" className={buttonClass("secondary", "sm", "rounded-full px-4 font-bold")}>수료증 출력</Link></div></div> : null}

            <button type="button" onClick={() => void handleRequestPayment()} disabled={!canSubmit} className={buttonClass("primary", "lg", "mt-5 w-full rounded-xl font-bold disabled:opacity-100")}>
              {hasActiveEnrollment ? "이미 결제된 강의입니다" : isSubmitting ? "결제 진행 중..." : `${paymentMethodLabels[selectedPaymentMethod]}로 결제하기`}
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
