"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getVerifiedUserEnrollments, isEnrollmentActive } from "@/lib/course/enrollment-service";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackEvent } from "@/lib/analytics/ga";
import {
  buildDocumentIdentity,
  getPreventionDocument,
  getPreventionDocumentCategoryFromCourseId,
  getPreventionDocumentsApplyHref,
  getPreventionDocumentsForCategory,
  hasPreventionDocumentsAccess,
  preventionDocumentCategoryLabels,
  type PreventionDocumentCategory,
  type PreventionDocumentIdentity,
  type PreventionDocumentKind,
} from "@/lib/course/prevention-documents";
import { centerLogoPath } from "@/app/components/SealStamp";

const blank = "____________";
const exampleNotice = "본 서식은 참고용 작성 서식입니다. 그대로 제출하기보다 반드시 본인의 실제 사건 경위, 생활환경, 반성 내용, 재발방지 실천계획에 맞게 자필로 수정·보완하여 작성해 주세요.";
const printStyles = "@page { size: A4; margin: 14mm; } .document-watermark { opacity: 0.055; } @media print { html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .document-print-area, .document-print-area * { visibility: visible !important; } .document-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } .document-paper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; outline: 0 !important; --tw-ring-shadow: 0 0 #0000 !important; } .document-watermark { opacity: 0.06 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .no-print { display: none !important; } .document-paper section { break-inside: avoid; page-break-inside: avoid; } .document-paper h1 { margin-top: 0 !important; } }";

type DocumentSection = { title: string; paragraphs?: string[]; items?: string[]; table?: string[] };
type DocumentContent = { heading: string; purpose: string[]; sections: DocumentSection[]; closing: string[]; signatureLabel?: string; extraSignature?: boolean };
type CourseDocumentPack = Record<PreventionDocumentKind, DocumentContent>;

function Line({ label, value }: { label: string; value?: string }) {
  return <p><span className="font-semibold">{label}:</span> <span>{value?.trim() || blank}</span></p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7 break-inside-avoid"><h2 className="text-lg font-bold text-slate-950">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-8 text-slate-800">{children}</div></section>;
}

function Signature({ label = "작성자", extra }: { label?: string; extra?: boolean }) {
  return <><div className="mt-8 grid grid-cols-2 gap-4 text-[15px]"><p>{label}: {blank}</p><p>서명: {blank}</p></div>{extra ? <div className="mt-6 grid grid-cols-3 gap-4 text-[15px]"><p>확인자: {blank}</p><p>서명: {blank}</p><p>관계: {blank}</p></div> : null}</>;
}

