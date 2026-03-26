"use client";

function formatToday() {
  return new Date().toLocaleDateString("ko-KR");
}

function buildDocumentNumber() {
  const today = new Date();
  return [
    "CERT",
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
    "001",
  ].join("-");
}

export default function CertificatePage() {
  const certificateData = {
    studentName: "홍길동",
    courseTitle: "음주운전 예방교육 수료",
    issueDate: formatToday(),
    docNumber: buildDocumentNumber(),
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(179,138,61,0.12),transparent_28%),linear-gradient(180deg,#f6f2e9_0%,#e9dfcf_100%)] px-4 py-8 text-[#1f2430] print:bg-white print:p-0">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1160px] flex-col items-center justify-center gap-6 print:min-h-0 print:max-w-none print:gap-0">
        <section className="relative w-full overflow-hidden border-[10px] border-[#e6d3a4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,252,245,0.98))] shadow-[0_18px_60px_rgba(41,33,18,0.18)] before:pointer-events-none before:absolute before:inset-[18px] before:border-2 before:border-[rgba(179,138,61,0.9)] before:content-[''] after:pointer-events-none after:absolute after:inset-[34px] after:border-2 after:border-[rgba(179,138,61,0.45)] after:content-[''] print:min-h-0 print:w-full print:shadow-none"
          style={{ maxWidth: "1122px" }}
        >
          <div className="absolute left-6 top-6 h-[120px] w-[120px] border-l-[3px] border-t-[3px] border-[rgba(179,138,61,0.55)]" />
          <div className="absolute right-6 top-6 h-[120px] w-[120px] border-r-[3px] border-t-[3px] border-[rgba(179,138,61,0.55)]" />
          <div className="absolute bottom-6 left-6 h-[120px] w-[120px] border-b-[3px] border-l-[3px] border-[rgba(179,138,61,0.55)]" />
          <div className="absolute bottom-6 right-6 h-[120px] w-[120px] border-b-[3px] border-r-[3px] border-[rgba(179,138,61,0.55)]" />

          <div className="relative z-10 flex min-h-[793px] flex-col px-10 py-14 sm:px-[88px] sm:py-[70px] print:min-h-0">
            <p className="m-0 text-center text-[18px] tracking-[0.35em] text-[#b38a3d]">CERTIFICATE OF COMPLETION</p>
            <h1 className="mt-[18px] text-center font-serif text-[44px] font-bold tracking-[0.18em] sm:text-[62px]">수 료 증</h1>
            <p className="text-center text-[18px] tracking-[0.08em] text-[#5f6775]">음주운전 예방교육 공식 수료 확인서</p>

            <div className="mt-14 text-center leading-[1.9] sm:mt-[58px]">
              <p className="text-[20px] sm:text-[24px]">아래의 교육생은 본 기관이 시행한</p>
              <div className="mx-auto my-7 inline-block border-b-2 border-[rgba(31,36,48,0.35)] px-[18px] pb-2 text-[38px] font-bold sm:mb-5 sm:text-[56px]">
                {certificateData.studentName}
              </div>
              <p className="text-[20px] sm:text-[24px]">교육과정을 성실히 이수하였으므로</p>
              <div className="mt-2 inline-block border border-[rgba(179,138,61,0.45)] bg-[rgba(179,138,61,0.08)] px-7 py-3 text-[22px] sm:text-[28px]">
                {certificateData.courseTitle}
              </div>
              <p className="mt-7 text-[18px] text-[#5f6775] sm:text-[20px]">위와 같이 수료를 증명합니다.</p>
            </div>

            <div className="mt-auto grid gap-8 pt-10 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="text-[18px] leading-[1.8]">
                <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">수료일자</strong><span>{certificateData.issueDate}</span></div>
                <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">문서번호</strong><span>{certificateData.docNumber}</span></div>
                <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">발급용도</strong><span>교육 수료 확인 및 제출용</span></div>
              </div>

              <div className="text-left sm:text-right">
                <p className="m-0 text-[28px] font-bold tracking-[0.08em] sm:text-[32px]">RESET EDU CENTER</p>
                <div className="mt-[14px] grid h-[104px] w-[104px] place-items-center rounded-full border-[3px] border-[rgba(179,138,61,0.72)] text-center text-[18px] font-bold leading-[1.35] text-[rgba(179,138,61,0.82)] sm:ml-auto">
                  공식
                  <br />
                  인증
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[linear-gradient(135deg,#2b2a26,#5b4522)] px-7 py-4 text-[17px] font-bold text-[#fff8ea] shadow-[0_14px_28px_rgba(35,29,18,0.18)] transition hover:-translate-y-0.5"
          >
            수료증 인쇄하기 / PDF로 저장하기
          </button>
        </div>
      </div>
    </main>
  );
}
