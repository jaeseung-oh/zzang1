export const siteInfo = {
  siteName: "리셋 재범방지교육센터",
  businessName: "보듬심리상담센터",
  representativeName: "홍경자",
  businessNumber: "861-98-01454",
  address: "경기도 수원시 영통구 센트럴타운로 106, 145호",
  supportPhone: "010-7727-8619",
  supportPhoneHref: "tel:01077278619",
  supportHours: "연중무휴 10:00-23:00 (부재 시 순차적으로 연락드립니다)",
};

export const operatorInfoRows = [
  ["운영기관명", siteInfo.businessName],
  ["대표자명", siteInfo.representativeName],
  ["사업자등록번호", siteInfo.businessNumber],
  ["사업장 주소", siteInfo.address],
  ["고객센터", siteInfo.supportPhone],
  ["상담 가능 시간", siteInfo.supportHours],
] as const;
