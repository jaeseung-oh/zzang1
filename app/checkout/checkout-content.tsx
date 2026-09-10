"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { defaultCourse, getCourseDefinition, getCourseModules } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { applicationCourseCategories, counselingEvaluationNoticeText, counselingNoticeText, duiDocumentsApplicationProduct, formatApplicationKrw, getAdvancedProductForBasicCheckout, getApplicationCategory, getApplicationProduct, isCounselingProductId, type ApplicationProduct } from "@/lib/course/application-products";
import { getCertificateIdentity, getUserProfile } from "@/lib/firebase/user-profile";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { getVerifiedUserEnrollments, isEnrollmentActive, type EnrollmentRecord } from "@/lib/course/enrollment-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackBeginCheckout, trackEvent } from "@/lib/analytics/ga";
import { attributionParamKeys, attributionStorageKey, type AttributionParams } from "@/lib/marketing/attribution";
import { siteInfo } from "@/lib/site-info";

const appOrigin = paymentConfig.siteUrl;
const defaultCheckoutProduct = duiDocumentsApplicationProduct;
const paymentSupportMessage = `결제 실패 시 언제든 고객센터 ${siteInfo.supportPhone}로 연락주시면 즉시 조치해드리겠습니다.`;

const CARD_APPROVAL_DELAY_MESSAGE =
  `안녕하세요. 리셋 재범방지교육센터입니다.\n\n결제 과정에서 카드 승인 후 수강권 반영이 지연된 것으로 확인됩니다.\n중복 결제는 하지 말아주시고, 승인 문자 또는 결제 시각을 보내주시면 확인 후 수강권을 즉시 반영해드리겠습니다.\n\n문제가 계속되면 고객센터 ${siteInfo.supportPhone}로 연락주시면 즉시 조치해드리겠습니다.\n\n이용에 불편을 드려 죄송합니다.`;

type PortOnePaymentResponse = Awaited<ReturnType<typeof PortOne.requestPayment>>;
type CheckoutPaymentMethod = "card" | "transfer" | "virtualAccount" | "kakaopay";
type PortOnePayMethod = "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT" | "EASY_PAY";
type CheckoutPaymentTarget = { categoryId: string; product: ApplicationProduct };

const paymentMethodOptions: Array<{ id: CheckoutPaymentMethod; label: string; description: string }> = [
  { id: "card", label: "신용/체크카드", description: "카드로 바로 결제" },
  { id: "virtualAccount", label: "무통장 입금", description: "입금계좌를 발급받아 송금\n입금 확인 후 수강권이 활성화됩니다" },
  { id: "transfer", label: "실시간 계좌이체", description: "내 은행계좌에서 바로 결제" },
];

const paymentMethodLabels: Record<CheckoutPaymentMethod, string> = {
  card: "신용/체크카드",
  transfer: "실시간 계좌이체",
  virtualAccount: "무통장 입금",
  kakaopay: "카카오페이",
};

const portOnePayMethodByCheckoutMethod: Record<CheckoutPaymentMethod, PortOnePayMethod> = {
  card: "CARD",
  transfer: "TRANSFER",
  virtualAccount: "VIRTUAL_ACCOUNT",
  kakaopay: "EASY_PAY",
};

function paymentMethodButtonClass(isSelected: boolean, isUnavailable: boolean) {
  const stateClass = isSelected ? "border-[#10213f] bg-[#eef3f8] shadow-[0_10px_22px_rgba(16,33,63,0.10)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";
  const availabilityClass = isUnavailable ? "cursor-not-allowed opacity-50" : "";
  return `flex min-h-[5.25rem] items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition sm:min-h-[5.75rem] sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4 ${stateClass} ${availabilityClass}`;
}

