"use client";

import { useState } from "react";

type MobileDocumentItem = {
  title: string;
  label?: string;
  imageSrc?: string;
  privateNotice?: string;
};

type MobileDocumentCarouselProps = {
  documents: readonly MobileDocumentItem[];
};

function DocumentPreviewSurface({ document, priority = false }: { document: MobileDocumentItem; priority?: boolean }) {
  if (!document.imageSrc) {
    return (
      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-white p-4 text-center">
        <div className="relative h-12 w-9 border-2 border-[#173968] bg-white shadow-sm">
          <span className="absolute right-0 top-0 h-3 w-3 border-b border-l border-[#d7deea] bg-[#eef4fb]" />
          <span className="absolute left-1.5 right-1.5 top-5 h-0.5 bg-slate-300" />
          <span className="absolute left-1.5 right-1.5 top-7 h-0.5 bg-slate-200" />
        </div>
        <p className="mt-3 text-sm font-black leading-5 text-slate-950">이미지 비공개</p>
        <p className="mt-1 max-w-[8.5rem] break-keep text-[11px] font-bold leading-4 text-slate-600">{document.privateNotice || "개인정보 및 상담내용 보호를 위해 예시 이미지는 공개하지 않습니다."}</p>
        <span className="mt-2 border border-[#d3b271] bg-[#fffaf0] px-2 py-0.5 text-[10px] font-black text-[#5f4514]">보안 자료</span>
      </div>
    );
  }

  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center border border-slate-200 bg-[#f8fafc] p-2">
      <img
        src={document.imageSrc}
        alt={document.title + " 예시"}
        width={520}
        height={690}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function DocumentCard({ document, index, onSelect }: { document: MobileDocumentItem; index: number; onSelect: (document: MobileDocumentItem) => void }) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => onSelect(document)} className="block w-full p-2 text-left" aria-label={document.title + " 확대 보기"}>
        <DocumentPreviewSurface document={document} priority={index < 2} />
      </button>
      <div className="flex min-h-[74px] flex-col justify-between border-t border-slate-200 px-3 py-3">
        <p className="break-keep text-sm font-black leading-5 text-slate-950">{document.title}</p>
        {document.label ? <p className="mt-1 break-keep text-[11px] font-black leading-4 text-[#176b68]">{document.label}</p> : <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">기본 수료과정 제공</p>}
      </div>
    </article>
  );
}

function PreventionDocumentBundleCard({ documents, startIndex, onSelect }: { documents: readonly MobileDocumentItem[]; startIndex: number; onSelect: (document: MobileDocumentItem) => void }) {
  return (
    <article className="col-span-2 overflow-hidden rounded-lg border-2 border-[#173968] bg-white shadow-[0_14px_30px_rgba(23,57,104,0.14)]">
      <div className="flex items-center justify-between bg-[#173968] px-3 py-2 text-white">
        <span className="text-[11px] font-black">중요 제출자료</span>
        <span className="text-[10px] font-bold text-[#dbeafe]">기본 수료과정 제공</span>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-[#f8fafc] p-2">
        {documents.map((document, index) => (
          <button key={document.title} type="button" onClick={() => onSelect(document)} className="min-w-0 text-left" aria-label={document.title + " 확대 보기"}>
            <DocumentPreviewSurface document={document} priority={startIndex + index < 2} />
            <p className="mt-2 break-keep text-center text-[11px] font-black leading-4 text-slate-700">{document.title}</p>
          </button>
        ))}
      </div>
      <div className="min-h-[92px] px-3 py-3">
        <p className="break-keep text-sm font-black leading-5 text-slate-950">재발방지계획서 등 3종세트</p>
        <p className="mt-1 break-keep text-[11px] font-bold leading-4 text-[#173968]">단순히 형식을 갖춘 제출자료가 아닙니다. 모든 제공자료는 각 교육과정의 핵심 내용과 재범방지 실천요소를 충실히 반영하여 과정별 특성에 맞게 구성됩니다.</p>
      </div>
    </article>
  );
}

export default function MobileDocumentCarousel({ documents }: MobileDocumentCarouselProps) {
  const [selected, setSelected] = useState<MobileDocumentItem | null>(null);
  const officialDocuments = documents.slice(0, 4);
  const confidentialDocuments = documents.slice(4, 6);
  const preventionPackDocuments = documents.slice(6);

  return (
    <>
      <div className="mt-5 border border-slate-200 bg-[#f8fafc] p-3">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3" aria-label="과정별 제공자료 구분">
          {["기본 수료", "심화이수", "심리상담 종합"].map((label) => <span key={label} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700">{label}</span>)}
        </div>

        <div className="mt-4">
          <h3 className="text-base font-black text-slate-950">주요 발급자료</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 min-[360px]:gap-3.5">
            {officialDocuments.map((document, index) => <DocumentCard key={document.title} document={document} index={index} onSelect={setSelected} />)}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-black text-slate-950">추가 제공자료</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 min-[360px]:gap-3.5">
            {confidentialDocuments.map((document, index) => <DocumentCard key={document.title} document={document} index={officialDocuments.length + index} onSelect={setSelected} />)}
            <PreventionDocumentBundleCard documents={preventionPackDocuments} startIndex={officialDocuments.length + confidentialDocuments.length} onSelect={setSelected} />
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/75 px-3 py-5" role="dialog" aria-modal="true" aria-label={selected.title + " 확대 미리보기"}>
          <div className="max-h-full w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h3 className="break-keep text-base font-black text-slate-950">{selected.title}</h3>
              <button type="button" onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-black text-slate-700" aria-label="확대 미리보기 닫기">x</button>
            </div>
            <div className="max-h-[78vh] overflow-auto bg-slate-100 p-3">
              {selected.imageSrc ? <img src={selected.imageSrc} alt={selected.title + " 확대 예시"} className="mx-auto w-full max-w-2xl border border-slate-200 bg-white object-contain" /> : <DocumentPreviewSurface document={selected} />}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
