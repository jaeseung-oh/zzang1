"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/app/components/ui/button-styles";
import { getVerifiedActiveUserEnrollments } from "@/lib/course/enrollment-service";
import { requireAuthenticatedUser } from "@/lib/firebase/session";

export type ReflectionResourceKind = "guide" | "example";

type AccessState = "loading" | "allowed" | "denied" | "error";

const handwritingNotice = (
  <aside className="resource-notice resource-section rounded-2xl border border-amber-300 bg-amber-50 p-5 text-slate-800 sm:p-6">
    <h2 className="text-lg font-black text-amber-950">반성문은 직접 작성하는 것을 권장합니다</h2>
    <div className="mt-3 space-y-3 text-[15px] leading-7">
      <p>반성문은 예시를 그대로 복사하기보다 본인의 잘못, 느낀 점, 사건 이후의 변화와 재발방지 계획을 본인의 말로 직접 작성하는 것이 중요합니다.</p>
      <p>가능하면 본인이 직접 자필로 작성하는 것을 권장합니다. 다만 글씨를 알아보기 어렵거나 자필 작성이 힘든 경우에는 컴퓨터로 작성한 뒤 내용을 충분히 확인하고 직접 서명할 수 있습니다.</p>
      <p>자필로 작성한다고 해서 반드시 유리한 결과가 보장되는 것은 아닙니다. 작성 방식보다 사실에 맞는 내용과 진솔한 태도가 중요합니다.</p>
    </div>
  </aside>
);

const legalNotice = (
  <aside className="resource-section rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 sm:p-6">
    <h2 className="font-black text-slate-950">법률 및 이용 안내</h2>
    <p className="mt-3">본 자료는 이용자가 자신의 잘못과 재발방지 계획을 직접 정리할 수 있도록 돕는 일반적인 교육자료입니다.</p>
    <p className="mt-2">본 자료는 개별 사건에 대한 법률상담, 형량 예측, 선처 또는 감형 보장, 반성문 작성 대행을 제공하지 않습니다.</p>
    <p className="mt-2">예시문을 그대로 복사하지 말고 반드시 본인의 실제 경험과 사실에 맞게 작성해야 합니다. 구체적인 법률 판단이 필요한 경우 변호사 등 법률전문가와 상담하시기 바랍니다.</p>
  </aside>
);

function ExampleBox({ children }: { children: ReactNode }) {
  return <div className="resource-example mt-4 space-y-2 rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-4 text-[15px] leading-7 text-slate-800">{children}</div>;
}

