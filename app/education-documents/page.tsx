"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { DUI_CBT_ADVANCED_COURSE_ID, defaultCourse } from "@/lib/course/catalog";
import { getVerifiedActiveUserEnrollments, isEnrollmentActive, type EnrollmentRecord } from "@/lib/course/enrollment-service";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { centerLogoPath, sealStampPath } from "@/app/components/SealStamp";

type TimestampLike = { seconds: number } | string | Date | null | undefined;
type PlanLevel = "BASIC" | "PREMIUM";
type SaveStatus = "idle" | "saving" | "saved" | "failed";
type WritingStatus = "작성 전" | "작성중" | "작성완료";

type ProgressRecord = {
  courseId?: string;
  completionRate?: number;
  isCompleted?: boolean;
  moduleProgress?: Record<string, { completionRate?: number; isCompleted?: boolean }>;
  updatedAt?: TimestampLike;
};

type CertificateRecord = {
  id: string;
  uid?: string;
  userId?: string;
  certificateNo?: string;
  issueNumber?: string;
  courseId?: string;
  courseTitle?: string;
  documentType?: string;
  userName?: string;
  birthDate?: string;
  completedAt?: TimestampLike;
  issuedAt?: TimestampLike;
  certificateIssuedAt?: TimestampLike;
};

type CourseOption = {
  key: string;
  level: PlanLevel;
  enrollment: EnrollmentRecord;
};

type EnrollmentWithPlanFields = EnrollmentRecord & {
  planId?: string | null;
  courseLevel?: string | null;
};

type IssueDocument = {
  key: "basic-certificate" | "cbt-completion" | "cbt-detail";
  title: string;
  courseId: string;
  documentType: "completion" | "cbt-completion" | "cbt-detail";
  fileName: string;
  requires: "basic" | "cbt";
};

type WritingDocument = {
  key: "reflection" | "prevention-plan" | "drinking-action-plan" | "pledge";
  title: string;
  fileName: string;
  sections: Array<{ title: string; fields: Array<{ key: string; label: string; placeholder: string; long?: boolean }> }>;
};

const issueDocumentsByLevel: Record<PlanLevel, IssueDocument[]> = {
  BASIC: [
    { key: "basic-certificate", title: "기본과정 수료증", courseId: defaultCourse.id, documentType: "completion", fileName: "01_기본과정_수료증.pdf", requires: "basic" },
  ],
  PREMIUM: [
    { key: "basic-certificate", title: "기본과정 수료증", courseId: defaultCourse.id, documentType: "completion", fileName: "01_기본과정_수료증.pdf", requires: "basic" },
    { key: "cbt-completion", title: "인지행동기반 재발방지교육 이수증", courseId: DUI_CBT_ADVANCED_COURSE_ID, documentType: "cbt-completion", fileName: "06_인지행동기반_재발방지교육_이수증.pdf", requires: "cbt" },
    { key: "cbt-detail", title: "재범방지 교육 이수 상세 내역서", courseId: DUI_CBT_ADVANCED_COURSE_ID, documentType: "cbt-detail", fileName: "07_재범방지교육_이수_상세내역서.pdf", requires: "cbt" },
  ],
};

