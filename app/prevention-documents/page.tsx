"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { defaultCourse } from "@/lib/course/catalog";
import { getVerifiedUserEnrollments, isEnrollmentActive } from "@/lib/course/enrollment-service";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackEvent } from "@/lib/analytics/ga";
import { buildDocumentIdentity, getPreventionDocument, hasPreventionDocumentsAccess, preventionDocuments, type PreventionDocumentIdentity } from "@/lib/course/prevention-documents";

const blank = "____________";

function Line({ label, value }: { label: string; value?: string }) {
  return <p><span className="font-semibold">{label}:</span> <span>{value?.trim() || blank}</span></p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7 break-inside-avoid"><h2 className="text-lg font-bold text-slate-950">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-8 text-slate-800">{children}</div></section>;
}

function Signature({ label = "작성자" }: { label?: string }) {
  return <div className="mt-8 grid grid-cols-2 gap-4 text-[15px]"><p>{label}: {blank}</p><p>서명: {blank}</p></div>;
}

function PreventionPlan({ identity }: { identity: PreventionDocumentIdentity }) {
  return <>
    <h1 className="text-center text-3xl font-bold tracking-[0.12em] text-slate-950">재발방지계획서</h1>
    <Section title="1. 작성자 인적사항"><div className="grid gap-2 sm:grid-cols-2"><Line label="성명" value={identity.name} /><Line label="생년월일" value={identity.birthDate} /><Line label="연락처" value={identity.phoneNumber} /><Line label="작성일" value={identity.writtenDate} /></div></Section>
    <Section title="2. 작성 취지"><p>본인은 이번 음주운전 사건을 통해 음주 후 운전이 단순한 실수나 순간적인 판단 착오가 아니라, 타인의 생명과 안전을 위협할 수 있는 중대한 위법행위임을 깊이 깨닫게 되었습니다.</p><p>그동안 본인은 “짧은 거리니까 괜찮다”, “술이 많이 깨었다고 느꼈다”, “대리운전을 부르기 애매하다”는 식의 안일한 생각을 가지고 있었습니다. 그러나 이러한 생각 자체가 매우 위험하고 잘못된 판단이었다는 점을 인정합니다.</p><p>본 계획서는 같은 잘못을 반복하지 않기 위해 본인의 생활방식, 음주습관, 이동수단, 주변관계, 사후관리 방안을 구체적으로 정리하고 실천하기 위해 작성하는 것입니다.</p></Section>
    <Section title="3. 사건에 대한 반성"><p>본인은 음주 후 운전대를 잡은 행위가 변명의 여지 없는 잘못임을 인정합니다. 음주운전은 적발 여부와 관계없이 언제든지 교통사고, 인명피해, 가정 파탄, 직장 생활의 붕괴로 이어질 수 있는 위험한 행위입니다.</p><p>이번 사건으로 인해 가족과 주변 사람들에게 큰 실망과 걱정을 안겼고, 사회 구성원으로서 지켜야 할 기본적인 책임을 다하지 못했습니다. 본인은 이 점을 무겁게 받아들이고 있으며, 다시는 같은 잘못을 반복하지 않겠다는 마음으로 아래와 같은 재발방지계획을 세웠습니다.</p></Section>
    <Section title="4. 재발 원인 분석"><p>첫째, 음주 후 이동계획을 사전에 세우지 않았습니다. 술자리에 참석하면서 귀가 방법을 미리 정하지 않았고, 상황에 따라 즉흥적으로 판단하려 했습니다.</p><p>둘째, 음주 후 자신의 상태를 과신했습니다. 술을 마신 뒤 시간이 조금 지났다는 이유로 운전이 가능하다고 잘못 판단했습니다.</p><p>셋째, 대리운전이나 택시 이용을 비용이나 번거로움의 문제로 가볍게 생각했습니다. 그러나 이번 일을 통해 그 비용과 불편함은 음주운전으로 발생할 수 있는 위험에 비하면 아무것도 아니라는 점을 알게 되었습니다.</p><p>넷째, 주변 사람에게 도움을 요청하거나 운전을 제지받을 수 있는 체계를 마련하지 않았습니다. 앞으로는 음주 전후 상황을 가족 또는 지인과 공유하고, 스스로 판단하지 않도록 하겠습니다.</p></Section>
    <Section title="5. 구체적인 재발방지계획"><h3 className="font-bold">가. 음주 전 이동계획 사전 확정</h3><ul className="list-disc pl-5"><li>차량을 가져가지 않기</li><li>대중교통 이용하기</li><li>택시 또는 대리운전비를 미리 확보하기</li><li>회식 또는 모임 장소 주변 숙박 가능 여부 확인하기</li><li>음주 가능성이 있는 일정에는 차량 열쇠를 가족에게 맡기기</li></ul><h3 className="font-bold">나. 음주 후 운전 가능성 원천 차단</h3><ul className="list-disc pl-5"><li>“잠깐만 운전”, “가까운 거리”, “술이 깼다”는 판단을 하지 않겠습니다.</li><li>음주 후 다음 날 아침에도 숙취가 있을 수 있으므로 충분한 시간이 지나기 전에는 운전하지 않겠습니다.</li><li>전날 과음한 경우 출근이나 외출 시 대중교통을 이용하겠습니다.</li></ul><h3 className="font-bold">다. 가족 및 주변 사람과의 확인 체계 마련</h3><ul className="list-disc pl-5"><li>음주 모임 전 가족에게 장소와 귀가 방법을 알리겠습니다.</li><li>술자리 후 차량 운전 가능성이 생기면 즉시 가족에게 연락하겠습니다.</li><li>가족이 운전을 만류할 경우 어떠한 변명도 하지 않고 따르겠습니다.</li><li>지인들에게도 음주 후 운전하지 않겠다는 사실을 알리고, 필요 시 제지해달라고 요청하겠습니다.</li></ul><h3 className="font-bold">라. 음주 습관 개선</h3><ul className="list-disc pl-5"><li>주중 음주를 하지 않겠습니다.</li><li>음주 횟수를 월 ____회 이하로 제한하겠습니다.</li><li>술자리 참석 전 음주량 한도를 정하겠습니다.</li><li>2차, 3차 술자리는 참석하지 않겠습니다.</li><li>스트레스 해소를 음주가 아닌 운동, 산책, 가족과의 시간, 취미활동으로 대체하겠습니다.</li></ul><h3 className="font-bold">마. 교육 및 점검 지속</h3><ul className="list-disc pl-5"><li>월 1회 재발방지계획 이행 여부 점검</li><li>음주일지 작성</li><li>대리운전·택시 이용 내역 보관</li><li>필요 시 상담기관 또는 전문가 상담 이용</li><li>가족과 월 1회 생활 변화 여부 공유</li></ul></Section>
    <Section title="6. 향후 다짐"><p>본인은 이번 일을 통해 음주운전이 한 사람의 인생뿐 아니라 타인의 생명과 가족의 일상까지 무너뜨릴 수 있는 중대한 범죄라는 사실을 깨달았습니다.</p><p>앞으로는 어떠한 상황에서도 음주 후 운전하지 않겠습니다. 술자리에 참석할 때는 반드시 이동계획을 사전에 정하고, 차량 이용 가능성을 원천적으로 차단하겠습니다. 또한 가족과 주변 사람들에게 신뢰를 회복하기 위해 말뿐인 반성이 아니라 실제 생활 변화로 증명하겠습니다.</p><p>본인은 위 계획을 성실히 실천하고, 다시는 같은 잘못을 반복하지 않을 것을 다짐합니다.</p><p className="mt-6">작성일: {identity.writtenDate || "20____년 ____월 ____일"}</p><Signature /></Section>
  </>;
}