function GuideContent() {
  return (
    <>
      <section className="resource-section">
        <h2>음주운전 반성문 작성 가이드</h2>
        <p className="resource-lead">반성문은 어려운 말을 잘 쓰는 글이 아닙니다. 자신이 무엇을 잘못했는지, 왜 그런 행동을 했는지, 앞으로 어떻게 바꿀 것인지를 솔직하게 쓰는 글입니다. 인터넷에 있는 글을 그대로 복사하지 말고 본인의 실제 이야기를 적어야 합니다.</p>
      </section>

      <section className="resource-section">
        <h2>1. 어떤 잘못을 했는지 쓰세요</h2>
        <p>사건이 언제 있었고 어떤 잘못을 했는지 간단하게 적습니다.</p>
        <ExampleBox>
          <p>“저는 20○○년 ○월 ○일 술을 마신 뒤 차량을 운전했습니다.”</p>
          <p>“술을 마시고 운전대를 잡은 제 행동이 잘못이었다는 것을 인정합니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>2. 변명하지 말고 잘못을 인정하세요</h2>
        <p>“집이 가까웠다”, “술을 조금만 마셨다”, “대리운전이 잡히지 않았다”, “사고가 나지 않았다”는 말만 강조하면 변명처럼 보일 수 있습니다.</p>
        <ExampleBox>
          <p>“거리가 짧아도 음주운전은 위험하다는 사실을 제대로 생각하지 못했습니다.”</p>
          <p>“술을 마신 뒤 제가 운전할 수 있다고 판단한 것 자체가 잘못이었습니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>3. 어떤 위험이 있었는지 쓰세요</h2>
        <p>음주운전은 운전자뿐 아니라 보행자와 다른 운전자도 위험하게 만들 수 있습니다.</p>
        <ExampleBox>
          <p>“술을 마신 상태에서는 사람이나 차량을 늦게 발견할 수 있다는 것을 알게 되었습니다.”</p>
          <p>“사고가 나지 않은 것은 제가 안전하게 운전했기 때문이 아니라 큰 피해가 우연히 발생하지 않았을 뿐입니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>4. 왜 운전하게 되었는지 돌아보세요</h2>
        <p>다음과 같은 잘못된 생각이나 습관이 있었는지 돌아봅니다.</p>
        <ul>
          <li>가까운 거리라면 괜찮다고 생각했다.</li>
          <li>술을 조금 마셨으니 괜찮다고 생각했다.</li>
          <li>술자리에 차량을 가져갔다.</li>
          <li>집에 돌아갈 방법을 미리 정하지 않았다.</li>
          <li>대리운전을 기다리지 못했다.</li>
          <li>자신의 운전 실력을 믿었다.</li>
          <li>음주운전을 가볍게 생각했다.</li>
        </ul>
      </section>

      <section className="resource-section">
        <h2>5. 사건 이후 실제로 한 일을 쓰세요</h2>
        <p>말로만 다시 하지 않겠다고 쓰기보다 실제로 바꾼 행동을 적습니다.</p>
        <ul>
          <li>음주운전 예방교육을 받았다.</li>
          <li>술을 마시지 않거나 음주 횟수를 줄이고 있다.</li>
          <li>술자리에는 차량을 가져가지 않는다.</li>
          <li>가족에게 차량 열쇠를 맡긴다.</li>
          <li>상담을 받고 있다.</li>
          <li>음주 습관을 기록하고 있다.</li>
          <li>차량을 처분하거나 운전을 중단했다.</li>
        </ul>
        <p className="mt-3 font-bold text-red-700">하지 않은 일을 했다고 쓰면 안 됩니다.</p>
      </section>

      <section className="resource-section">
        <h2>6. 앞으로 어떻게 할 것인지 쓰세요</h2>
        <p>실제로 지킬 수 있는 계획을 적습니다.</p>
        <ExampleBox>
          <p>“술을 마실 가능성이 있는 날에는 차량을 가져가지 않겠습니다.”</p>
          <p>“차량을 가져간 상태에서 술을 마시게 되면 차량은 두고 택시나 대중교통을 이용하겠습니다.”</p>
          <p>“대리운전이 바로 잡히지 않더라도 직접 운전하지 않겠습니다.”</p>
          <p>“술을 마신 다음 날에도 술이 완전히 깨지 않았다고 생각되면 운전하지 않겠습니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>7. 가족과 직장 이야기는 너무 길게 쓰지 마세요</h2>
        <p>가족과 직장에 생긴 어려움을 쓸 수는 있지만, 자신의 어려움만 계속 이야기하지 않도록 합니다.</p>
        <ExampleBox>
          <p>“저의 잘못으로 가족에게 걱정과 실망을 안겼습니다. 가족을 생각했다면 처음부터 음주운전을 하지 말았어야 했습니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>8. 마지막에는 책임지는 마음을 쓰세요</h2>
        <ExampleBox>
          <p>“이번 일을 단순히 처벌을 받는 사건으로만 생각하지 않겠습니다.”</p>
          <p>“말로만 반성하지 않고 생활을 바꾸며 다시는 같은 잘못을 하지 않겠습니다.”</p>
        </ExampleBox>
      </section>

      <section className="resource-section">
        <h2>반성문 작성 순서</h2>
        <ol>
          <li>언제 어떤 잘못을 했는지</li>
          <li>무엇을 잘못 생각했는지</li>
          <li>다른 사람에게 어떤 위험을 줄 수 있었는지</li>
          <li>사건 이후 무엇을 바꾸었는지</li>
          <li>앞으로 어떻게 재발을 막을 것인지</li>
          <li>책임지고 생활하겠다는 다짐</li>
        </ol>
      </section>

      <section className="resource-section">
        <h2>쓰면 안 되는 내용</h2>
        <ul>
          <li>다른 사람에게 책임을 돌리는 말</li>
          <li>사고가 없으니 괜찮다는 말</li>
          <li>짧은 거리였다는 말만 반복하는 것</li>
          <li>하지 않은 교육이나 상담을 했다고 쓰는 것</li>
          <li>무조건 선처해 달라는 말만 반복하는 것</li>
          <li>인터넷 반성문을 그대로 복사하는 것</li>
          <li>실제 사건과 다른 내용을 쓰는 것</li>
        </ul>
      </section>

      <section className="resource-section">
        <h2>제출 전 확인</h2>
        <ul className="resource-checklist">
          <li>내가 직접 경험한 내용을 썼는가?</li>
          <li>잘못을 다른 사람에게 돌리지 않았는가?</li>
          <li>음주운전의 위험성을 이해하고 있는가?</li>
          <li>사건 이후 실제로 바꾼 행동을 썼는가?</li>
          <li>앞으로 지킬 수 있는 계획을 적었는가?</li>
          <li>하지 않은 일을 했다고 쓰지 않았는가?</li>
          <li>어려운 말보다 솔직한 말로 작성했는가?</li>
        </ul>
      </section>
    </>
  );
}

