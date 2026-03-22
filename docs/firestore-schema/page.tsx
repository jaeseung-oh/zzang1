const collections = [
  {
    name: "users",
    id: "uid",
    fields: [
      "fullName",
      "phone",
      "birthDate",
      "caseType",
      "caseStage",
      "deadlineAt",
      "marketingConsent",
      "legalNoticeAcceptedAt",
      "createdAt",
      "lastLoginAt",
    ],
  },
  {
    name: "courses",
    id: "courseId",
    fields: [
      "slug",
      "title",
      "caseCategory",
      "durationMinutes",
      "price",
      "includedDocuments",
      "complianceNotice",
      "isActive",
    ],
  },
  {
    name: "purchases",
    id: "purchaseId",
    fields: [
      "uid",
      "courseId",
      "paymentStatus",
      "paymentProvider",
      "amount",
      "legalDisclaimerAccepted",
      "finalReviewResponsibilityAccepted",
      "orderedAt",
      "expiresAt",
    ],
  },
  {
    name: "courseProgress",
    id: "progressId",
    fields: [
      "uid",
      "purchaseId",
      "watchedSeconds",
      "completionRate",
      "isCompleted",
      "completedAt",
    ],
  },
  {
    name: "certificates",
    id: "certificateId",
    fields: [
      "uid",
      "purchaseId",
      "documentType",
      "issueNumber",
      "storagePath",
      "downloadUrl",
      "submittedByUser",
      "issuedAt",
    ],
  },
  {
    name: "aiDocuments",
    id: "documentId",
    fields: [
      "uid",
      "documentType",
      "caseType",
      "familyContext",
      "remorseReason",
      "generatedDraft",
      "userEditedDraft",
      "userConfirmedManualReview",
      "version",
      "createdAt",
    ],
  },
];

export default function FirestoreSchemaPage() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0cb85]">Phase 1</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Firebase Firestore Schema</h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-white/70">
          법률서비스 아님 고지, 사용자 최종 검토 책임, 수강 이력, PDF 발급 이력을 함께 남기는 구조입니다.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/30 bg-[#d3ad62]/10 p-5 text-sm leading-7 text-[#f8dfae]">
          본 서비스는 법률 검토나 상담을 제공하지 않으며, 스스로 양형자료를 준비할 수 있도록 돕는 교육 및 보조 양식 제공 서비스입니다.
        </div>
        <div className="mt-10 space-y-5">
          {collections.map((collection) => (
            <section key={collection.name} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{collection.name}</h2>
                <span className="rounded-full border border-[#d3ad62]/40 bg-[#d3ad62]/10 px-3 py-1 text-xs text-[#f0cb85]">
                  docId: {collection.id}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {collection.fields.map((field) => (
                  <span key={field} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                    {field}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