const writingDocuments: WritingDocument[] = [
  {
    key: "reflection",
    title: "반성문 작성자료",
    fileName: "02_반성문_작성자료.pdf",
    sections: [
      { title: "사건과 책임 인식", fields: [
        { key: "incident", label: "사건 경위와 당시 판단", placeholder: "본인의 실제 상황을 과장 없이 정리해 주세요.", long: true },
        { key: "responsibility", label: "잘못을 인식한 부분", placeholder: "타인과 가족, 사회에 끼친 영향을 본인 표현으로 작성해 주세요.", long: true },
      ] },
      { title: "생활 변화 계획", fields: [
        { key: "changes", label: "반복을 막기 위한 변화", placeholder: "음주 전후 이동수단, 주변 도움, 생활 습관을 구체적으로 적어 주세요.", long: true },
        { key: "promise", label: "앞으로의 다짐", placeholder: "본인이 직접 실천할 수 있는 약속을 작성해 주세요.", long: true },
      ] },
    ],
  },
  {
    key: "prevention-plan",
    title: "재발방지계획서",
    fileName: "03_재발방지계획서.pdf",
    sections: [
      { title: "위험상황 확인", fields: [
        { key: "triggers", label: "음주운전으로 이어질 수 있는 상황", placeholder: "예: 회식 후 귀가, 가까운 거리 이동, 숙취 상태 운전", long: true },
        { key: "warningSigns", label: "초기 경고 신호", placeholder: "예: 괜찮다는 생각, 대리운전 지연, 비용 아까움", long: true },
      ] },
      { title: "구체적인 실천계획", fields: [
        { key: "alternatives", label: "대체 이동수단", placeholder: "대리운전, 택시, 대중교통, 가족 연락 등", long: true },
        { key: "support", label: "주변 확인 체계", placeholder: "누구에게 어떤 방식으로 도움을 요청할지 적어 주세요.", long: true },
      ] },
      { title: "최종 확인", fields: [
        { key: "review", label: "월별 점검 방법", placeholder: "한 달에 몇 번, 무엇을 점검할지 작성해 주세요.", long: true },
      ] },
    ],
  },
  {
    key: "drinking-action-plan",
    title: "음주예방실천계획서",
    fileName: "04_음주예방실천계획서.pdf",
    sections: [
      { title: "위험상황 확인", fields: [
        { key: "drinkingPattern", label: "현재 음주 습관", placeholder: "음주 빈도, 주된 상황, 평균 음주량을 적어 주세요.", long: true },
      ] },
      { title: "구체적인 실천계획", fields: [
        { key: "limits", label: "음주 전 기준", placeholder: "차량을 가져가지 않는 기준, 음주량 제한, 귀가 시간을 적어 주세요.", long: true },
        { key: "afterDrinking", label: "음주 후 행동 기준", placeholder: "운전하지 않기 위해 즉시 실행할 행동을 적어 주세요.", long: true },
      ] },
      { title: "최종 확인", fields: [
        { key: "checklist", label: "실천 점검 항목", placeholder: "반복 확인할 항목을 3개 이상 작성해 주세요.", long: true },
      ] },
    ],
  },
  {
    key: "pledge",
    title: "음주운전 재발방지 서약서",
    fileName: "05_음주운전_재발방지_서약서.pdf",
    sections: [
      { title: "위험상황 확인", fields: [
        { key: "risk", label: "다시 운전하지 않기 위해 피해야 할 상황", placeholder: "술자리, 숙취, 차량 동행 등 본인의 위험상황을 적어 주세요.", long: true },
      ] },
      { title: "구체적인 실천계획", fields: [
        { key: "pledges", label: "서약사항", placeholder: "앞으로 지킬 구체적인 서약을 작성해 주세요.", long: true },
      ] },
      { title: "최종 확인 및 서약", fields: [
        { key: "signature", label: "서약 문구", placeholder: "위 내용을 확인하고 음주 후 운전하지 않을 것을 본인 문장으로 작성해 주세요.", long: true },
      ] },
    ],
  },
];

const printStyles = `
@page { size: A4; margin: 14mm; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden !important; }
  .education-print-root, .education-print-root * { visibility: visible !important; }
  .education-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; background: #fff !important; }
  .no-print { display: none !important; }
  .print-document { break-before: page; page-break-before: always; width: 100% !important; min-height: 267mm !important; box-shadow: none !important; border: 0 !important; }
  .print-document:first-child { break-before: auto; page-break-before: auto; }
  .print-avoid { break-inside: avoid; page-break-inside: avoid; }
}
`;

function toDate(value: TimestampLike) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && "seconds" in value) return new Date(value.seconds * 1000);
  return null;
}

function formatDate(value: TimestampLike) {
  const date = toDate(value);
  return date ? date.toLocaleDateString("ko-KR") : "";
}