function ExampleContent() {
  return (
    <>
      <section className="resource-section">
        <h2>음주운전 반성문 예시</h2>
        <div className="resource-warning rounded-2xl border border-red-200 bg-red-50 p-5 text-[15px] font-semibold leading-7 text-red-900">
          아래 글은 작성 방법을 이해하기 위한 예시입니다. 그대로 복사하지 말고 본인의 실제 사건과 행동에 맞게 다시 작성하세요. 하지 않은 교육, 상담, 금주, 절주 등의 내용을 사실과 다르게 적어서는 안 됩니다.
        </div>
      </section>

      <section className="resource-section resource-letter rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-center text-2xl">반성문</h2>
        <div className="mt-8 space-y-3">
          <p><strong>사건번호:</strong> [사건번호]</p>
          <p><strong>성명:</strong> [이름]</p>
        </div>
        <div className="mt-8 space-y-5 text-[16px] leading-8">
          <p>저는 20○○년 ○월 ○일 술을 마신 상태에서 차량을 운전했습니다.</p>
          <p>술을 마시고 운전한 제 행동이 잘못되었다는 것을 인정하며 반성하고 있습니다.</p>
          <p>당시 저는 집까지 거리가 멀지 않고 천천히 운전하면 괜찮을 것이라고 생각했습니다. 하지만 거리가 짧다고 해서 음주운전의 위험이 줄어드는 것은 아니었습니다. 술을 마신 뒤 제가 운전할 수 있는 상태라고 스스로 판단한 것부터 잘못이었습니다.</p>
          <p>음주운전은 저만 위험하게 하는 행동이 아니었습니다. 도로를 걷는 사람이나 다른 차량을 발견하지 못했다면 큰 사고가 날 수도 있었습니다. 사고가 발생하지 않은 것은 제가 안전하게 운전했기 때문이 아니라 큰 피해가 생기지 않았을 뿐이라고 생각합니다.</p>
          <p>저는 술자리에 차량을 가져갔고, 술을 마신 뒤 어떻게 집에 갈 것인지 미리 생각하지 않았습니다. 가까운 거리라면 괜찮다는 잘못된 생각도 가지고 있었습니다. 결국 제 편의를 먼저 생각해 운전대를 잡았습니다.</p>
          <p>사건 이후 저는 술을 마실 가능성이 있는 날에는 차량을 가져가지 않고 있습니다. 차량을 가져간 상태에서 술을 마시게 되면 차량은 두고 택시나 대중교통을 이용하기로 했습니다.</p>
          <p className="rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-950">또한 [실제로 수강한 교육, 금주·절주 노력, 상담, 가족과 정한 약속 등 본인이 실제로 한 내용을 작성합니다.]</p>
          <p>앞으로 대리운전이 바로 잡히지 않더라도 직접 운전하지 않겠습니다. 술을 마신 다음 날에도 술이 완전히 깨지 않았다고 생각되면 운전하지 않겠습니다.</p>
          <p>저의 잘못으로 가족에게 걱정과 실망을 안겼습니다. 가족과 직장에 어려움이 생길 수 있다는 사실도 제가 만든 결과라고 생각합니다.</p>
          <p>이번 일을 단순히 처벌을 피해야 하는 사건으로 생각하지 않겠습니다. 제가 가지고 있던 잘못된 음주 습관과 생각을 바꾸는 계기로 삼겠습니다.</p>
          <p>말로만 반성하지 않고 실제 생활을 바꾸겠습니다. 앞으로 어떤 상황에서도 술을 마신 뒤에는 절대로 운전하지 않겠습니다.</p>
          <p>저의 잘못을 진심으로 반성합니다.</p>
        </div>
        <div className="mt-10 space-y-4 text-right leading-8">
          <p>20○○년 ○월 ○일</p>
          <p>작성자: [이름]</p>
          <p>서명: ____________________</p>
        </div>
      </section>
    </>
  );
}

