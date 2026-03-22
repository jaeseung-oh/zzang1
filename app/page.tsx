const tickerItems = [
  "수강생 실제 제출 사례: 교육 이수증과 심리검사 결과지를 함께 준비했습니다.",
  "주말 수강 후 월요일 오전 제출용 PDF 3종을 다운로드했습니다.",
  "AI 초안 작성 도우미로 반성문 초안을 만든 뒤 직접 수정해 제출했습니다.",
  "심야 결제 후 1시간 교육을 마치고 준법 서약서를 발급받았습니다.",
  "사건 유형에 맞는 제출 체크리스트를 보고 준비 순서를 정리했습니다.",
];

const emergencyCards = [
  {
    title: "1시간 온라인 완성",
    body: "제출 일정이 촉박한 사용자가 1시간 분량 VOD를 완료하고 필요한 양형자료를 준비할 수 있도록 설계했습니다.",
  },
  {
    title: "전문 심리소견서 포함",
    body: "건전음주 교육 이수증, 인지행동 심리검사 결과지, 준법 서약서를 하나의 제출 흐름으로 정리합니다.",
  },
  {
    title: "24시간 자동 발급",
    body: "심야와 주말에도 결제 후 수강 완료 시 대시보드에서 PDF를 즉시 내려받을 수 있는 자동화 구조를 제공합니다.",
  },
];

const proofSteps = [
  {
    step: "01",
    title: "사건 유형에 맞는 과정 선택",
    copy: "음주운전, 성범죄, 마약 등 상황에 맞는 교육 과정과 제출 자료 구성을 확인합니다.",
  },
  {
    step: "02",
    title: "1시간 수강 및 체크리스트 정리",
    copy: "교육 수강과 동시에 제출 일정, 준비 서류, 주의사항을 한 화면에서 정리할 수 있습니다.",
  },
  {
    step: "03",
    title: "양형자료 PDF 발급",
    copy: "이수증, 심리검사 결과지, 준법 서약서를 발급받고 사용자 스스로 최종 검토 후 제출합니다.",
  },
];

const outputs = [
  "건전음주 교육 이수증 PDF",
  "인지행동 심리검사 결과지 PDF",
  "준법 서약서 PDF",
  "AI 반성문 초안 작성 가이드",
  "AI 탄원서 초안 작성 가이드",
  "사건별 제출 체크리스트",
];

const trustStats = [
  { label: "긴급 대응 가능 시간", value: "24/7" },
  { label: "표준 수강 시간", value: "60분" },
  { label: "자동 발급 문서", value: "3종" },
  { label: "초안 작성 안내", value: "1분" },
];