function DrinkingActionPlan({ identity }: { identity: PreventionDocumentIdentity }) {
  return <>
    <h1 className="text-center text-3xl font-bold tracking-[0.08em] text-slate-950">음주예방실천계획서</h1>
    <Section title="1. 작성자 인적사항"><div className="grid gap-2 sm:grid-cols-2"><Line label="성명" value={identity.name} /><Line label="생년월일" value={identity.birthDate} /><Line label="작성일" value={identity.writtenDate} /></div></Section>
    <Section title="2. 작성 목적"><p>본 계획서는 음주운전 재발을 예방하기 위해 본인의 음주 습관을 점검하고, 음주 상황에서 지켜야 할 구체적인 실천 기준을 마련하기 위해 작성합니다.</p><p>본인은 음주운전의 문제는 단순히 운전 당시의 판단만이 아니라, 음주 전 계획 부족, 음주량 조절 실패, 귀가 방법 미확보, 안일한 생활습관에서 비롯될 수 있음을 인식하고 있습니다.</p><p>이에 따라 본인은 아래와 같이 음주 예방 및 관리 계획을 세우고 성실히 실천하겠습니다.</p></Section>
    <Section title="3. 현재 음주습관 점검"><ul className="list-disc pl-5"><li>음주 빈도: 주 ____회 / 월 ____회</li><li>주된 음주 상황: 회식, 지인 모임, 혼술, 경조사, 기타 ____________</li><li>평균 음주량: 소주 ____병 / 맥주 ____잔 / 기타 ____________</li><li>음주 후 귀가 방법: 자가용, 택시, 대리운전, 대중교통, 기타 ____________</li><li>음주 후 운전 위험이 생겼던 상황: 있음 / 없음</li><li>음주를 줄여야 할 필요성: 매우 높음 / 높음 / 보통</li></ul><p>본인은 위 내용을 바탕으로 앞으로 음주 횟수와 음주량을 줄이고, 음주 후 운전 가능성을 사전에 차단하겠습니다.</p></Section>
    <Section title="4. 음주 예방 실천 원칙"><h3 className="font-bold">가. 차량을 가져간 날에는 술을 마시지 않는다</h3><p>차량을 운전해 이동한 날에는 어떠한 경우에도 술을 마시지 않겠습니다. 예상하지 못한 술자리가 생기더라도 음주하지 않거나, 차량을 두고 귀가하는 방법을 선택하겠습니다.</p><h3 className="font-bold">나. 술을 마실 가능성이 있으면 차량을 가져가지 않는다</h3><p>회식, 모임, 경조사 등 술을 마실 가능성이 있는 일정에는 처음부터 차량을 가져가지 않겠습니다. 필요한 경우 대중교통, 택시, 가족 동행, 지인 동행을 활용하겠습니다.</p><h3 className="font-bold">다. 음주량을 사전에 정한다</h3><ul className="list-disc pl-5"><li>소주 기준: ____잔 이하</li><li>맥주 기준: ____잔 이하</li><li>음주 시간: ____시간 이내</li><li>2차 참석 여부: 참석하지 않음 / 부득이한 경우 무알코올 음료 선택</li></ul><h3 className="font-bold">라. 권유받는 술은 거절한다</h3><ul className="list-disc pl-5"><li>“오늘은 차를 가져오지 않았더라도 술을 줄이기로 했습니다.”</li><li>“최근 음주습관을 관리하고 있어서 더 마시지 않겠습니다.”</li><li>“내일 운전 일정이 있어 여기까지만 마시겠습니다.”</li></ul><h3 className="font-bold">마. 음주 후 이동수단을 미리 확보한다</h3><ul className="list-disc pl-5"><li>대리운전 앱 설치 및 결제수단 등록</li><li>택시 앱 설치 및 결제수단 등록</li><li>대중교통 막차 시간 확인</li><li>가족 또는 지인에게 귀가 도움 요청</li><li>숙박 필요 시 숙박 장소 확인</li></ul></Section>
    <Section title="5. 생활 변화 계획"><h3 className="font-bold">가. 스트레스 해소 방법 변경</h3><ul className="list-disc pl-5"><li>주 2~3회 걷기 또는 운동</li><li>가족과 식사 또는 산책</li><li>취미활동</li><li>충분한 수면</li><li>필요 시 상담 또는 주변 사람과 대화</li></ul><h3 className="font-bold">나. 음주 모임 줄이기</h3><ul className="list-disc pl-5"><li>월 음주 모임 ____회 이하</li><li>늦은 시간까지 이어지는 술자리 참석 자제</li><li>2차·3차 참석하지 않기</li><li>술자리 후 귀가 인증 또는 가족 연락</li></ul><h3 className="font-bold">다. 음주 기록 작성</h3><ul className="list-disc pl-5"><li>날짜</li><li>장소</li><li>함께한 사람</li><li>음주량</li><li>귀가 방법</li><li>다음 날 상태</li><li>개선할 점</li></ul></Section>
    <Section title="6. 가족 및 주변인 협조 계획"><ul className="list-disc pl-5"><li>가족에게 음주 계획과 귀가 방법을 사전에 알리겠습니다.</li><li>술자리 후 운전하지 않았는지 확인받겠습니다.</li><li>차량 열쇠를 가족에게 맡기는 방법을 활용하겠습니다.</li><li>주변 지인에게도 음주 후 운전하지 않겠다는 원칙을 알리겠습니다.</li></ul></Section>
    <Section title="7. 실천 점검표"><table className="w-full border-collapse text-sm"><tbody>{["술자리 전 귀가 방법을 정했는가", "차량을 가져간 날 술을 마시지 않았는가", "정한 음주량을 지켰는가", "2차·3차 술자리를 피했는가", "음주 후 운전하지 않았는가", "가족 또는 지인에게 귀가 사실을 알렸는가", "음주 기록을 작성했는가"].map((item) => <tr key={item}><td className="border border-slate-300 px-3 py-2">{item}</td><td className="w-32 border border-slate-300 px-3 py-2 text-center">예 / 아니오</td></tr>)}</tbody></table></Section>
    <Section title="8. 향후 다짐"><p>본인은 음주운전 예방을 위해 음주 전 계획, 음주 중 절제, 음주 후 이동수단 확보를 생활화하겠습니다.</p><p>술을 마시지 않는 것이 가장 안전한 선택이며, 부득이하게 술자리에 참석하더라도 운전 가능성을 사전에 차단하겠습니다. 앞으로는 순간적인 판단에 의존하지 않고, 미리 정한 원칙에 따라 행동하겠습니다.</p><p>본인은 위 음주예방실천계획을 성실히 이행할 것을 다짐합니다.</p><p className="mt-6">작성일: {identity.writtenDate || "20____년 ____월 ____일"}</p><Signature /></Section>
  </>;
}