const packs: Record<PreventionDocumentCategory, CourseDocumentPack> = {
  dui: {
    "prevention-plan": { heading: "재발방지계획서", purpose: ["본인은 음주운전이 단순한 실수나 순간적 판단 착오가 아니라 타인의 생명과 안전을 위협할 수 있는 중대한 위법행위임을 깨달았습니다.", "본 계획서는 음주 습관, 이동수단, 주변 확인 체계, 생활 관리 방안을 구체적으로 정리해 같은 잘못을 반복하지 않기 위해 작성합니다."], sections: [{ title: "재발 원인 분석", items: ["음주 전 귀가 방법을 미리 정하지 않았습니다.", "술이 깼다고 스스로 과신했습니다.", "대리운전·택시 이용을 비용이나 번거로움으로 가볍게 생각했습니다.", "가족이나 지인의 제지를 받을 수 있는 확인 체계를 만들지 않았습니다."] }, { title: "구체적인 재발방지계획", items: ["음주 가능성이 있는 날에는 차량을 가져가지 않겠습니다.", "음주 전 대리운전·택시·대중교통 등 귀가 수단을 먼저 정하겠습니다.", "음주 후 가까운 거리라도 운전하지 않겠습니다.", "전날 과음한 경우 숙취 운전 가능성을 고려해 대중교통을 이용하겠습니다.", "가족에게 술자리 장소와 귀가 방법을 공유하고 차량 열쇠 관리를 부탁하겠습니다."] }, { title: "실천 점검 항목", table: ["술자리 전 귀가 방법을 정했는가", "차량을 가져간 날 술을 마시지 않았는가", "음주 후 운전하지 않았는가", "가족 또는 지인에게 귀가 사실을 알렸는가"] }], closing: ["본인은 앞으로 어떠한 상황에서도 음주 후 운전하지 않겠습니다. 말뿐인 반성이 아니라 실제 생활 변화와 반복 점검으로 신뢰를 회복하겠습니다."] },
    "action-plan": { heading: "음주예방실천계획서", purpose: ["본 계획서는 음주운전 재발을 예방하기 위해 음주 습관을 점검하고 음주 상황에서 지켜야 할 실천 기준을 정하기 위해 작성합니다."], sections: [{ title: "현재 음주습관 점검", items: ["음주 빈도: 주 ____회 / 월 ____회", "주된 음주 상황: 회식, 지인 모임, 혼술, 경조사, 기타 ____________", "평균 음주량: 소주 ____병 / 맥주 ____잔 / 기타 ____________", "음주 후 귀가 방법: 자가용, 택시, 대리운전, 대중교통, 기타 ____________"] }, { title: "음주 예방 실천 원칙", items: ["차량을 가져간 날에는 술을 마시지 않겠습니다.", "술을 마실 가능성이 있으면 차량을 가져가지 않겠습니다.", "술자리 참석 전 음주량과 귀가 시간을 정하겠습니다.", "대리운전 앱과 택시 앱의 결제수단을 미리 등록하겠습니다."] }, { title: "실천 점검표", table: ["정한 음주량을 지켰는가", "음주 후 이동수단을 미리 확보했는가", "음주 기록을 작성했는가"] }], closing: ["본인은 음주 전 계획, 음주 중 절제, 음주 후 이동수단 확보를 생활화하겠습니다."] },
    pledge: { heading: "음주운전 재발방지 서약서", purpose: ["본인은 음주운전이 타인의 생명과 신체에 중대한 피해를 줄 수 있는 위험한 행위임을 깊이 인식하고, 앞으로 어떠한 경우에도 음주 후 운전하지 않을 것을 서약합니다."], sections: [{ title: "구체적 서약사항", items: ["술을 마신 날에는 어떠한 경우에도 운전하지 않겠습니다.", "술을 마실 가능성이 있는 모임에는 차량을 가져가지 않겠습니다.", "가까운 거리, 잠깐 이동, 술이 깬 것 같다는 이유로 운전하지 않겠습니다.", "대리운전, 택시, 대중교통, 가족 또는 지인의 도움을 이용하겠습니다."] }], closing: ["본인은 위 내용을 충분히 읽고 이해하였으며, 다시는 음주운전을 하지 않을 것을 서약합니다."], signatureLabel: "서약자", extraSignature: true },
  },
  violence: {
    "prevention-plan": { heading: "폭력범죄 재범방지계획서", purpose: ["본인은 폭력 행위가 순간적인 감정 표현이 아니라 상대방의 신체와 마음, 가족과 공동체의 안전을 훼손하는 중대한 행동임을 인정합니다.", "본 계획서는 분노가 올라오는 과정, 갈등을 확대시키는 말과 행동, 음주·피로·자존심 등 위험 요인을 분석하고 폭력 행동을 사전에 차단하기 위해 작성합니다."], sections: [{ title: "행동에 대한 반성", paragraphs: ["어떠한 이유로도 폭력은 정당화될 수 없으며, 피해자가 느꼈을 공포와 불안을 가볍게 생각하지 않겠습니다."] }, { title: "재범 위험 요인 분석", items: ["상대방의 말을 공격이나 무시로 받아들이는 해석 습관", "분노가 올라올 때 목소리, 표정, 몸의 긴장을 알아차리지 못하는 문제", "술자리나 늦은 시간 갈등 상황에서 충동이 커지는 문제", "갈등 후 연락, 방문, 문자로 상황을 다시 자극하는 행동"] }, { title: "구체적인 재범방지계획", items: ["분노 신호가 느껴지면 즉시 말을 멈추고 10분 이상 자리를 벗어나겠습니다.", "손을 뻗거나 밀거나 막아서는 행동을 하지 않겠습니다.", "음주 중 언쟁이 생기면 대화를 중단하고 귀가하겠습니다.", "피해자 또는 상대방이 거리를 원하면 연락하지 않겠습니다.", "분노 일지를 작성해 원인, 생각, 행동, 대안을 기록하겠습니다."] }], closing: ["본인은 앞으로 갈등 상황에서 이기려 하기보다 멈추고 물러나는 선택을 하겠습니다."] },
    "action-plan": { heading: "폭력예방 실천계획서", purpose: ["본 계획서는 폭력으로 이어질 수 있는 감정과 상황을 미리 알아차리고, 갈등을 안전하게 종료하기 위한 행동 기준을 정하기 위해 작성합니다."], sections: [{ title: "위험 상황 점검", items: ["음주 후 말다툼", "무시당했다고 느끼는 상황", "금전·가족·연인 관계 갈등", "늦은 밤 전화나 문자로 이어지는 언쟁"] }, { title: "STOP 실천 원칙", items: ["Stop: 말과 행동을 즉시 멈춥니다.", "Take a step back: 상대와 물리적 거리를 둡니다.", "Observe: 내 목소리, 손, 호흡, 생각을 확인합니다.", "Proceed safely: 대화를 중단하거나 제3자의 도움을 요청합니다."] }, { title: "비폭력 대화 기준", items: ["욕설, 조롱, 위협 표현을 사용하지 않겠습니다.", "상대방을 몰아붙이거나 출입을 막지 않겠습니다.", "대화가 격해지면 같은 날 결론을 내려고 하지 않겠습니다."] }], closing: ["본인은 감정이 격해지는 순간에도 폭력을 선택하지 않고 멈춤, 거리두기, 도움 요청을 우선하겠습니다."] },
    pledge: { heading: "폭력범죄 재범방지 서약서", purpose: ["본인은 폭력 행위가 상대방의 안전과 존엄을 침해하는 행동임을 인정하며, 앞으로 신체적·언어적·심리적 폭력을 반복하지 않을 것을 서약합니다."], sections: [{ title: "구체적 서약사항", items: ["어떠한 갈등 상황에서도 때리거나 밀치거나 물건을 던지지 않겠습니다.", "욕설, 협박, 모욕, 반복 연락으로 상대방을 압박하지 않겠습니다.", "분노가 올라오면 즉시 대화를 중단하고 자리를 벗어나겠습니다.", "음주 상태에서는 갈등 대화를 하지 않겠습니다.", "상대방이 거리를 요구하면 그 의사를 존중하겠습니다."] }], closing: ["본인은 위 서약을 지키며 폭력 없는 방식으로 갈등을 해결할 것을 다짐합니다."], signatureLabel: "서약자", extraSignature: true },
  },
  gambling: {
    "prevention-plan": { heading: "도박중독 재발방지계획서", purpose: ["본인은 도박이 단순한 오락을 넘어 금전 손실, 거짓말, 관계 훼손, 채무 문제로 이어질 수 있음을 인정합니다.", "본 계획서는 도박 충동이 생기는 상황과 접근 경로를 차단하고 금전·시간·관계를 회복하기 위한 실천 계획입니다."], sections: [{ title: "문제 인식과 반성", paragraphs: ["손실을 만회하겠다는 생각, 이번에는 멈출 수 있다는 과신, 스트레스를 도박으로 잊으려는 습관이 문제를 키웠음을 인정합니다."] }, { title: "재발 위험 요인 분석", items: ["스포츠 경기, 사행성 앱, 불법 사이트, 지인 권유 등 접근 경로", "월급일, 보너스, 여유 자금이 생긴 시기", "스트레스, 외로움, 분노, 수치심을 느끼는 시간", "손실을 빨리 복구하려는 추격 심리"] }, { title: "구체적인 재발방지계획", items: ["도박 사이트와 앱을 삭제하고 차단 프로그램을 설치하겠습니다.", "도박 관련 계정, 단체 채팅방, 지인 연락망을 정리하겠습니다.", "월급과 주요 지출은 가족 또는 신뢰할 수 있는 조력자와 함께 관리하겠습니다.", "현금 인출 한도와 카드 사용 한도를 낮추겠습니다.", "도박 충동이 생기면 30분 지연 원칙을 적용하겠습니다."] }], closing: ["본인은 금전 관리와 접근 차단을 생활화해 도박 없는 일상을 회복하겠습니다."] },
    "action-plan": { heading: "도박예방 실천계획서", purpose: ["본 계획서는 도박 접근을 차단하고 충동이 올라오는 순간 사용할 행동 대안을 미리 정하기 위해 작성합니다."], sections: [{ title: "접근 차단 계획", items: ["도박·토토·카지노·사행성 게임 앱 삭제", "관련 사이트 차단 및 검색어 차단", "도박 관련 지인, 오픈채팅, 문자 수신 차단", "혼자 있는 늦은 밤 결제·송금 앱 사용 제한"] }, { title: "금전 관리 계획", items: ["월 예산표 작성", "급여 입금 즉시 고정비와 생활비 분리", "카드·현금 인출 한도 설정", "고액 결제 전 가족 또는 조력자에게 알리기"] }, { title: "충동 대처 행동", items: ["충동이 생기면 30분 동안 결제하지 않기", "산책, 샤워, 운동, 청소 등 몸을 움직이는 행동으로 전환", "신뢰하는 사람에게 즉시 연락", "필요 시 중독 상담기관에 연락"] }], closing: ["본인은 도박 충동을 의지로만 버티지 않고, 접근 차단과 금전 관리라는 구조를 만들어 실천하겠습니다."] },
    pledge: { heading: "도박중독 재발방지 서약서", purpose: ["본인은 도박이 본인과 가족의 경제적 안정, 신뢰 관계, 일상생활을 무너뜨릴 수 있음을 인정하며 도박 및 사행성 행위에 다시 접근하지 않을 것을 서약합니다."], sections: [{ title: "구체적 서약사항", items: ["불법 도박, 스포츠토토 사설 베팅, 카지노, 사행성 게임에 참여하지 않겠습니다.", "도박 앱과 사이트를 설치하거나 접속하지 않겠습니다.", "손실 만회를 이유로 다시 베팅하지 않겠습니다.", "금전 사용 내역을 숨기지 않고 정기적으로 공유하겠습니다.", "도박 권유를 받으면 즉시 거절하고 연락을 차단하겠습니다."] }], closing: ["본인은 위 서약을 지키고 도박 없는 생활을 회복하기 위해 지속적으로 점검하겠습니다."], signatureLabel: "서약자", extraSignature: true },
  },

  drug: {
    "prevention-plan": {
      heading: "마약범죄 재범방지계획서",
      purpose: [
        "본인은 마약류 사용, 보관, 매수, 수수 또는 관련자 접촉이 본인의 건강과 사회적 신뢰를 훼손할 뿐 아니라 가족과 주변 사람에게도 중대한 피해를 줄 수 있음을 인정합니다.",
        "본 계획서는 재사용 또는 재접촉으로 이어질 수 있는 위험요인을 구체적으로 분석하고, 접근 차단·치료 연계·생활 관리·지지체계 구축을 통해 같은 문제가 반복되지 않도록 하기 위해 작성합니다.",
      ],
      sections: [
        { title: "사건에 대한 인식과 반성", paragraphs: ["마약류 문제는 단순한 호기심이나 일시적 스트레스 해소로 가볍게 볼 수 있는 일이 아닙니다. 저는 당시의 판단과 행동이 위법하고 위험했음을 인정하며, 다시 같은 상황에 놓이지 않도록 생활 구조를 바꾸겠습니다."] },
        { title: "재범 위험요인 분석", items: ["과거 마약류를 접하게 된 사람, 장소, 연락망, 온라인 경로", "스트레스, 외로움, 수치심, 분노, 불면 등 사용 충동을 높이는 감정", "술자리, 늦은 밤, 혼자 있는 시간, 현금 보유 등 판단이 약해지는 상황", "치료·상담·가족과의 약속에서 멀어지는 생활 패턴", "한 번쯤은 괜찮다거나 스스로 통제할 수 있다는 합리화"] },
        { title: "접근 차단 계획", items: ["관련 연락처, 메신저 대화방, SNS 계정, 검색기록, 저장된 번호를 삭제하고 차단하겠습니다.", "과거 사용 장소와 관련자를 피하고, 우연히 접촉되면 즉시 자리를 벗어나겠습니다.", "혼자 있는 늦은 밤에는 외출과 온라인 접속을 제한하고 가족 또는 조력자에게 현재 위치를 공유하겠습니다.", "현금 보유와 비정상적 송금·결제 수단 사용을 제한하겠습니다."] },
        { title: "치료·상담 및 회복 지원 계획", items: ["필요한 경우 의료기관, 중독 상담기관, 정신건강복지센터 등 전문기관 상담을 예약하고 지속하겠습니다.", "상담 또는 치료 일정을 달력에 기록하고 빠뜨린 경우 즉시 재예약하겠습니다.", "가족 또는 신뢰할 수 있는 조력자 1명 이상에게 위험 신호와 도움 요청 방법을 공유하겠습니다.", "월 1회 이상 회복 상태를 점검하고 재발 위험이 커진 경우 즉시 전문가 도움을 받겠습니다."] },
        { title: "점검 항목", table: ["관련 연락처와 온라인 경로를 차단했는가", "고위험 시간에 혼자 있지 않았는가", "상담·치료·교육 일정을 지켰는가", "갈망이나 충동이 생겼을 때 도움을 요청했는가", "수면·식사·운동 등 기본 생활을 유지했는가"] },
      ],
      closing: ["본인은 회복을 의지만으로 해결하려 하지 않고, 위험요인을 차단하는 구조와 도움을 요청하는 체계를 만들겠습니다. 매일의 생활을 점검하며 같은 잘못을 반복하지 않겠습니다."],
    },
    pledge: {
      heading: "마약범죄 재범방지서약서",
      purpose: ["본인은 마약류와 관련된 어떠한 위법행위도 반복하지 않겠다는 점을 분명히 하고, 아래 사항을 성실히 지킬 것을 서약합니다."],
      sections: [
        { title: "구체적 서약사항", items: ["마약류를 구매, 보관, 수수, 사용하거나 타인에게 권유하지 않겠습니다.", "마약류 관련 연락처, 메신저, SNS, 온라인 접근 경로를 삭제하고 다시 접촉하지 않겠습니다.", "호기심, 스트레스, 외로움, 술자리 분위기를 이유로 재사용을 합리화하지 않겠습니다.", "재사용 충동이나 관련자 접촉 가능성이 생기면 즉시 가족, 조력자, 상담기관에 알리겠습니다.", "상담·치료·교육 등 회복을 위한 일정을 성실히 이행하겠습니다.", "현금 사용, 늦은 밤 외출, 혼자 있는 시간처럼 위험을 높이는 생활 패턴을 관리하겠습니다."] },
        { title: "위반 예방을 위한 확인자 약속", items: ["본 서약 내용을 가족 또는 신뢰할 수 있는 조력자에게 공유하겠습니다.", "월 1회 이상 서약 이행 여부를 점검하겠습니다.", "위험 신호가 반복되면 즉시 전문가 상담을 받겠습니다."] },
      ],
      closing: ["본인은 위 내용을 충분히 읽고 이해했으며, 단순한 다짐에 그치지 않고 실제 생활에서 재범방지 조치를 지속적으로 실천할 것을 서약합니다."],
      signatureLabel: "서약자",
      extraSignature: true,
    },
    "action-plan": {
      heading: "마약범죄 재범방지실천계획서",
      purpose: ["본 계획서는 재사용 위험을 낮추기 위해 오늘부터 바로 실행할 행동 기준을 정리하는 문서입니다. 각 항목은 추상적인 다짐이 아니라 실제 확인 가능한 행동으로 작성합니다."],
      sections: [
        { title: "24시간 즉시 실행 계획", items: ["관련 연락처와 대화방을 삭제하고 차단합니다.", "혼자 보관 중인 위험 물품, 연락 수단, 접근 경로를 정리합니다.", "가족 또는 조력자에게 현재 상태와 재범방지 계획을 알립니다.", "오늘의 수면 시간, 식사, 외출 계획을 기록합니다."] },
        { title: "고위험 상황별 대처계획", items: ["관련자가 연락한 경우: 답장하지 않고 차단한 뒤 조력자에게 알립니다.", "갈망이 생긴 경우: 30분 지연, 물 마시기, 샤워, 산책, 전화 도움 요청 순서로 대응합니다.", "술자리 또는 늦은 밤 외출 제안이 있는 경우: 참석하지 않거나 동행자와 귀가 시간을 정합니다.", "스트레스가 심한 경우: 혼자 해결하지 않고 상담 예약 또는 조력자 통화를 우선합니다."] },
        { title: "생활 관리 계획", items: ["기상·취침 시간을 일정하게 유지하겠습니다.", "주 3회 이상 20분 이상 걷기나 운동을 하겠습니다.", "현금 사용과 비정상적 송금을 줄이고 지출 내역을 기록하겠습니다.", "주 1회 회복 점검표를 작성하겠습니다.", "상담·치료·교육 이수 내역을 날짜별로 보관하겠습니다."] },
        { title: "실행 점검표", table: ["오늘 위험 연락처를 차단했는가", "오늘 혼자 고위험 장소에 가지 않았는가", "오늘 갈망 대처 행동을 사용했는가", "오늘 수면·식사·운동 기록을 남겼는가", "오늘 조력자 또는 상담기관과 연락 가능한 상태를 유지했는가"] },
      ],
      closing: ["본인은 재범방지를 막연한 결심으로 두지 않고, 오늘의 행동부터 바꾸겠습니다. 위험 상황을 숨기지 않고 도움을 요청하며 회복 계획을 계속 실행하겠습니다."],
    },
  },
  "sexual-offense": {
    "prevention-plan": { heading: "성범죄 재범방지계획서", purpose: ["본인은 타인의 성적 자기결정권과 신체적·심리적 경계를 침해하는 행동이 피해자에게 깊은 고통과 불안을 줄 수 있음을 인정합니다.", "본 계획서는 왜곡된 인식, 충동적 행동, 디지털 환경, 관계 경계 문제를 점검하고 재범 위험을 차단하기 위해 작성합니다."], sections: [{ title: "행동에 대한 반성", paragraphs: ["친밀감, 호감, 술자리 분위기, 온라인 대화 등을 이유로 상대의 의사를 추정하거나 가볍게 여긴 태도가 잘못임을 인정합니다."] }, { title: "재범 위험 요인 분석", items: ["상대방의 침묵이나 애매한 반응을 동의로 해석하는 인식", "술자리, 늦은 시간, 단둘이 있는 공간에서 경계가 흐려지는 문제", "온라인 메시지, 사진, 영상 등 디지털 경계에 대한 인식 부족", "상대방이 불편함을 표현했을 때 즉시 멈추지 못하는 태도"] }, { title: "구체적인 재범방지계획", items: ["명확하고 자발적인 동의가 없는 행동은 하지 않겠습니다.", "상대방이 침묵하거나 망설이면 동의하지 않은 것으로 판단하고 멈추겠습니다.", "음주 상태에서는 신체 접촉이나 성적 농담, 사적 메시지를 하지 않겠습니다.", "사진, 영상, 대화 내용을 동의 없이 저장·전송·공유하지 않겠습니다.", "불법·유해 디지털 콘텐츠 접속을 차단하고 이용 기록을 점검하겠습니다."] }], closing: ["본인은 상대방의 경계와 의사를 최우선으로 존중하겠습니다. 애매하면 멈추고, 확실하지 않으면 하지 않는 원칙을 생활화하겠습니다."] },
    "action-plan": { heading: "성범죄예방 실천계획서", purpose: ["본 계획서는 관계 윤리와 경계 존중 원칙을 일상에서 실천하고, 위험 상황을 사전에 차단하기 위해 작성합니다."], sections: [{ title: "관계 경계 원칙", items: ["상대방의 명확한 동의 없이 신체 접촉하지 않겠습니다.", "상대방의 거절, 침묵, 회피, 불편한 표정을 즉시 중단 신호로 받아들이겠습니다.", "호감이나 친분을 동의로 해석하지 않겠습니다."] }, { title: "디지털 실천 원칙", items: ["동의 없는 촬영, 저장, 전송, 공유를 하지 않겠습니다.", "성적 농담, 반복 메시지, 늦은 밤 사적 연락을 자제하겠습니다.", "불법 촬영물·유포물·성착취물을 검색하거나 보관하지 않겠습니다."] }, { title: "위험 상황 회피 계획", items: ["과음 상태에서 단둘이 있는 공간을 만들지 않겠습니다.", "상대방이 불편함을 표현하면 즉시 사과하고 거리를 두겠습니다.", "충동이 커질 때는 휴대폰을 내려놓고 장소를 이동하겠습니다."] }], closing: ["본인은 타인의 성적 자기결정권을 존중하고, 모든 관계에서 명확한 동의와 안전한 경계를 우선하겠습니다."] },
    pledge: { heading: "성범죄 재범방지 서약서", purpose: ["본인은 타인의 의사와 경계를 침해하는 행동이 심각한 피해를 초래할 수 있음을 인정하며, 성적 자기결정권을 존중하고 재범하지 않을 것을 서약합니다."], sections: [{ title: "구체적 서약사항", items: ["상대방의 명확하고 자발적인 동의 없는 신체 접촉을 하지 않겠습니다.", "상대방의 거절, 침묵, 회피, 불편 신호가 있으면 즉시 멈추겠습니다.", "동의 없는 촬영, 저장, 전송, 공유를 하지 않겠습니다.", "불법·유해 성적 콘텐츠를 검색하거나 보관하지 않겠습니다.", "음주 상태에서 성적 농담, 사적 연락, 신체 접촉을 하지 않겠습니다."] }], closing: ["본인은 위 서약을 지키며 타인의 존엄과 경계를 존중하는 생활을 하겠습니다."], signatureLabel: "서약자", extraSignature: true },
  },
};

