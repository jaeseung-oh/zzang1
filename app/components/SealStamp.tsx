"use client";

export const sealStampPath = "/images/%EB%A6%AC%EC%85%8B%EC%97%90%EB%93%80%EC%84%BC%ED%84%B0%20%EC%A7%81%EC%9D%B8.png";
export const centerLogoPath = "/images/resetedu-document-watermark.png";
export const centerFullLogoPath = "/images/resetedu-header-logo.jpg";

export type SealStampProps = {
  size?: number;
  className?: string;
  withTexture?: boolean;
  alt?: string;
};

export default function SealStamp({ size = 120, className = "", alt = "ResetEdu 재발방지교육센터 직인" }: SealStampProps) {
  return (
    <img
      src={sealStampPath}
      alt={alt}
      width={size}
      height={size}
      className={["seal-stamp select-none object-contain", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