function formatKoreanDate(value: TimestampLike = new Date()) {
  const date = toDate(value) || new Date();
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(date.getDate()).padStart(2, "0")}일`;
}

function getCertificateRecordId(uid: string, courseId: string, documentType: string) {
  return documentType && documentType !== "completion" ? `${uid}_${courseId}_${documentType}` : `${uid}_${courseId}`;
}

function getLevel(enrollment: EnrollmentRecord): PlanLevel | null {
  const withPlan = enrollment as EnrollmentWithPlanFields;
  const raw = `${enrollment.productId || ""} ${withPlan.planId || ""} ${withPlan.courseLevel || ""} ${enrollment.productTitle || ""}`.toLowerCase();
  if (raw.includes("dui-cbt-advanced") || raw.includes("premium") || raw.includes("advanced") || raw.includes("심화")) return "PREMIUM";
  if (raw.includes("dui-documents") || raw.includes("basic") || raw.includes("기본")) return "BASIC";
  if (Number(enrollment.amount || 0) >= 99000) return "PREMIUM";
  if (Number(enrollment.amount || 0) >= 49000) return "BASIC";
  return null;
}

function isDuiSalesEnrollment(enrollment: EnrollmentRecord) {
  const text = `${enrollment.productId || ""} ${enrollment.courseId || ""} ${enrollment.canonicalCourseId || ""} ${enrollment.productTitle || ""} ${enrollment.courseTitle || ""}`;
  return text.includes("dui") || text.includes("음주운전") || enrollment.productId === "dui-documents";
}

function getProgressRate(progress: ProgressRecord | null | undefined) {
  if (!progress) return 0;
  if (typeof progress.completionRate === "number") return Math.max(0, Math.min(100, Math.round(progress.completionRate)));
  return progress.isCompleted ? 100 : 0;
}

function getWritingStatus(values: Record<string, string>, complete: boolean): WritingStatus {
  if (complete) return "작성완료";
  return Object.values(values).some((value) => value.trim()) ? "작성중" : "작성 전";
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function createPdfFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const objects: Array<string | Uint8Array> = [];
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ`;
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  objects[3] = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  objects[4] = concatUint8Arrays([encoder.encode(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`), jpegBytes, encoder.encode("\nendstream\nendobj\n")]);
  objects[5] = `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let length = parts[0].length;
  for (let index = 1; index <= 5; index += 1) {
    offsets[index] = length;
    const part = typeof objects[index] === "string" ? encoder.encode(objects[index] as string) : objects[index] as Uint8Array;
    parts.push(part);
    length += part.length;
  }
  const xrefOffset = length;
  parts.push(encoder.encode(["xref", "0 6", "0000000000 65535 f ", ...offsets.slice(1).map((offset) => String(offset).padStart(10, "0") + " 00000 n "), "trailer", "<< /Size 6 /Root 1 0 R >>", "startxref", String(xrefOffset), "%%EOF", ""].join("\n")));
  const bytes = concatUint8Arrays(parts);
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: "application/pdf" });
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ name: string; bytes: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const write16 = (view: DataView, pos: number, value: number) => view.setUint16(pos, value, true);
  const write32 = (view: DataView, pos: number, value: number) => view.setUint32(pos, value, true);

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write32(localView, 14, crc);
    write32(localView, 18, file.bytes.length);
    write32(localView, 22, file.bytes.length);
    write16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30);
    localParts.push(local, file.bytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write16(centralView, 10, 0);
    write32(centralView, 16, crc);
    write32(centralView, 20, file.bytes.length);
    write32(centralView, 24, file.bytes.length);
    write16(centralView, 28, nameBytes.length);
    write32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + file.bytes.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 8, files.length);
  write16(endView, 10, files.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, centralOffset);
  const bytes = concatUint8Arrays([...localParts, ...centralParts, end]);
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: "application/zip" });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function IssuePaper({ document, certificate, profileName, profileBirthDate }: { document: IssueDocument; certificate?: CertificateRecord | null; profileName: string; profileBirthDate: string }) {
  const certificateNo = certificate?.certificateNo || certificate?.issueNumber || "발급 전";
  const isDetail = document.documentType === "cbt-detail";
  const heading = isDetail ? "교육이수 상세 내역서" : document.documentType === "cbt-completion" ? "인지행동기반 재발방지교육 이수증" : "수료증";
  const courseTitle = document.documentType === "completion" ? "음주운전 재범방지교육 기본과정" : "인지행동기반 재발방지교육";
  return (
    <article className="print-document relative mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-white px-[16mm] py-[18mm] text-slate-950 shadow-sm ring-1 ring-slate-200">
      <img src={centerLogoPath} alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-[112mm] w-[112mm] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.055]" />
      <div className="relative z-10 flex min-h-[260mm] flex-col border-2 border-[#d9c08a] px-8 py-9 text-center">
        <p className="text-left text-xs font-semibold text-slate-600">발급번호: {certificateNo}</p>
        <h2 className="mt-10 text-4xl font-bold tracking-[0.16em]">{heading}</h2>
        <div className="mx-auto mt-12 w-full max-w-[620px] space-y-3 text-left text-lg leading-8">
          <p><span className="font-bold text-[#5f4514]">성명:</span> {certificate?.userName || profileName || "회원정보 확인 필요"}</p>
          <p><span className="font-bold text-[#5f4514]">생년월일:</span> {certificate?.birthDate || profileBirthDate || "회원정보 확인 필요"}</p>
          <p><span className="font-bold text-[#5f4514]">교육과정명:</span> {courseTitle}</p>
        </div>
        <p className="mx-auto mt-12 max-w-[620px] break-keep text-left text-xl leading-10 text-slate-800">
          {isDetail ? "위 사람은 리셋에듀센터에서 운영하는 재범방지 교육과정을 이수하였으며, 교육 이수 상세 내역을 아래와 같이 확인합니다." : `위 사람은 본 기관에서 운영하는 「${courseTitle}」을 성실히 이수하였기에 이 증서를 수여합니다.`}
        </p>
        {isDetail ? <ul className="mx-auto mt-8 grid max-w-[620px] gap-2 rounded-lg border border-[#d9c08a] bg-[#fffaf0] p-5 text-left text-sm font-semibold leading-6"><li>온라인 재범방지교육 이수</li><li>인지행동기반 재발방지교육 이수</li><li>재발방지 위험상황 점검 및 실천계획 학습</li></ul> : null}
        <div className="mt-auto pt-14">
          <p className="text-lg font-semibold">{formatKoreanDate(certificate?.issuedAt || certificate?.certificateIssuedAt || certificate?.completedAt)}</p>
          <div className="mt-8 flex items-center justify-center gap-5"><p className="text-3xl font-bold tracking-[0.08em]">리셋에듀센터</p><img src={sealStampPath} alt="직인" className="h-[30mm] w-[30mm] object-contain" /></div>
        </div>
      </div>
    </article>
  );
}