const disclaimer =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 스스로 양형자료를 준비할 수 있도록 돕는 교육 및 보조 양식 제공 서비스입니다.";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-white/10 bg-black/25">
        <div className="mx-auto max-w-7xl overflow-hidden px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex w-[200%] animate-[ticker_32s_linear_infinite] gap-10 text-sm font-semibold tracking-[0.16em] text-[#f0cb85] uppercase">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`} className="whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
        <header className="flex flex-col gap-8 rounded-[2rem] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-6 shadow-[0_32px_90px_rgba(0,0,0,0.32)] lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#d3ad62]/30 bg-[#d3ad62]/10 px-4 py-2 text-xs font-semibold tracking-[0.3em] text-[#f0cb85] uppercase">
                Sentencing Materials Education Center
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
                내일 제출할 양형자료를
                <br />
                <span className="text-[#f0cb85]">오늘 밤 안에 준비할 수 있도록</span>
                <br />
                돕는 전문 온라인 교육 센터
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">
                음주운전, 성범죄, 마약 등 형사사건 절차에서 제출용 양형자료를 준비해야 하는 사용자를 위해,
                1시간 온라인 교육, PDF 3종 자동 발급, AI 반성문·탄원서 초안 작성 도우미를 한 흐름으로 제공합니다.
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/25 bg-[#d3ad62]/10 p-4 text-sm leading-7 text-[#f7dfab]">
                {disclaimer}
              </div>
            </div>

            <aside className="w-full max-w-md rounded-[1.75rem] border border-[#d3ad62]/25 bg-[#08111d]/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
              <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">긴급 준비 브리핑</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-[color:var(--muted)]">결제 후</p>
                  <p className="mt-2 text-2xl font-semibold text-white">즉시 수강 시작</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-[color:var(--muted)]">수강 완료 후</p>
                  <p className="mt-2 text-2xl font-semibold text-white">양형자료 3종 발급</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-[color:var(--muted)]">AI 도우미</p>
                  <p className="mt-2 text-2xl font-semibold text-white">초안 작성 가이드 제공</p>
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <a href="#pre-check" className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85]">
                1시간 온라인 준비 시작
              </a>
              <a href="/ai-draft" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                AI 초안 작성 도우미 열기
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <p className="text-xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {emergencyCards.map((card) => (
            <article key={card.title} className="rounded-[1.5rem] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <p className="text-sm font-semibold tracking-[0.24em] text-[#f0cb85] uppercase">핵심 기능</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">{card.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[color:var(--surface)] p-6 lg:p-8">
            <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">Phase 1. Firestore Blueprint</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">법적 안전장치를 포함한 Firebase 데이터 구조</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--muted)]">
              사용자 정보, 교육 과정, 결제 이력뿐 아니라 면책 고지 동의, 사용자 최종 검토 확인, AI 초안 수정 이력을 함께 기록해
              교육 서비스와 사용자 책임 범위를 분명하게 분리합니다.
            </p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050c16]">
              <div className="border-b border-white/10 px-5 py-4 text-sm font-semibold text-white">핵심 컬렉션 구조</div>
              <div className="grid gap-0 divide-y divide-white/10 text-sm text-[color:var(--muted)]">
                {[
                  ["users", "기본 인적사항, 사건유형, 제출 마감, 면책 고지 수락 시각 저장"],
                  ["courses", "사건 카테고리, 교육 시간, 포함 문서, 준수 고지 문구 저장"],
                  ["purchases", "결제 상태와 결제 전 면책/최종 검토 동의 저장"],
                  ["courseProgress", "시청률, 완료 여부, 자동 발급 트리거 키 저장"],
                  ["certificates", "이수증, 심리검사 결과지, 준법 서약서 PDF 메타데이터 저장"],
                  ["aiDocuments", "초안 생성값, 사용자 수정본, 직접 검토 확인값 저장"],
                ].map(([name, desc]) => (
                  <div key={name} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]">
                    <div className="font-semibold text-white">{name}</div>
                    <div>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <a href="/docs/firestore-schema" className="mt-5 inline-flex text-sm font-semibold text-[#f0cb85] underline-offset-4 hover:underline">
              Firestore 스키마 문서 보기
            </a>
          </div>

          <div className="rounded-[2rem] border border-[#d3ad62]/20 bg-[linear-gradient(180deg,rgba(211,173,98,0.16),rgba(6,12,20,0.9))] p-6 lg:p-8" id="ai-guide">
            <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">Phase 2. AI Drafting Helper</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">AI 반성문/탄원서 초안 작성 도우미</h2>
            <p className="mt-4 text-sm leading-8 text-[color:var(--muted)]">
              범죄 유형, 반성 사유, 가족관계, 재범 방지 계획을 입력하면 자연스러운 초안을 제시하고,
              사용자가 직접 문장을 수정해 자신의 상황에 맞는 최종본을 완성하도록 돕습니다.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#07101a]/85 p-5 text-sm leading-7 text-[color:var(--muted)]">
              <p className="font-semibold text-white">중요 안내</p>
              <p className="mt-3">
                AI가 제시하는 문구는 참고용 초안입니다. 사용자가 직접 사실관계를 확인하고 최종 수정해야 하며,
                법률 검토나 결과 보장을 의미하지 않습니다.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "사건 유형 선택형 입력 폼",
                "반성 사유와 재범 방지 계획 반영",
                "판결문이 아닌 제출용 초안 작성 보조",
                "최종 수정 책임은 사용자에게 있음을 명시",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f0cb85]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[color:var(--surface)] p-6 lg:p-8" id="pre-check">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">결제 전 필수 확인</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">사용자 본인 확인과 면책 고지를 먼저 체크합니다</h2>
            </div>
            <p className="max-w-xl text-sm leading-8 text-[color:var(--muted)]">
              결과를 보장하는 서비스가 아니라, 제출용 양형자료를 스스로 준비할 수 있도록 돕는 교육 서비스라는 점을 결제 전 분명히 안내합니다.
            </p>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#d3ad62]" defaultChecked />
                <span>{disclaimer}</span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#d3ad62]" defaultChecked />
                <span>AI가 제시하는 문구와 자동 발급 문서는 참고 및 제출 준비용이며, 사용자가 직접 사실관계를 확인하고 최종 검토한 뒤 제출합니다.</span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#d3ad62]" />
                <span>본인은 위 내용을 확인했으며, 교육 수강 및 자료 발급을 진행하기 전에 직접 검토 책임이 본인에게 있음을 이해했습니다.</span>
              </label>
            </div>
            <div className="rounded-[1.5rem] border border-[#d3ad62]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5">
              <p className="text-xs font-semibold tracking-[0.24em] text-[#f0cb85] uppercase">준비 완료 후 제공 문서</p>
              <div className="mt-5 space-y-3">
                {outputs.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[color:var(--surface)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">제출 준비 흐름</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">1시간 교육과 문서 준비를 한 흐름으로 정리합니다</h2>
            </div>
            <p className="max-w-xl text-sm leading-8 text-[color:var(--muted)]">
              사용자가 서류 준비 순서를 놓치지 않도록 교육, 문서 발급, 초안 작성 가이드를 한 화면 구조로 연결합니다.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {proofSteps.map((item) => (
              <article key={item.step} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-semibold tracking-[0.22em] text-[#f0cb85]">{item.step}</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="rounded-[2rem] border border-[#d3ad62]/20 bg-[linear-gradient(180deg,rgba(211,173,98,0.12),rgba(255,255,255,0.02))] p-6 lg:p-8">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#f0cb85] uppercase">Legal Notice</p>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-white/80">{disclaimer}</p>
          <p className="mt-4 text-sm leading-8 text-[color:var(--muted)]">
            본 사이트의 AI 초안 작성 도우미와 자동 발급 문서는 사용자의 자기 작성 및 제출 준비를 보조하기 위한 기능입니다.
            개별 사건에 대한 법률 자문, 결과 보장, 법률대리를 의미하지 않습니다.
          </p>
        </footer>
      </section>
    </main>
  );
}