function PrintActions() {
  const handlePrint = () => window.print();
  const handlePdf = () => {
    window.alert("인쇄 설정 화면에서 프린터를 ‘PDF로 저장’으로 선택하면 파일로 저장할 수 있습니다.");
    window.print();
  };

  return (
    <div className="resource-screen-only flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <button type="button" onClick={handlePrint} className={buttonClass("primary", "md", "w-full rounded-full px-6 font-black sm:w-auto")}>인쇄하기</button>
      <button type="button" onClick={handlePdf} className={buttonClass("warning", "md", "w-full rounded-full px-6 font-black sm:w-auto")}>PDF로 저장하기</button>
    </div>
  );
}

function AccessMessage({ state, onRetry }: { state: AccessState; onRetry: () => void }) {
  if (state === "loading") {
    return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-sm">로그인과 수강권 상태를 확인하는 중입니다...</div>;
  }
  if (state === "denied") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">결제를 완료한 회원에게 제공되는 자료입니다.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">취소·환불·만료되지 않은 유효한 수강권이 있어야 열람할 수 있습니다.</p>
        <Link href="/courses/apply/?category=dui" className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black")}>수강권 확인하기</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-black text-slate-950">권한 확인 중 오류가 발생했습니다.</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">빈 화면 대신 다시 확인할 수 있습니다. 잠시 후 재시도해 주세요.</p>
      <button type="button" onClick={onRetry} className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black")}>다시 시도</button>
    </div>
  );
}

export default function ResourceDocumentPage({ kind }: { kind: ReflectionResourceKind }) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>("loading");
  const [attempt, setAttempt] = useState(0);
  const title = kind === "guide" ? "음주운전 반성문 작성 가이드" : "음주운전 반성문 예시";
  const pathname = kind === "guide" ? "/resources/reflection-guide" : "/resources/dui-reflection-example";

  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      setState("loading");
      try {
        const user = await requireAuthenticatedUser();
        const enrollments = await getVerifiedActiveUserEnrollments(user);
        if (!cancelled) setState(enrollments.length > 0 ? "allowed" : "denied");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "AUTH_LOGIN_REQUIRED") {
          const notice = encodeURIComponent("로그인 후 이용할 수 있습니다.");
          router.replace("/login?next=" + encodeURIComponent(pathname) + "&notice=" + notice);
          return;
        }
        console.error("[paid-resource-access]", error);
        setState("error");
      }
    };

    void verifyAccess();
    return () => {
      cancelled = true;
    };
  }, [attempt, pathname, router]);

  if (state !== "allowed") {
    return <main className="min-h-screen bg-slate-100 px-4 py-16 text-slate-950"><AccessMessage state={state} onRetry={() => setAttempt((value) => value + 1)} /></main>;
  }

  return (
    <main className="resource-print-root min-h-screen bg-slate-100 px-3 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="resource-screen-only mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <Link href="/dashboard#paid-member-resources" className="text-sm font-bold text-indigo-700 underline underline-offset-4">목록으로 돌아가기</Link>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">결제 회원 전용 자료</p>
        </div>
        <PrintActions />
      </div>

      <article className="resource-document mx-auto max-w-5xl bg-white px-5 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:px-10 sm:py-10 lg:px-14">
        <header className="resource-section border-b-2 border-slate-900 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">Reset Edu Center · 결제 회원 전용 자료</p>
          <h1 className="mt-3 break-keep text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">본인의 실제 경험과 사실에 맞게 내용을 확인하고 직접 작성할 때 활용해 주세요.</p>
        </header>

        <div className="mt-7">{handwritingNotice}</div>
        <div className="resource-content mt-8 space-y-9">
          {kind === "guide" ? <GuideContent /> : <ExampleContent />}
          {legalNotice}
        </div>

        <footer className="resource-print-source mt-10 border-t border-slate-300 pt-5 text-xs leading-6 text-slate-500">
          <p>Reset Edu Center 교육자료 · {title}</p>
          <p className="resource-page-number">인쇄 페이지 </p>
        </footer>
      </article>

      <div className="resource-screen-only mx-auto mt-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm leading-7 text-slate-600">PDF 저장은 인쇄 설정 화면에서 프린터를 ‘PDF로 저장’으로 선택하세요.</p>
        <PrintActions />
      </div>
    </main>
  );
}