function paymentMethodIcon(method: CheckoutPaymentMethod) {
  if (method === "kakaopay") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEE500] text-[11px] font-black lowercase tracking-tight text-[#111111] shadow-sm">
        pay
      </span>
    );
  }

  if (method === "transfer") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#173968] text-white shadow-sm">
        <span className="text-lg font-black">₩</span>
      </span>
    );
  }
  if (method === "virtualAccount") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d3b271] text-[#10213f] shadow-sm">
        <span className="text-xs font-black">계좌</span>
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

function getIncludeEmphasis(item: string, isAdvancedProduct: boolean, isCounselingProduct: boolean) {
  const isCounselingExtra = isCounselingProduct && (item.includes("심리상담") || item.includes("상담기관") || item.includes("종합 평가") || item.includes("유선 상담"));
  const isAdvancedExtra = isAdvancedProduct && !isCounselingExtra && (item.includes("심화이수과정 전체 포함") || item.includes("충실 준비과정 전체 포함") || item.includes("충실준비과정 전체 포함") || item.includes("인지행동") || item.includes("상세 내역서") || item.includes("소감문") || item.includes("CBT"));
  if (isCounselingExtra) return { label: "상담 추가", className: "font-black text-[#b91c1c]", badgeClassName: "bg-[#fff1f2] text-[#b91c1c] border-[#fecdd3]" };
  if (isAdvancedExtra) return { label: "심화이수 추가", className: "font-black text-[#173968]", badgeClassName: "bg-[#eef3f8] text-[#173968] border-[#b9c8dc]" };
  return { label: "기본 수료 포함", className: "font-semibold text-slate-700", badgeClassName: "bg-white text-slate-500 border-slate-200" };
}

function getCompactCheckoutIncludes(product: ApplicationProduct) {
  const isCounselingProduct = isCounselingProductId(product.id) || product.planId === "counseling";
  const isAdvancedProduct = isCounselingProduct || product.id === "dui-cbt-advanced" || product.id.endsWith("advanced") || product.id.endsWith("premium") || product.planId === "premium";

  if (isCounselingProduct) {
    return ["심화이수과정 전체 포함", "유선 상담 가능(방문 없이 진행)", "심리상담 의견서", "상담기관 탄원서"];
  }

  if (isAdvancedProduct) {
    return ["기본 수료과정 전체 포함", "인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서", "교육 소감문 작성자료"];
  }

  return product.includes.slice(0, 4);
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

const birthDateMissingDocumentNotice = "출력서류에 생년월일이 미표시되는 경우 마이페이지-회원정보 변경에서 생년월일을 입력하여 주시기 바랍니다.";

function normalizeCheckoutErrorMessage(message?: string) {
  const raw = String(message || "");
  if (raw.includes("certificateBirthDate is not defined")) return birthDateMissingDocumentNotice;
  return raw;
}

function getCheckoutPaymentFailureMessage(method: CheckoutPaymentMethod, message?: string) {
  const normalizedMessage = normalizeCheckoutErrorMessage(message);
  if (method === "transfer") return "현재 계좌이체 결제를 이용할 수 없습니다. 잠시 후 다시 이용하거나 다른 결제수단을 선택해 주세요.";
  if (method === "virtualAccount") return normalizedMessage || "무통장 입금 계좌 발급이 완료되지 않았습니다. 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.";
  return normalizedMessage || "결제가 완료되지 않았습니다.";
}

export default function CheckoutContent() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState("dui");
  const [selectedProductId, setSelectedProductId] = useState(defaultCheckoutProduct.id);
  const [customerUid, setCustomerUid] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBirthDate, setBuyerBirthDate] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<CheckoutPaymentMethod>("card");
  const [courseChangeOpen, setCourseChangeOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentSubmitLockRef = useRef(false);
  const [orderNoticeChecked, setOrderNoticeChecked] = useState(false);
  const [refundNoticeChecked, setRefundNoticeChecked] = useState(false);
  const [activeEnrollment, setActiveEnrollment] = useState<EnrollmentRecord | null>(null);
  const [enrollmentCheckFailed, setEnrollmentCheckFailed] = useState(false);
  const [basicUpsellModalOpen, setBasicUpsellModalOpen] = useState(false);
  const basicUpsellShownRef = useRef(false);
  const [error, setError] = useState("");

  const selectedCategory = getApplicationCategory(selectedCategoryId) || getApplicationCategory("dui");
  const selectedProduct = getApplicationProduct(selectedCategoryId, selectedProductId) || defaultCheckoutProduct;
  const selectedCourseId = selectedProduct.courseId || duiPreventionCourseProduct.courseId;
  const selectedEntitlementCourseId = selectedProduct.canonicalCourseId || selectedCourseId;
  const selectedCourseDefinition = getCourseDefinition(selectedEntitlementCourseId) || getCourseDefinition(selectedCourseId);
  const selectedCourseTitle = selectedProduct.canonicalCourseId ? selectedProduct.title : selectedCourseDefinition?.title || (selectedProduct.courseId ? selectedProduct.title : duiPreventionCourseProduct.courseTitle);
  const selectedIsCounseling = isCounselingProductId(selectedProduct.id) || selectedProduct.planId === "counseling";
  const selectedPaymentOrderName = selectedIsCounseling ? `${selectedCategory?.title || selectedCourseTitle} - ${selectedProduct.title}` : selectedProduct.id === "dui-cbt-advanced" ? "인지행동기반 재발방지교육 심화이수과정" : selectedCourseTitle;
  const selectedIsAdvanced = selectedIsCounseling || selectedProduct.id === "dui-cbt-advanced" || selectedProduct.id.endsWith("advanced") || selectedProduct.id.endsWith("premium") || selectedProduct.planId === "premium";
  const selectedTotalLessons = getCourseModules(selectedEntitlementCourseId).length || (selectedIsAdvanced ? 5 : 3);
  const selectedResourceLabel = selectedCourseDefinition?.outputs.join(" · ") || (selectedProduct.id === "dui-cbt-advanced" ? "수료증 · 재발방지계획서 · 음주예방실천계획서 · 음주운전 재발방지 서약서" : (selectedProduct.id === "dui-cbt-basic" || selectedProduct.id === "dui-documents") ? "수료증 · 재발방지계획서 · 음주예방실천계획서 · 음주운전 재발방지 서약서" : "수료증 · 기본 작성자료");
  const selectedChannelKey = selectedPaymentMethod === "kakaopay" ? paymentConfig.kakaoPayChannelKey : paymentConfig.kcpChannelKey;
  const selectedPaymentProvider = selectedPaymentMethod === "kakaopay" ? "portone-kakaopay-v2" : "portone-kcp-v2";
  const selectedPortOnePayMethod = portOnePayMethodByCheckoutMethod[selectedPaymentMethod];
  const hasPaymentConfig = Boolean(paymentConfig.storeId && selectedChannelKey);
  const hasActiveEnrollment = isEnrollmentActive(activeEnrollment);
  const selectedCategoryAvailable = selectedCategory?.status === "available";
  const checkoutDisplayTitle = selectedIsCounseling ? selectedPaymentOrderName : selectedCourseTitle;
  const checkoutButtonLabel = hasActiveEnrollment ? "이미 결제된 강의입니다" : isSubmitting ? "결제 진행 중..." : checkoutDisplayTitle + " " + formatKrw(selectedProduct.price) + " 결제하기";
  const canSubmit = hasPaymentConfig && selectedCategoryAvailable && isMember && !hasActiveEnrollment && orderNoticeChecked && refundNoticeChecked && !isInitializing && !isSubmitting;
  const advancedProductForBasicCheckout = getAdvancedProductForBasicCheckout(selectedCategoryId, selectedProduct.id);

  const getCheckoutPaymentTargetDetails = (target?: CheckoutPaymentTarget) => {
    const targetCategoryId = target?.categoryId || selectedCategoryId;
    const targetProduct = target?.product || selectedProduct;
    const targetCategory = getApplicationCategory(targetCategoryId) || selectedCategory;
    const targetCourseId = targetProduct.courseId || duiPreventionCourseProduct.courseId;
    const targetEntitlementCourseId = targetProduct.canonicalCourseId || targetCourseId;
    const targetCourseDefinition = getCourseDefinition(targetEntitlementCourseId) || getCourseDefinition(targetCourseId);
    const targetCourseTitle = targetProduct.canonicalCourseId ? targetProduct.title : targetCourseDefinition?.title || (targetProduct.courseId ? targetProduct.title : duiPreventionCourseProduct.courseTitle);
    const targetIsCounseling = isCounselingProductId(targetProduct.id) || targetProduct.planId === "counseling";
    const targetPaymentOrderName = targetIsCounseling ? `${targetCategory?.title || targetCourseTitle} - ${targetProduct.title}` : targetProduct.id === "dui-cbt-advanced" ? "인지행동기반 재발방지교육 심화이수과정" : targetCourseTitle;
    return {
      categoryId: targetCategoryId,
      product: targetProduct,
      courseId: targetCourseId,
      entitlementCourseId: targetEntitlementCourseId,
      courseTitle: targetCourseTitle,
      paymentOrderName: targetPaymentOrderName,
    };
  };

  const getStoredAttribution = () => {
    try { return JSON.parse(window.sessionStorage.getItem(attributionStorageKey) || "{}") as AttributionParams; } catch { return {}; }
  };

  const replaceCheckoutSelectionUrl = (categoryId: string, productId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("categoryId", categoryId);
    params.set("productId", productId);
    const stored = getStoredAttribution();
    attributionParamKeys.forEach((key) => { if (stored[key] && !params.has(key)) params.set(key, stored[key] as string); });
    window.history.replaceState(null, "", window.location.pathname + "?" + params.toString());
  };

  const handleCheckoutCategorySelect = (categoryId: string) => {
    const category = getApplicationCategory(categoryId);
    if (!category || category.status !== "available") return;
    const nextProductId = category.defaultProductId || category.products[0]?.id || defaultCheckoutProduct.id;
    setSelectedCategoryId(category.id);
    setSelectedProductId(nextProductId);
    setActiveEnrollment(null);
    setEnrollmentCheckFailed(false);
    setCourseChangeOpen(true);
    replaceCheckoutSelectionUrl(category.id, nextProductId);
  };

  const handleCheckoutProductSelect = (productId: string) => {
    const product = getApplicationProduct(selectedCategoryId, productId);
    if (!product) return;
    setSelectedProductId(productId);
    trackEvent("product_select", { category: selectedCategoryId, productId: product.id, productName: product.title, price: product.price });
    setActiveEnrollment(null);
    setEnrollmentCheckFailed(false);
    replaceCheckoutSelectionUrl(selectedCategoryId, productId);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategoryId = params.get("categoryId") || params.get("category") || "dui";
    const requestedProductParam = params.get("productId");
    const categoryByProduct = requestedProductParam ? applicationCourseCategories.find((category) => category.products.some((product) => product.id === requestedProductParam)) : null;
    const requestedCategory = categoryByProduct || getApplicationCategory(requestedCategoryId) || getApplicationCategory("dui");
    const requestedProductId = requestedProductParam || requestedCategory?.defaultProductId || defaultCheckoutProduct.id;
    if (requestedCategory) setSelectedCategoryId(requestedCategory.id);
    if (requestedCategory && getApplicationProduct(requestedCategory.id, requestedProductId)) {
      setSelectedProductId(requestedProductId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

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
          const enrollments = await getVerifiedUserEnrollments(user, selectedEntitlementCourseId, { lookup: "direct" });
          if (cancelled) return;
          setActiveEnrollment(enrollments.find((row) => row.courseId === selectedEntitlementCourseId) ?? null);
          setEnrollmentCheckFailed(false);
        } catch (enrollmentError) {
          if (cancelled) return;
          console.error("Verified enrollment lookup failed before checkout", enrollmentError);
          setActiveEnrollment(null);
          setEnrollmentCheckFailed(true);
        }
        setProfileReady(Boolean(realName && birthDate));
      } catch (authError) {
        if (cancelled) return;
        const message = authError instanceof Error ? authError.message : "";
        if (message !== "AUTH_LOGIN_REQUIRED") console.error(authError);
        setIsMember(false);
        setProfileReady(false);
        setCustomerUid("");
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
  }, [router, selectedCourseId, selectedEntitlementCourseId, selectedCategoryId]);

  const handleRequestPayment = async (target?: CheckoutPaymentTarget) => {
    if (paymentSubmitLockRef.current) return;
    paymentSubmitLockRef.current = true;
    setIsSubmitting(true);

    const releasePaymentSubmitLock = () => {
      paymentSubmitLockRef.current = false;
      setIsSubmitting(false);
    };

    const paymentTarget = getCheckoutPaymentTargetDetails(target);
    let verifiedUid = customerUid;
    let verifiedName = buyerName.trim();
    let verifiedBirthDate = buyerBirthDate.trim();

    try {
      const user = await requireAuthenticatedUser();
      const profile = await getUserProfile(user.uid);
      const identity = getCertificateIdentity(profile);
      verifiedUid = user.uid;
      verifiedName = identity.realName.trim() || user.displayName?.trim() || buyerName.trim();
      verifiedBirthDate = identity.dateOfBirth.trim() || buyerBirthDate.trim();
      let enrollment: EnrollmentRecord | null = null;
      try {
        const enrollments = await getVerifiedUserEnrollments(user, paymentTarget.entitlementCourseId, { lookup: "direct" });
        enrollment = enrollments.find((row) => row.courseId === paymentTarget.entitlementCourseId) ?? null;
        setEnrollmentCheckFailed(false);
      } catch (enrollmentError) {
        console.error("Verified enrollment lookup failed immediately before payment", enrollmentError);
        enrollment = null;
        setActiveEnrollment(null);
        setEnrollmentCheckFailed(true);
      }
      if (isEnrollmentActive(enrollment)) {
        setActiveEnrollment(enrollment);
        setError("이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.");
        releasePaymentSubmitLock();
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
    } catch (guardError) {
      const message = guardError instanceof Error ? guardError.message : "";
      if (message === "AUTH_LOGIN_REQUIRED") {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        setError("로그인 후 결제할 수 있습니다.");
        releasePaymentSubmitLock();
        return;
      }
      console.error("Payment preflight failed", guardError);
      setError("결제 전 회원정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      releasePaymentSubmitLock();
      return;
    }

    if (!target && hasActiveEnrollment) {
      setError("이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.");
      releasePaymentSubmitLock();
      return;
    }

    if (!hasPaymentConfig) {
      setError("결제 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.");
      releasePaymentSubmitLock();
      return;
    }

    if (!orderNoticeChecked || !refundNoticeChecked) {
      setError("필수 확인 항목에 동의한 뒤 결제를 진행해 주세요.");
      releasePaymentSubmitLock();
      return;
    }

    setError("");

    let recoveryPaymentId = "";
    let recoveryProductId = paymentTarget.product.id;
    let paymentWindowRequested = false;

    try {
      const activePaymentId = createPaymentId(verifiedUid);
      recoveryPaymentId = activePaymentId;
      recoveryProductId = paymentTarget.product.id;
      window.localStorage.setItem("resetedu:pending-portone-order", JSON.stringify({ paymentId: activePaymentId, categoryId: paymentTarget.categoryId, productId: paymentTarget.product.id, courseId: paymentTarget.courseId, amount: paymentTarget.product.price, paymentMethod: selectedPortOnePayMethod, certificateName: verifiedName, certificateBirthDate: verifiedBirthDate, phoneNumber: buyerPhone.trim() || null, buyerPhone: buyerPhone.trim() || null, savedAt: new Date().toISOString() }));
      try {
        const paymentUser = await requireAuthenticatedUser();
        if (paymentUser.uid !== verifiedUid) throw new Error("USER_MISMATCH");
        const idToken = await paymentUser.getIdToken();
        const orderCreateUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-order");
        const orderResponse = await fetch(orderCreateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
          body: JSON.stringify({ paymentId: activePaymentId, uid: verifiedUid, categoryId: paymentTarget.categoryId, productId: paymentTarget.product.id, courseId: paymentTarget.courseId, amount: paymentTarget.product.price, orderName: paymentTarget.paymentOrderName, paymentMethod: selectedPortOnePayMethod, frontendPaymentMethod: selectedPaymentMethod, paymentProvider: selectedPaymentProvider, certificateName: verifiedName, certificateBirthDate: verifiedBirthDate, birthDate: verifiedBirthDate, dateOfBirth: verifiedBirthDate, phoneNumber: buyerPhone.trim() || null, buyerPhone: buyerPhone.trim() || null, customerPhone: buyerPhone.trim() || null }),
        });
        if (!orderResponse.ok) {
          const orderText = await orderResponse.text().catch(() => "");
          let orderPayload: { code?: unknown; message?: unknown; raw?: string } = {};
          try { orderPayload = orderText ? JSON.parse(orderText) : {}; } catch { orderPayload = { raw: orderText }; }
          console.error("PortOne pending order create failed", { url: orderCreateUrl, method: "POST", status: orderResponse.status, responseText: orderText, payload: orderPayload, paymentId: activePaymentId });
          const orderMessage = typeof orderPayload.message === "string" && orderPayload.message.trim()
            ? orderPayload.message
            : "결제 전 주문 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
          setError(normalizeCheckoutErrorMessage(orderMessage));
          releasePaymentSubmitLock();
          return;
        }
      } catch (orderCreateError) {
        console.error("PortOne pending order create failed", orderCreateError);
        setError(normalizeCheckoutErrorMessage(orderCreateError instanceof Error ? orderCreateError.message : "결제 전 주문 확인에 실패했습니다. 잠시 후 다시 시도해 주세요."));
        releasePaymentSubmitLock();
        return;
      }

      paymentWindowRequested = true;
      const attribution = getStoredAttribution();
      trackEvent("checkout_start", { category: paymentTarget.categoryId, productId: paymentTarget.product.id, price: paymentTarget.product.price, ...attribution });
      trackBeginCheckout({
        value: paymentTarget.product.price,
        currency: "KRW",
        items: [{ item_id: paymentTarget.product.id, item_name: paymentTarget.courseTitle, price: paymentTarget.product.price, quantity: 1 }],
      });
      console.info("PortOne requestPayment started", { paymentId: activePaymentId, amount: paymentTarget.product.price, paymentMethod: selectedPortOnePayMethod, provider: selectedPaymentProvider, confirmUrl: paymentConfig.confirmUrl, webhookUrl: paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "/api/payments/portone-webhook") });
      const response: PortOnePaymentResponse = await PortOne.requestPayment({
        storeId: paymentConfig.storeId,
        channelKey: selectedChannelKey,
        paymentId: activePaymentId,
        orderName: paymentTarget.paymentOrderName,
        totalAmount: paymentTarget.product.price,
        currency: "KRW",
        payMethod: selectedPortOnePayMethod,
        ...(selectedPortOnePayMethod === "VIRTUAL_ACCOUNT"
          ? {
              virtualAccount: {
                accountExpiry: {
                  validHours: 72,
                },
              },
            }
          : {}),
        redirectUrl: `${appOrigin}/payment/success?courseId=${paymentTarget.courseId}&categoryId=${paymentTarget.categoryId}&productId=${paymentTarget.product.id}`,
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
                  site_name: "리셋 재범방지교육센터",
                  kcp_pay_title: "리셋 재범방지교육센터 재범방지교육 결제",
                  shop_user_id: verifiedUid,
                },
              },
            }),
        customData: {
          uid: verifiedUid,
          courseId: paymentTarget.courseId,
          purchaseType: "member",
          categoryId: paymentTarget.categoryId,
          productId: paymentTarget.product.id,
          orderName: paymentTarget.paymentOrderName,
          paymentMethod: selectedPaymentMethod,
          payMethod: selectedPortOnePayMethod,
          paymentProvider: selectedPaymentProvider,
          certificateName: verifiedName,
          certificateBirthDate: verifiedBirthDate,
          attribution: getStoredAttribution(),
        },
      });

      console.info("PortOne requestPayment returned", { requestedPaymentId: activePaymentId, returnedPaymentId: response?.paymentId, code: response?.code, message: response?.message });
      if (response?.paymentId && response.paymentId !== activePaymentId) console.error("PortOne paymentId mismatch", { requestedPaymentId: activePaymentId, returnedPaymentId: response.paymentId });

      if (response?.code !== undefined) {
        const failureMessage = getCheckoutPaymentFailureMessage(selectedPaymentMethod, response.message);
        window.location.href = buildPaymentFailureUrl(paymentTarget.courseId, response.code, failureMessage);
        return;
      }

      const confirmedPaymentId = response?.paymentId || activePaymentId;
      window.location.href = `/payment/success?paymentId=${encodeURIComponent(confirmedPaymentId)}&courseId=${encodeURIComponent(paymentTarget.courseId)}&categoryId=${encodeURIComponent(paymentTarget.categoryId)}&productId=${encodeURIComponent(paymentTarget.product.id)}`;
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : String(paymentError);
      console.error("PortOne requestPayment failed", { stage: paymentWindowRequested ? "requestPayment_or_redirect" : "before_requestPayment", paymentId: recoveryPaymentId, productId: recoveryProductId, message, error: paymentError });
      const methodFailureMessage = getCheckoutPaymentFailureMessage(selectedPaymentMethod, message);
      const failureMessage = selectedPaymentMethod === "transfer" ? methodFailureMessage : `결제창 처리 실패: ${methodFailureMessage}. ${paymentSupportMessage}`;
      setError(failureMessage);
      releasePaymentSubmitLock();
      if (paymentWindowRequested) {
        window.location.href = buildPaymentFailureUrl(paymentTarget.courseId, "PAYMENT_WINDOW_FAILED", failureMessage);
      }
    }
  };


  const handleCheckoutPaymentClick = () => {
    if (advancedProductForBasicCheckout && !basicUpsellShownRef.current) {
      setBasicUpsellModalOpen(true);
      return;
    }

    void handleRequestPayment();
  };

  const handleContinueBasicCheckout = () => {
    basicUpsellShownRef.current = true;
    setBasicUpsellModalOpen(false);
    void handleRequestPayment();
  };

  const handleSelectAdvancedCheckout = () => {
    const advancedProduct = getAdvancedProductForBasicCheckout(selectedCategoryId, selectedProduct.id);
    if (!advancedProduct) {
      basicUpsellShownRef.current = true;
      setBasicUpsellModalOpen(false);
      void handleRequestPayment();
      return;
    }

    basicUpsellShownRef.current = true;
    setBasicUpsellModalOpen(false);
    setSelectedProductId(advancedProduct.id);
    setActiveEnrollment(null);
    setEnrollmentCheckFailed(false);
    replaceCheckoutSelectionUrl(selectedCategoryId, advancedProduct.id);
    trackEvent("product_select", { category: selectedCategoryId, productId: advancedProduct.id, productName: advancedProduct.title, price: advancedProduct.price });
    void handleRequestPayment({ categoryId: selectedCategoryId, product: advancedProduct });
  };
  return (
    <main className="keep-korean min-h-screen bg-[#f3f6f9] pb-[calc(230px+env(safe-area-inset-bottom))] text-slate-950 sm:pb-[calc(190px+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[1.9rem] font-bold leading-tight text-slate-950 sm:text-4xl">수강권 결제</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">결제 정보를 확인한 후 결제를 진행해 주세요.</p>
          </div>
          <Link href={selectedCourseDefinition?.categoryId ? `/courses/apply?category=${selectedCourseDefinition.categoryId}&productId=${selectedProduct.id}` : selectedProduct.id === "dui-cbt-advanced" ? "/courses/apply?category=dui&productId=dui-cbt-advanced" : "/courses/dui-prevention"} className={buttonClass("secondary", "md", "w-full rounded-full px-5 font-semibold sm:w-auto")}>
            상품 상세보기
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5 sm:space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Step 1</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">교육 확인</h2>
                <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">선택한 교육과 금액만 간단히 확인합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setCourseChangeOpen((value) => !value)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-[#10213f] shadow-sm transition hover:border-[#10213f] hover:bg-slate-50"
                aria-expanded={courseChangeOpen}
              >
                {courseChangeOpen ? "교육 목록 닫기" : "다른 교육 선택"}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-[#10213f] bg-[#eef3f8] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black text-[#10213f]">현재 선택한 교육</p>
                <h3 className="mt-1 break-keep text-xl font-black leading-snug text-slate-950 sm:text-2xl">{checkoutDisplayTitle}</h3>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1.5 text-sm font-black text-[#10213f] shadow-sm">{selectedProduct.title}</span>
            </div>

            {courseChangeOpen ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">교육 과정 선택</p>
                  <p className="text-xs font-bold text-slate-600">선택 후 아래 상품을 고르세요</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {applicationCourseCategories.map((category) => {
                    const isSelected = selectedCategory?.id === category.id;
                    const isUnavailable = category.status !== "available";
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCheckoutCategorySelect(category.id)}
                        disabled={isSubmitting || isUnavailable}
                        aria-pressed={isSelected}
                        className={`min-h-[76px] rounded-xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#10213f] focus:ring-offset-2 ${isSelected ? "border-[#10213f] bg-[#10213f] text-white shadow-[0_14px_30px_rgba(16,33,63,0.18)]" : isUnavailable ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 opacity-70" : "border-slate-200 bg-white text-slate-950 hover:border-[#10213f]/45 hover:bg-white"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={isSelected ? "break-keep text-sm font-black leading-snug text-white" : "break-keep text-sm font-black leading-snug text-slate-950"}>{category.title}</span>
                          <span className={isSelected ? "rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#10213f]" : isUnavailable ? "rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-500" : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600"}>{isUnavailable ? "준비중" : isSelected ? "선택됨" : "선택"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedCategory ? (
              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Step 2</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">수강권 선택</h2>
                  </div>
                  <p className="break-keep text-sm font-bold text-slate-600">선택한 수강권만 최종 확인합니다.</p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedCategory.products.map((product) => {
                    const isSelected = selectedProduct.id === product.id;
                    const isCounselingProduct = isCounselingProductId(product.id) || product.planId === "counseling";
                    const isAdvancedProduct = isCounselingProduct || product.id === "dui-cbt-advanced" || product.id.endsWith("advanced") || product.id.endsWith("premium") || product.planId === "premium";
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleCheckoutProductSelect(product.id)}
                        disabled={isSubmitting}
                        className={`min-h-[86px] rounded-xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#10213f] focus:ring-offset-2 ${isSelected ? "border-[#10213f] bg-[#10213f] text-white shadow-[0_14px_30px_rgba(16,33,63,0.18)]" : isCounselingProduct ? "border-[#d3b271] bg-white text-slate-950 hover:border-[#10213f]" : "border-slate-200 bg-white text-slate-950 hover:border-[#10213f]/45"}`}
                        aria-pressed={isSelected}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className={isSelected ? "block break-keep text-sm font-black leading-snug text-white" : "block break-keep text-sm font-black leading-snug text-slate-950"}>{product.title}</span>
                            <span className={isSelected ? "mt-1 block text-lg font-black text-white" : "mt-1 block text-lg font-black text-[#10213f]"}>{formatApplicationKrw(product.price)}</span>
                          </span>
                          <span className={isSelected ? "rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#10213f]" : isAdvancedProduct ? "rounded-full bg-[#eef3f8] px-2 py-0.5 text-[11px] font-black text-[#173968]" : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600"}>{isSelected ? "선택됨" : isCounselingProduct ? "상담" : isAdvancedProduct ? "심화이수" : "기본 수료"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
          </article>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black leading-snug text-slate-950 sm:text-2xl">결제하기</h2>
            <div className="mt-4 rounded-xl border-2 border-[#10213f] bg-[#eef3f8] p-4">
              <p className="text-sm font-black text-[#10213f]">선택한 수강권</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="break-keep text-lg font-black leading-snug text-slate-950">{selectedProduct.title}</p>
                <strong className="shrink-0 text-xl font-black text-[#10213f]">{formatKrw(selectedProduct.price)}</strong>
              </div>
              <ul className="mt-3 grid gap-1.5 text-xs font-bold leading-5 text-slate-700">
                {getCompactCheckoutIncludes(selectedProduct).map((item) => <li key={item}>✓ {item}</li>)}
              </ul>
            </div>

            <div className="mt-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">결제수단</p>
                <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">결제수단을 선택해 주세요</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
                        <span className="block text-base font-black text-slate-950 sm:text-lg">{option.label}</span>
                        <span className="mt-1 block whitespace-pre-line text-[13px] font-semibold leading-5 text-slate-500 sm:mt-1.5 sm:text-sm">{isUnavailable ? "채널키 설정 필요" : option.description}</span>
                      </span>
                      <span className={paymentMethodIndicatorClass(isSelected)} />
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border-2 border-[#d3b271] bg-[#fff8e8] p-4 text-[15px] leading-7 text-[#5f4514] shadow-sm">
                <p className="break-keep font-black">결제에 어려움이 있으신 경우, 24시간 언제든 고객센터({siteInfo.supportPhone})로 문의해 주세요.</p>
              </div>
            </div>

            {selectedIsCounseling ? <div className="mt-5 rounded-xl border-2 border-[#d3b271] bg-[#fffaf0] p-4 text-sm font-black leading-7 text-[#5f4514]"><p>{counselingNoticeText}</p><p className="mt-1 font-bold text-slate-800">{counselingEvaluationNoticeText}</p></div> : null}

            <dl className="mt-5 space-y-4 border-b border-slate-200 pb-5">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-semibold text-slate-500">상품명</dt>
                <dd className="text-right text-sm font-bold text-slate-950">{selectedPaymentOrderName}</dd>
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

            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="text-base font-bold text-slate-700">결제금액</span>
              <div className="text-right"><strong className="block text-2xl font-bold text-[#10213f] sm:text-3xl">{formatKrw(selectedProduct.price)}</strong></div>
            </div>
            <div className="mt-6 space-y-3">
              <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                <input type="checkbox" checked={orderNoticeChecked} onChange={(event) => setOrderNoticeChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#10213f]" />
                <span>{checkoutDisplayTitle}, 결제금액, 수강기간을 확인했습니다.</span>
              </label>
              <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                <input type="checkbox" checked={refundNoticeChecked} onChange={(event) => setRefundNoticeChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#10213f]" />
                <span>결제 전 필수 안내와 정책을 확인했으며 이에 동의합니다.</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Link href="/terms" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold leading-6 text-[#10213f] shadow-sm transition hover:border-[#10213f] hover:bg-slate-50">이용약관 보기</Link>
                <Link href="/privacy-policy" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold leading-6 text-[#10213f] shadow-sm transition hover:border-[#10213f] hover:bg-slate-50">개인정보처리방침 보기</Link>
                <Link href="/refund-policy" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold leading-6 text-[#10213f] shadow-sm transition hover:border-[#10213f] hover:bg-slate-50">환불규정 보기</Link>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</p> : null}
            {isInitializing ? <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">주문서를 준비하는 중입니다...</p> : null}
            {!isInitializing && !isMember ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">로그인 및 회원가입 후 결제를 진행할 수 있습니다.</p> : null}
            {!isInitializing && !selectedCategoryAvailable ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">준비중인 과정은 아직 결제할 수 없습니다.</p> : null}
            {!isInitializing && !hasPaymentConfig ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">결제 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.</p> : null}
            {hasActiveEnrollment ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900"><p className="font-bold">이미 결제 완료된 수강권이 있습니다.</p><p>중복 결제를 막기 위해 결제 버튼을 비활성화했습니다.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/course-room/?v=202607161010" className={buttonClass("primary", "sm", "rounded-full px-4 font-bold")}>강의실로 이동</Link><Link href="/certificate" className={buttonClass("secondary", "sm", "rounded-full px-4 font-bold")}>수료증 출력</Link></div></div> : null}

            <button type="button" onClick={handleCheckoutPaymentClick} disabled={!canSubmit} className={buttonClass("primary", "lg", "mt-5 w-full rounded-xl font-bold disabled:opacity-100")}>
              {checkoutButtonLabel}
            </button>

            {isSubmitting ? (
              <div className="mt-4 rounded-xl border border-[#d3b271]/60 bg-[#fffaf0] p-4 text-sm leading-6 text-[#5f4514]">
                <p className="font-extrabold text-[#10213f]">결제창을 불러오고 있습니다.</p>
                <p className="mt-1">
                  결제창이 열리기까지 약 10초 정도 소요될 수 있습니다. 현재 화면을 닫거나 결제 버튼을 다시 누르지 말고 잠시만 기다려 주세요.
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-1 text-center text-xs font-medium leading-5 text-slate-500">
              <p>결제 완료 후 즉시 수강을 시작할 수 있습니다.</p>
              <p>수강 즉시 수료증을 출력할 수 있습니다.</p>
            </div>
          </section>
        </aside>
      </div>


      {basicUpsellModalOpen && advancedProductForBasicCheckout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-4 sm:px-6" role="dialog" aria-modal="true" aria-labelledby="basic-upsell-title">
          <div className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 id="basic-upsell-title" className="break-keep text-xl font-black leading-snug text-slate-950 sm:text-2xl">선택하신 과정의 차이를 확인해주세요</h2>
            </div>
            <div className="overflow-y-auto px-5 py-5 text-sm leading-7 text-slate-700 sm:px-6 sm:text-base">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-black text-slate-950">기본 수료과정 49,000원</h3>
                  <p className="mt-2 break-keep">재범방지교육 수료와 기본적인 관련 자료를 준비할 수 있습니다.</p>
                </section>
                <section className="rounded-xl border border-[#cfdceb] bg-[#f7fafc] p-4">
                  <h3 className="text-base font-black text-slate-950">심화이수과정 99,000원</h3>
                  <p className="mt-2 break-keep">기본 수료과정 전체 내용에 더해, 재범방지를 위한 교육 참여와 실천 노력을 보다 구체적인 자료로 준비할 수 있습니다.</p>
                </section>
              </div>

              <div className="mt-5 space-y-4">
                <section>
                  <h3 className="break-keep font-black text-slate-950">✓ 인지행동기반(CBT) 재범방지교육 및 추가 이수증</h3>
                  <p className="mt-1 break-keep">범죄로 이어진 사고·행동패턴을 점검하는 추가 교육을 이수하고, 해당 교육에 대한 별도 이수증을 발급받을 수 있습니다.</p>
                </section>
                <section>
                  <h3 className="break-keep font-black text-slate-950">✓ 교육이수 상세내역서</h3>
                  <p className="mt-1 break-keep">수료 여부뿐 아니라 실제 이수한 교육과정과 주요 교육내용을 구체적으로 확인할 수 있습니다.</p>
                </section>
                <section>
                  <h3 className="break-keep font-black text-slate-950">✓ 교육 소감문</h3>
                  <p className="mt-1 break-keep">교육을 통해 스스로 돌아본 점과 재범방지를 위한 변화 의지·실천계획을 직접 정리합니다.</p>
                </section>
              </div>

              <p className="mt-5 break-keep rounded-xl border border-slate-200 bg-white p-4 font-black leading-7 text-slate-950">위 자료들을 통해 단순한 교육 수료를 넘어, 재범방지를 위해 어떤 교육을 이수하고 어떠한 노력을 기울였는지를 보다 충실하고 구체적인 자료로 준비할 수 있습니다.</p>
            </div>
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-2 sm:px-6">
              <button type="button" onClick={handleContinueBasicCheckout} disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-[#10213f] shadow-sm transition hover:border-[#10213f] hover:bg-white disabled:opacity-60">기본 수료과정으로 계속하기</button>
              <button type="button" onClick={handleSelectAdvancedCheckout} disabled={isSubmitting} className={buttonClass("primary", "md", "min-h-12 rounded-xl px-4 font-black disabled:opacity-60")}>심화이수과정 선택하기</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          {!orderNoticeChecked || !refundNoticeChecked ? (
            <div className="mb-2 grid gap-1.5">
              <label className="flex min-h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-black text-slate-700">
                <input type="checkbox" checked={orderNoticeChecked} onChange={(event) => setOrderNoticeChecked(event.target.checked)} className="h-4 w-4 accent-[#10213f]" />
                상품·금액·수강기간 확인
              </label>
              <label className="flex min-h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-black text-slate-700">
                <input type="checkbox" checked={refundNoticeChecked} onChange={(event) => setRefundNoticeChecked(event.target.checked)} className="h-4 w-4 accent-[#10213f]" />
                필수 안내 및 정책 동의
              </label>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-600">{selectedProduct.title}</p>
              <p className="mt-0.5 text-lg font-black text-[#10213f]">{formatKrw(selectedProduct.price)}</p>
            </div>
            <button type="button" onClick={handleCheckoutPaymentClick} disabled={!canSubmit} className={buttonClass("primary", "md", "min-h-12 shrink-0 rounded-xl px-4 font-black disabled:opacity-100")}>
              {hasActiveEnrollment ? "결제완료" : isSubmitting ? "진행 중" : !orderNoticeChecked || !refundNoticeChecked ? "동의 후 결제" : "바로 결제"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