function renderSection(section: DocumentSection) {
  return <Section title={section.title}>{section.paragraphs?.map((p) => <p key={p}>{p}</p>)}{section.items ? <ul className="list-disc pl-5">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}{section.table ? <table className="w-full border-collapse text-sm"><tbody>{section.table.map((item) => <tr key={item}><td className="border border-slate-300 px-3 py-2">{item}</td><td className="w-32 border border-slate-300 px-3 py-2 text-center">예 / 아니오</td></tr>)}</tbody></table> : null}</Section>;
}

function DocumentBody({ category, kind, identity }: { category: PreventionDocumentCategory; kind: PreventionDocumentKind; identity: PreventionDocumentIdentity }) {
  const content = packs[category][kind];
  return <><h1 className="text-center text-3xl font-bold tracking-[0.08em] text-slate-950">{content.heading}</h1><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-950">{exampleNotice}</div><Section title="1. 작성자 인적사항"><div className="grid gap-2 sm:grid-cols-2"><Line label="성명" value={identity.name} /><Line label="생년월일" value={identity.birthDate} /><Line label="연락처" value={identity.phoneNumber} /><Line label="주소" value={identity.address} /><Line label="작성일" value={identity.writtenDate} /></div></Section><Section title="2. 작성 취지">{content.purpose.map((p) => <p key={p}>{p}</p>)}</Section>{content.sections.map((section, index) => <div key={section.title}>{renderSection({ ...section, title: String(index + 3) + ". " + section.title })}</div>)}<Section title={String(content.sections.length + 3) + ". 향후 다짐"}>{content.closing.map((p) => <p key={p}>{p}</p>)}<p className="mt-6">작성일: {identity.writtenDate || "20____년 ____월 ____일"}</p><Signature label={content.signatureLabel} extra={content.extraSignature} /></Section></>;
}

function PreventionDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCourseId = searchParams.get("courseId");
  const selected = getPreventionDocument(searchParams.get("type"), requestedCourseId);
  const categoryDocuments = useMemo(() => getPreventionDocumentsForCategory(selected.category), [selected.category]);
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
        const enrollments = adminAccess && adminTargetUid ? [] : await getVerifiedUserEnrollments(user, null);
        const profile = await getUserProfile(targetUid);
        const selectedFromType = getPreventionDocument(searchParams.get("type"), requestedCourseId);
        const allowed = adminAccess || enrollments.some((item) => getPreventionDocumentCategoryFromCourseId(item.courseId) === selectedFromType.category && isEnrollmentActive(item) && hasPreventionDocumentsAccess(item.productId, item.amount, item.productTitle));
        if (cancelled) return;
        setHasAccess(allowed);
        setIdentity(buildDocumentIdentity(profile));
        if (!allowed) {
          const message = "수강권 결제 후 이용할 수 있습니다.";
          setError(preventionDocumentCategoryLabels[selectedFromType.category] + " 수강권 보유자만 해당 서식을 확인할 수 있습니다.");
          router.replace(getPreventionDocumentsApplyHref(selectedFromType.category) + "&notice=" + encodeURIComponent(message));
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
  }, [router, searchParams, requestedCourseId]);

  const printDocument = (mode: "print" | "pdf") => {
    trackEvent("material_download", { method: mode, material_id: selected.id, material_name: selected.title });
    const previousTitle = document.title;
    document.title = selected.title.replace(/\s+/g, "_");
    window.setTimeout(() => window.print(), mode === "pdf" ? 80 : 0);
    window.setTimeout(() => { document.title = previousTitle; }, 800);
  };

  return <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-slate-950 print:bg-white print:p-0"><style>{printStyles}</style><div className="mx-auto max-w-5xl"><div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#274690]">{preventionDocumentCategoryLabels[selected.category]} 참고서식</p><h1 className="mt-1 text-3xl font-bold">{selected.title}</h1><p className="mt-2 text-sm text-slate-600">{selected.description}</p><p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">{exampleNotice}</p></div><div className="flex flex-wrap gap-2"><Link href="/course-room/?v=202607161010" className={buttonClass("secondary", "sm", "rounded-full")}>수강실로 이동</Link><button type="button" disabled={!hasAccess} onClick={() => printDocument("print")} className={buttonClass("warning", "sm", "rounded-full font-bold disabled:opacity-60")}>인쇄하기</button><button type="button" disabled={!hasAccess} onClick={() => printDocument("pdf")} className={buttonClass("primary", "sm", "rounded-full font-bold disabled:opacity-60")}>PDF 저장</button></div></div><div className="no-print mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5"><label className="text-sm font-semibold text-slate-700">성명<input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-sm font-semibold text-slate-700">생년월일<input value={identity.birthDate} onChange={(e) => setIdentity({ ...identity, birthDate: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-sm font-semibold text-slate-700">연락처<input value={identity.phoneNumber} onChange={(e) => setIdentity({ ...identity, phoneNumber: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">주소<input value={identity.address} onChange={(e) => setIdentity({ ...identity, address: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label></div><div className="no-print mb-5 flex flex-wrap gap-2">{categoryDocuments.map((doc) => <Link key={doc.id} href={"/prevention-documents?type=" + encodeURIComponent(doc.id)} className={doc.id === selected.id ? buttonClass("primary", "sm", "rounded-full") : buttonClass("secondary", "sm", "rounded-full")}>{doc.title}</Link>)}</div>{loading ? <p className="no-print rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">서식 이용 권한을 확인하는 중입니다...</p> : null}{error && !loading ? <p className="no-print rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p> : null}{hasAccess ? <article className="document-print-area document-paper relative mx-auto max-w-[210mm] overflow-hidden bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-200"><img src={centerLogoPath} alt="" aria-hidden="true" className="document-watermark pointer-events-none absolute left-1/2 top-[44%] z-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 select-none object-contain" /><div className="relative z-10"><DocumentBody category={selected.category} kind={selected.kind} identity={identity} /></div></article> : null}</div></main>;
}

export default function PreventionDocumentsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#eef3f8] p-8">서식을 준비하는 중입니다...</main>}><PreventionDocumentsContent /></Suspense>;
}