function Pledge({ identity }: { identity: PreventionDocumentIdentity }) {
  return <>
    <h1 className="text-center text-3xl font-bold tracking-[0.08em] text-slate-950">음주운전 재발방지 서약서</h1>
    <Section title="1. 서약자 인적사항"><div className="grid gap-2 sm:grid-cols-2"><Line label="성명" value={identity.name} /><Line label="생년월일" value={identity.birthDate} /><Line label="주소" value={identity.address} /><Line label="연락처" value={identity.phoneNumber} /></div></Section>
    <Section title="2. 서약 내용"><p>본인은 음주운전이 타인의 생명과 신체에 중대한 피해를 줄 수 있는 위험한 행위이며, 사회적으로도 엄중하게 책임져야 할 위법행위임을 깊이 인식하고 있습니다.</p><p>본인은 이번 일을 계기로 음주운전에 대한 안일한 생각을 버리고, 앞으로 어떠한 경우에도 음주 후 운전하지 않을 것을 엄숙히 서약합니다.</p></Section>
    <Section title="3. 구체적 서약사항"><ol className="list-decimal space-y-2 pl-5"><li>술을 마신 날에는 어떠한 경우에도 운전하지 않겠습니다.</li><li>술을 마실 가능성이 있는 모임에는 차량을 가져가지 않겠습니다.</li><li>차량을 가져간 날에는 술을 마시지 않겠습니다.</li><li>음주 후 “가까운 거리”, “잠깐 이동”, “술이 깬 것 같다”는 이유로 운전하지 않겠습니다.</li><li>음주 후 이동이 필요한 경우 반드시 대리운전, 택시, 대중교통, 가족 또는 지인의 도움을 이용하겠습니다.</li><li>전날 과음한 경우 다음 날에도 숙취 운전 가능성을 고려하여 운전을 자제하겠습니다.</li><li>가족과 주변 사람에게 본 서약 내용을 알리고, 음주 후 운전하지 않도록 확인받겠습니다.</li><li>음주 횟수와 음주량을 줄이기 위해 지속적으로 노력하겠습니다.</li><li>음주운전 예방교육에서 배운 내용을 생활 속에서 실천하겠습니다.</li><li>다시는 같은 잘못으로 법적·사회적 책임을 지는 일이 없도록 스스로를 엄격히 관리하겠습니다.</li></ol></Section>
    <Section title="4. 가족 및 사회에 대한 다짐"><p>본인은 이번 일로 가족과 주변 사람들에게 큰 걱정과 실망을 안겨주었습니다. 앞으로 말로만 반성하는 데 그치지 않고, 실제 생활 태도와 행동의 변화로 신뢰를 회복하겠습니다.</p><p>음주운전은 나 하나의 문제가 아니라, 무고한 사람의 생명과 안전을 위협할 수 있는 행위임을 잊지 않겠습니다. 본인은 앞으로 책임 있는 사회 구성원으로서 교통법규를 준수하고, 음주 후 운전대를 잡지 않겠습니다.</p></Section>
    <Section title="5. 최종 서약"><p>본인은 위 내용을 충분히 읽고 이해하였으며, 어떠한 상황에서도 음주운전을 하지 않을 것을 서약합니다.</p><p>만약 다시 음주운전을 하게 될 경우 그에 따른 법적·사회적 책임을 무겁게 받아들이겠습니다.</p><p className="mt-6">작성일: {identity.writtenDate || "20____년 ____월 ____일"}</p><Signature label="서약자" /><div className="mt-8 grid grid-cols-3 gap-4 text-[15px]"><p>확인자: {blank}</p><p>서명: {blank}</p><p>관계: {blank}</p></div></Section>
  </>;
}

