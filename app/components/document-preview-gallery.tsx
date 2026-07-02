"use client";

import { useState } from "react";

export type DocumentPreviewItem = {
  id: string;
  title: string;
  products: string[];
  description: string;
  imageSrc: string;
  statusLabel?: string;
};

type DocumentPreviewGalleryProps = {
  documents: DocumentPreviewItem[];
  columnsClassName?: string;
};

export default function DocumentPreviewGallery({ documents, columnsClassName = "md:grid-cols-2 xl:grid-cols-3" }: DocumentPreviewGalleryProps) {
  const [selected, setSelected] = useState<DocumentPreviewItem | null>(null);

  return (
    <>
      <div className={`grid gap-4 ${columnsClassName}`}>
        {documents.map((document) => (
          <article key={document.id} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
            <div className="relative h-52 overflow-hidden bg-slate-100">
              <img src={document.imageSrc} alt={`${document.title} 예시 문서 일부`} className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-white/0" />
              {document.statusLabel ? <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#173968] shadow-sm">{document.statusLabel}</span> : null}
            </div>
            <div className="p-5">
              <h3 className="break-keep text-lg font-black text-[#06101b]">{document.title}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {document.products.map((product) => (
                  <span key={product} className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-black text-[#173968]">{product}</span>
                ))}
              </div>
              <p className="mt-3 min-h-[72px] break-keep text-sm leading-6 text-slate-700">{document.description}</p>
              <button type="button" onClick={() => setSelected(document)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-[#173968] bg-[#173968] px-4 text-sm font-black text-white transition hover:bg-[#10213f]">
                미리보기
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6" role="dialog" aria-modal="true" aria-label={`${selected.title} 미리보기`}>
          <div className="max-h-full w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b6a33]">Sample Preview</p>
                <h3 className="mt-1 break-keep text-xl font-black text-slate-950">{selected.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">개인정보가 마스킹된 예시 문서입니다. 실제 발급 문서는 수강자 정보와 이수 기록에 맞춰 생성됩니다.</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-black text-slate-700 transition hover:bg-slate-100" aria-label="미리보기 닫기">
                x
              </button>
            </div>
            <div className="max-h-[72vh] overflow-auto bg-slate-100 p-4 sm:p-6">
              <img src={selected.imageSrc} alt={`${selected.title} 예시 문서 확대`} className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