function WritingPaper({ document, values, profileName, profileBirthDate }: { document: WritingDocument; values: Record<string, string>; profileName: string; profileBirthDate: string }) {
  return (
    <article className="print-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[16mm] py-[18mm] text-slate-950 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-center text-3xl font-bold tracking-[0.08em]">{document.title}</h2>
      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-950">본 자료는 회원이 직접 작성한 내용을 기준으로 생성됩니다.</p>
      <section className="print-avoid mt-8 grid gap-2 text-[15px] leading-7 sm:grid-cols-2">
        <p><span className="font-bold">성명:</span> {profileName || "회원정보 확인 필요"}</p>
        <p><span className="font-bold">생년월일:</span> {profileBirthDate || "회원정보 확인 필요"}</p>
        <p><span className="font-bold">작성일:</span> {formatKoreanDate()}</p>
      </section>
      <div className="mt-8 space-y-7">
        {document.sections.map((section, sectionIndex) => (
          <section key={section.title} className="print-avoid">
            <h3 className="border-b border-slate-300 pb-2 text-lg font-black">{sectionIndex + 1}. {section.title}</h3>
            <div className="mt-4 space-y-4 text-[15px] leading-8">
              {section.fields.map((field) => <div key={field.key}><p className="font-bold text-slate-900">{field.label}</p><p className="mt-1 min-h-14 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">{values[field.key]?.trim() || "작성 전"}</p></div>)}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 text-[15px]"><p>작성자: {profileName || "__________"}</p><p>서명: __________</p></div>
    </article>
  );
}

function EducationDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uid, setUid] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [options, setOptions] = useState<CourseOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [progressRows, setProgressRows] = useState<ProgressRecord[]>([]);
  const [certificates, setCertificates] = useState<Record<string, CertificateRecord>>({});
  const [activeEditor, setActiveEditor] = useState(writingDocuments[0].key);
  const [drafts, setDrafts] = useState<Record<string, { values: Record<string, string>; complete: boolean; updatedAt?: string }>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [modal, setModal] = useState<null | { type: "zip" | "print"; missing: string[]; printable: string[] }>(null);
  const [busy, setBusy] = useState("");
  const printRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const { db } = getFirebaseServices();
        const adminPreview = isSuperAdmin(user);
        const [profile, enrollments] = await Promise.all([
          getUserProfile(user.uid).catch(() => null),
          adminPreview ? Promise.resolve([]) : getVerifiedActiveUserEnrollments(user),
        ]);
        const activeOptions: CourseOption[] = adminPreview
          ? [
              { key: "admin-basic", level: "BASIC" as const, enrollment: { userId: user.uid, courseId: defaultCourse.id, courseTitle: "음주운전 재범방지교육 기본과정", productId: "dui-documents", productTitle: "기본과정", paymentStatus: "paid", enrollmentStatus: "active" as const } },
              { key: "admin-premium", level: "PREMIUM" as const, enrollment: { userId: user.uid, courseId: DUI_CBT_ADVANCED_COURSE_ID, courseTitle: "음주운전 재범방지교육 심화과정", productId: "dui-cbt-advanced", productTitle: "심화과정", paymentStatus: "paid", enrollmentStatus: "active" as const } },
            ]
          : enrollments.filter((item) => isEnrollmentActive(item) && isDuiSalesEnrollment(item)).map((enrollment) => {
              const level = getLevel(enrollment);
              return level ? { key: `${level}-${enrollment.productId || enrollment.courseId}`, level, enrollment } : null;
            }).filter(Boolean) as CourseOption[];

        const progressSnapshot = await getDocs(query(collection(db, "courseProgress"), where("uid", "==", user.uid))).catch(() => null);
        const certificateSnapshot = await getDocs(query(collection(db, "certificates"), where("uid", "==", user.uid))).catch(() => null);
        const certificateMap: Record<string, CertificateRecord> = {};
        certificateSnapshot?.docs.forEach((snapshot) => {
          const data = snapshot.data() as Omit<CertificateRecord, "id">;
          certificateMap[snapshot.id] = { id: snapshot.id, ...data };
        });
        if (!certificateMap[getCertificateRecordId(user.uid, defaultCourse.id, "completion")]) {
          const existing = await getDoc(doc(db, "certificates", getCertificateRecordId(user.uid, defaultCourse.id, "completion"))).catch(() => null);
          if (existing?.exists()) certificateMap[existing.id] = { id: existing.id, ...(existing.data() as Omit<CertificateRecord, "id">) };
        }

        if (cancelled) return;
        setUid(user.uid);
        setProfileName(profile?.certificateIdentity?.realName || profile?.realName || profile?.fullName || user.displayName || "");
        setProfileBirthDate(profile?.certificateIdentity?.dateOfBirth || profile?.dateOfBirth || profile?.birthDate || "");
        setOptions(activeOptions);
        setSelectedKey(searchParams.get("course") || activeOptions[0]?.key || "");
        setProgressRows(progressSnapshot?.docs.map((snapshot) => snapshot.data() as ProgressRecord) || []);
        setCertificates(certificateMap);
        if (!activeOptions.length) setError("이용 가능한 교육서류가 없습니다.");
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "";
        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=/education-documents");
          return;
        }
        setError("문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const selected = options.find((option) => option.key === selectedKey) || options[0];
  const issueDocuments = selected ? issueDocumentsByLevel[selected.level] : [];
  const basicProgress = progressRows.find((row) => row.courseId === defaultCourse.id) || progressRows[0] || null;
  const cbtProgress = progressRows.find((row) => row.courseId === DUI_CBT_ADVANCED_COURSE_ID) || null;
  const basicRate = getProgressRate(basicProgress);
  const cbtRate = selected?.level === "PREMIUM" ? getProgressRate(cbtProgress) : 0;
  const basicComplete = basicRate >= 100 || Boolean(basicProgress?.isCompleted) || Boolean(selected?.enrollment.certificateAvailable);
  const cbtComplete = selected?.level === "PREMIUM" ? (cbtRate >= 100 || Boolean(cbtProgress?.isCompleted) || Boolean(selected.enrollment.certificateAvailable)) : false;
  const courseStatus = selected?.level === "PREMIUM"
    ? basicComplete && cbtComplete ? "수료완료" : basicComplete || cbtComplete ? "일부 수료조건 미충족" : "수강중"
    : basicComplete ? "수료완료" : "수강중";
  const storagePrefix = uid && selected ? `resetedu:education-documents:${uid}:${selected.level}` : "";

  useEffect(() => {
    if (!storagePrefix) return;
    const next: typeof drafts = {};
    writingDocuments.forEach((document) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(`${storagePrefix}:${document.key}`) || "{}") as { values?: Record<string, string>; complete?: boolean; updatedAt?: string };
        next[document.key] = { values: parsed.values || {}, complete: parsed.complete === true, updatedAt: parsed.updatedAt };
      } catch {
        next[document.key] = { values: {}, complete: false };
      }
    });
    setDrafts(next);
  }, [storagePrefix]);

  const activeWritingDocument = writingDocuments.find((document) => document.key === activeEditor) || writingDocuments[0];
  const activeDraft = drafts[activeWritingDocument.key] || { values: {}, complete: false };

  const saveDraft = (documentKey: string, values: Record<string, string>, complete = drafts[documentKey]?.complete === true) => {
    if (!storagePrefix) return;
    setSaveStatus("saving");
    const updatedAt = new Date().toISOString();
    const next = { values, complete, updatedAt };
    setDrafts((current) => ({ ...current, [documentKey]: next }));
    window.setTimeout(() => {
      try {
        localStorage.setItem(`${storagePrefix}:${documentKey}`, JSON.stringify(next));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("failed");
      }
    }, 180);
  };

  const renderNodeToPdfBytes = async (node: HTMLElement) => {
    const { default: html2canvas } = await import("html2canvas");
    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    clone.style.width = "210mm";
    clone.style.minHeight = "297mm";
    clone.style.backgroundColor = "#ffffff";
    clone.style.boxShadow = "none";
    document.body.appendChild(clone);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(clone, { backgroundColor: "#ffffff", scale: 2, logging: false, width: clone.offsetWidth, height: clone.offsetHeight, windowWidth: clone.offsetWidth, windowHeight: clone.offsetHeight });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PDF 이미지를 생성하지 못했습니다.")), "image/jpeg", 0.95));
      const pdf = createPdfFromJpeg(new Uint8Array(await blob.arrayBuffer()), canvas.width, canvas.height);
      return new Uint8Array(await pdf.arrayBuffer());
    } finally {
      clone.remove();
    }
  };

  const getPaperByKey = (key: string) => printRootRef.current?.querySelector<HTMLElement>(`[data-print-key="${key}"]`);

  const saveSinglePdf = async (key: string, fileName: string) => {
    setBusy(key);
    try {
      const paper = getPaperByKey(key);
      if (!paper) return;
      const bytes = await renderNodeToPdfBytes(paper);
      downloadBlob(new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], { type: "application/pdf" }), fileName);
    } finally {
      setBusy("");
    }
  };

  const completedPrintables = useMemo(() => {
    const rows: Array<{ key: string; fileName: string; title: string }> = [];
    issueDocuments.forEach((document) => {
      const ready = document.requires === "basic" ? basicComplete : cbtComplete;
      const cert = certificates[getCertificateRecordId(uid, document.courseId, document.documentType)];
      if (ready && (cert?.certificateNo || cert?.issueNumber)) rows.push({ key: document.key, fileName: document.fileName, title: document.title });
    });
    writingDocuments.forEach((document) => {
      const draft = drafts[document.key];
      const status = getWritingStatus(draft?.values || {}, draft?.complete === true);
      if (status !== "작성 전") rows.push({ key: document.key, fileName: document.fileName, title: document.title });
    });
    return rows;
  }, [basicComplete, cbtComplete, certificates, drafts, issueDocuments, uid]);

  const missingWriting = writingDocuments.filter((document) => getWritingStatus(drafts[document.key]?.values || {}, drafts[document.key]?.complete === true) === "작성 전").map((document) => document.title);

  const startZip = () => setModal({ type: "zip", missing: missingWriting, printable: completedPrintables.map((item) => item.title) });
  const startPrint = () => setModal({ type: "print", missing: [], printable: completedPrintables.map((item) => item.title) });

  const runZip = async () => {
    if (!selected) return;
    setBusy("zip");
    try {
      const files = [];
      for (const item of completedPrintables) {
        const paper = getPaperByKey(item.key);
        if (paper) files.push({ name: item.fileName, bytes: await renderNodeToPdfBytes(paper) });
      }
      const zipName = selected.level === "PREMIUM" ? "리셋에듀_음주운전_심화과정_교육서류.zip" : "리셋에듀_음주운전_기본과정_교육서류.zip";
      if (files.length) downloadBlob(createZip(files), zipName);
      setModal(null);
    } finally {
      setBusy("");
    }
  };

  const runPrint = () => {
    setModal(null);
    window.setTimeout(() => window.print(), 120);
  };

  if (loading) return <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950">내 교육서류를 불러오는 중입니다.</main>;

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 pb-28 pt-6 text-slate-950 sm:px-6 lg:px-8">
      <style>{printStyles}</style>
      <div className="mx-auto max-w-7xl">
        <section className="no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#173968]">My Documents</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">내 교육서류</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">수강한 과정에 포함된 수료증과 작성자료를 한곳에서 확인하고 PDF로 저장하거나 인쇄할 수 있습니다.</p>
            </div>
            <Link href="/dashboard" className={buttonClass("secondary", "sm", "w-fit rounded-full px-4 font-bold")}>마이페이지</Link>
          </div>

          {error ? <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</p> : null}

          {selected ? (
            <>
              {options.length > 1 ? (
                <label className="mt-5 block max-w-md text-sm font-bold text-slate-700">
                  과정 선택
                  <select value={selected.key} onChange={(event) => setSelectedKey(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold text-slate-950">
                    {options.map((option) => <option key={option.key} value={option.key}>음주운전 재범방지교육 · {option.level === "PREMIUM" ? "심화과정" : "기본과정"}</option>)}
                  </select>
                </label>
              ) : null}

              <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black">{selected.level === "PREMIUM" ? "심화과정" : "기본과정"}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{selected.level === "PREMIUM" ? "가장 많이 선택하는 과정" : "부담 없이 시작하는 기본 과정"}</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">과정 상태</p><p className="mt-1 text-lg font-black">{courseStatus}</p></div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">온라인 재범방지교육</p><p className="mt-1 text-lg font-black">{basicRate}% · {basicComplete ? "완료" : "수강중"}</p></div>
                      {selected.level === "PREMIUM" ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">인지행동기반 재발방지교육</p><p className="mt-1 text-lg font-black">{cbtRate}% · {cbtComplete ? "완료" : "수강중"}</p></div> : null}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">이용 가능한 서류 및 자료</p><p className="mt-1 text-lg font-black">{selected.level === "PREMIUM" ? "7종" : "5종"}</p></div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
                    <button type="button" onClick={startZip} disabled={!completedPrintables.length || busy === "zip"} className={buttonClass("primary", "md", "min-h-12 rounded-lg px-5 font-black disabled:opacity-60")}>{busy === "zip" ? "저장 중" : "전체 PDF 저장"}</button>
                    <button type="button" onClick={startPrint} disabled={!completedPrintables.length} className={buttonClass("secondary", "md", "min-h-12 rounded-lg px-5 font-black disabled:opacity-60")}>전체 인쇄</button>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <div><h2 className="text-xl font-black">발급서류</h2><p className="mt-1 text-sm text-slate-600">수료증과 이수서류는 실제 수료기록을 기준으로 발급됩니다.</p></div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {issueDocuments.map((document) => {
                    const ready = document.requires === "basic" ? basicComplete : cbtComplete;
                    const cert = certificates[getCertificateRecordId(uid, document.courseId, document.documentType)];
                    const certNo = cert?.certificateNo || cert?.issueNumber;
                    return (
                      <article key={document.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-lg font-black">{document.title}</h3>
                        <p className="mt-2 text-sm font-bold text-slate-600">{ready ? certNo ? "발급 완료 · 발급 가능" : "수료완료 · 발급 가능" : `${document.requires === "basic" ? "현재 진도율 " + basicRate + "%" : "인지행동기반 교육 진도율 " + cbtRate + "%"} · 교육 완료 후 발급할 수 있습니다.`}</p>
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-bold text-slate-500">발급번호</p>
                          <p className="mt-1 break-all font-black text-slate-950">{certNo || "발급 전"} {certNo ? <button type="button" onClick={() => void navigator.clipboard?.writeText(certNo)} className="ml-2 rounded border border-slate-300 px-2 py-1 text-xs font-bold">복사</button> : null}</p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link aria-disabled={!ready} href={ready ? `/certificate?courseId=${encodeURIComponent(document.courseId)}&documentType=${encodeURIComponent(document.documentType)}&pdf=1` : "#"} className={buttonClass(ready ? "primary" : "secondary", "sm", "min-h-11 rounded-lg px-3 font-black " + (!ready ? "pointer-events-none opacity-50" : ""))}>PDF 저장</Link>
                          <Link aria-disabled={!ready} href={ready ? `/certificate?courseId=${encodeURIComponent(document.courseId)}&documentType=${encodeURIComponent(document.documentType)}&print=1` : "#"} className={buttonClass("secondary", "sm", "min-h-11 rounded-lg px-3 font-black " + (!ready ? "pointer-events-none opacity-50" : ""))}>인쇄</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-black">작성자료</h2>
                <p className="mt-1 text-sm text-slate-600">작성자료는 회원이 직접 작성한 내용을 기준으로 PDF가 생성됩니다.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {writingDocuments.map((document) => {
                    const draft = drafts[document.key] || { values: {}, complete: false };
                    const status = getWritingStatus(draft.values, draft.complete);
                    return (
                      <article key={document.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-lg font-black">{document.title}</h3>
                        <p className="mt-2 text-sm font-bold text-slate-600">{status}</p>
                        <p className="mt-1 min-h-6 text-xs font-semibold text-slate-500">{draft.updatedAt ? `마지막 저장 ${formatDate(draft.updatedAt)}` : "저장된 작성내용 없음"}</p>
                        <div className="mt-4 grid gap-2">
                          <button type="button" onClick={() => setActiveEditor(document.key)} className={buttonClass("primary", "sm", "min-h-11 rounded-lg px-3 font-black")}>{status === "작성 전" ? "작성하기" : status === "작성중" ? "이어서 작성" : "수정"}</button>
                          {status !== "작성 전" ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void saveSinglePdf(document.key, document.fileName)} disabled={busy === document.key} className={buttonClass("secondary", "sm", "min-h-11 rounded-lg px-3 font-black disabled:opacity-60")}>PDF 저장</button><button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm", "min-h-11 rounded-lg px-3 font-black")}>인쇄</button></div> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1fr)]">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">{activeWritingDocument.title}</h2>
                      <p className="mt-1 text-sm font-bold text-slate-600">작성 진행률 {Math.round((Object.values(activeDraft.values).filter((value) => value.trim()).length / activeWritingDocument.sections.flatMap((section) => section.fields).length) * 100)}%</p>
                    </div>
                    <p className="text-sm font-bold text-slate-500">{saveStatus === "saving" ? "저장 중" : saveStatus === "failed" ? "저장 실패" : saveStatus === "saved" ? "저장 완료" : "자동저장 대기"}</p>
                  </div>
                  <div className="mt-4 space-y-4">
                    {activeWritingDocument.sections.map((section) => (
                      <section key={section.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-black">{section.title}</h3>
                        <div className="mt-3 grid gap-3">
                          {section.fields.map((field) => (
                            <label key={field.key} className="text-sm font-bold text-slate-700">
                              {field.label}
                              <textarea value={activeDraft.values[field.key] || ""} onChange={(event) => saveDraft(activeWritingDocument.key, { ...activeDraft.values, [field.key]: event.target.value })} placeholder={field.placeholder} className="mt-2 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-base font-medium leading-7 text-slate-950 outline-none focus:border-[#173968] focus:ring-4 focus:ring-[#173968]/15" />
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="sticky bottom-20 mt-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:grid-cols-2 lg:bottom-4">
                    <button type="button" onClick={() => saveDraft(activeWritingDocument.key, activeDraft.values)} className={buttonClass("secondary", "md", "min-h-12 rounded-lg px-5 font-black")}>임시저장</button>
                    <button type="button" onClick={() => { saveDraft(activeWritingDocument.key, activeDraft.values, true); void saveSinglePdf(activeWritingDocument.key, activeWritingDocument.fileName); }} className={buttonClass("primary", "md", "min-h-12 rounded-lg px-5 font-black")}>작성완료 및 PDF 저장</button>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-black">PDF 미리보기</h2>
                  <div className="mt-4 max-h-[680px] overflow-auto rounded-lg bg-slate-100 p-3">
                    <div className="scale-[0.45] origin-top-left sm:scale-[0.58] lg:scale-[0.5]">
                      <WritingPaper document={activeWritingDocument} values={activeDraft.values} profileName={profileName} profileBirthDate={profileBirthDate} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 shadow-sm">
                <h2 className="text-base font-black text-slate-950">이용안내</h2>
                <p className="mt-2">기본과정 수료증, 인지행동기반 재발방지교육 이수증, 재범방지 교육 이수 상세 내역서는 고유 발급번호로 관리됩니다.</p>
                <p>문서를 불러오지 못한 경우 잠시 후 다시 시도해 주세요. 문서 발급을 위해 회원정보 확인이 필요한 경우 회원정보를 먼저 확인해 주세요.</p>
              </section>
            </>
          ) : null}
        </section>

        <div ref={printRootRef} className="education-print-root fixed left-[-10000px] top-0 print:static print:mt-0">
          {issueDocuments.map((document) => {
            const ready = document.requires === "basic" ? basicComplete : cbtComplete;
            const certificate = certificates[getCertificateRecordId(uid, document.courseId, document.documentType)];
            const hasIssueNumber = Boolean(certificate?.certificateNo || certificate?.issueNumber);
            return ready && hasIssueNumber ? <div key={document.key} data-print-key={document.key}><IssuePaper document={document} certificate={certificate} profileName={profileName} profileBirthDate={profileBirthDate} /></div> : null;
          })}
          {writingDocuments.map((document) => {
            const draft = drafts[document.key] || { values: {}, complete: false };
            return getWritingStatus(draft.values, draft.complete) !== "작성 전" ? <div key={document.key} data-print-key={document.key}><WritingPaper document={document} values={draft.values} profileName={profileName} profileBirthDate={profileBirthDate} /></div> : null;
          })}
        </div>
      </div>

      {selected ? <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] lg:hidden"><button type="button" onClick={startZip} disabled={!completedPrintables.length || busy === "zip"} className={buttonClass("primary", "md", "min-h-12 w-full rounded-lg px-5 font-black disabled:opacity-60")}>전체 PDF 저장</button></div> : null}

      {modal ? (
        <div className="no-print fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-black">{modal.type === "zip" ? "전체 PDF 저장" : "전체 인쇄"}</h2>
            {modal.missing.length ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-950"><p className="font-black">아직 작성되지 않은 자료가 {modal.missing.length}개 있습니다.</p><ul className="mt-1 list-disc pl-5">{modal.missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            <div className="mt-4 text-sm leading-7 text-slate-700">
              <p className="font-black text-slate-950">대상 문서</p>
              <ul className="mt-1 list-disc pl-5">{modal.printable.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setModal(null)} className={buttonClass("secondary", "md", "min-h-12 rounded-lg px-5 font-black")}>{modal.missing.length ? "자료 작성하기" : "취소"}</button>
              <button type="button" onClick={() => modal.type === "zip" ? void runZip() : runPrint()} disabled={busy === "zip"} className={buttonClass("primary", "md", "min-h-12 rounded-lg px-5 font-black disabled:opacity-60")}>{modal.type === "zip" && modal.missing.length ? "미작성 자료 제외하고 저장" : modal.type === "zip" ? "저장" : "인쇄"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function EducationDocumentsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950">내 교육서류를 준비하는 중입니다.</main>}><EducationDocumentsContent /></Suspense>;
}