function DocumentBody({ type, identity }: { type: string | null; identity: PreventionDocumentIdentity }) {
  if (type === "drinking-action-plan") return <DrinkingActionPlan identity={identity} />;
  if (type === "pledge") return <Pledge identity={identity} />;
  return <PreventionPlan identity={identity} />;
}

function PreventionDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = getPreventionDocument(searchParams.get("type"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState<PreventionDocumentIdentity>({ name: "", birthDate: "", phoneNumber: "", address: "", writtenDate: "" });
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const adminTargetUid = searchParams.get("adminUserId") || "";
        const adminAccess = isSuperAdmin(user);
        const targetUid = adminAccess && adminTargetUid ? adminTargetUid : user.uid;
        const enrollments = adminAccess && adminTargetUid
          ? []
          : await getVerifiedUserEnrollments(user, null);
        const enrollment = enrollments.find((item) => item.courseId === defaultCourse.id && isEnrollmentActive(item));
        const profile = await getUserProfile(targetUid);
        if (cancelled) return;
        const allowed = adminAccess || enrollments.some((item) => item.courseId === defaultCourse.id && isEnrollmentActive(item) && hasPreventionDocumentsAccess(item.productId, item.amount, item.productTitle));
        setHasAccess(allowed);
        setIdentity(buildDocumentIdentity(profile));
        if (!allowed) {
          const message = "수강권 결제 후 이용할 수 있습니다.";
          setError("참고서식 포함 과정 구매자만 해당 서식을 확인할 수 있습니다.");
          router.replace("/courses/apply/?category=dui&productId=dui-documents&notice=" + encodeURIComponent(message));
        }
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "";
        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=/prevention-documents");
          return;
        }
        if (!cancelled) setError("서식 이용 권한을 확인하지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const printDocument = (mode: "print" | "pdf") => {
    trackEvent("material_download", { method: mode, material_id: selected.id, material_name: selected.title });
    const previousTitle = document.title;
    document.title = selected.title.replace(/\s+/g, "_");
    window.setTimeout(() => window.print(), mode === "pdf" ? 80 : 0);
    window.setTimeout(() => { document.title = previousTitle; }, 800);
  };

  return <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-slate-950 print:bg-white print:p-0">
    <style>{`@page { size: A4; margin: 14mm; } @media print { html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .document-print-area, .document-print-area * { visibility: visible !important; } .document-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } .document-paper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; outline: 0 !important; --tw-ring-shadow: 0 0 #0000 !important; } .no-print { display: none !important; } .document-paper section { break-inside: avoid; page-break-inside: avoid; } .document-paper h1 { margin-top: 0 !important; } }`}</style>
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-[#274690]">참고서식</p><h1 className="mt-1 text-3xl font-bold">{selected.title}</h1><p className="mt-2 text-sm text-slate-600">{selected.description}</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/course-room" className={buttonClass("secondary", "sm", "rounded-full")}>수강실로 이동</Link><button type="button" disabled={!hasAccess} onClick={() => printDocument("print")} className={buttonClass("warning", "sm", "rounded-full font-bold disabled:opacity-60")}>인쇄하기</button><button type="button" disabled={!hasAccess} onClick={() => printDocument("pdf")} className={buttonClass("primary", "sm", "rounded-full font-bold disabled:opacity-60")}>PDF 저장</button></div>
      </div>
      <div className="no-print mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold text-slate-700">성명<input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="text-sm font-semibold text-slate-700">생년월일<input value={identity.birthDate} onChange={(e) => setIdentity({ ...identity, birthDate: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="text-sm font-semibold text-slate-700">연락처<input value={identity.phoneNumber} onChange={(e) => setIdentity({ ...identity, phoneNumber: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="text-sm font-semibold text-slate-700">주소<input value={identity.address} onChange={(e) => setIdentity({ ...identity, address: e.target.value })} placeholder="서약서에만 표시" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      </div>
      <div className="no-print mb-5 flex flex-wrap gap-2">{preventionDocuments.map((doc) => <Link key={doc.id} href={`/prevention-documents?type=${doc.id}`} className={doc.id === selected.id ? buttonClass("primary", "sm", "rounded-full") : buttonClass("secondary", "sm", "rounded-full")}>{doc.title}</Link>)}</div>
      {loading ? <p className="no-print rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">서식 이용 권한을 확인하는 중입니다...</p> : null}
      {error && !loading ? <p className="no-print rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p> : null}
      {hasAccess ? <article className="document-print-area document-paper mx-auto max-w-[210mm] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-200"><DocumentBody type={selected.id} identity={identity} /></article> : null}
    </div>
  </main>;
}

export default function PreventionDocumentsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#eef3f8] p-8">서식을 준비하는 중입니다...</main>}><PreventionDocumentsContent /></Suspense>;
}
