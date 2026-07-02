"use client";

export const sealStampPath = "/images/%EB%A6%AC%EC%85%8B%EC%97%90%EB%93%80%EC%84%BC%ED%84%B0%20%EC%A7%81%EC%9D%B8.png";
export const centerLogoPath = "/images/%EB%A6%AC%EC%85%8B%EC%97%90%EB%93%80%EC%84%BC%ED%84%B0%20%EB%A1%9C%EA%B3%A0.png";

export type SealStampProps = {
  size?: number;
  className?: string;
  withTexture?: boolean;
  alt?: string;
};

export default function SealStamp({ size = 120, className = "", alt = "리셋에듀센터 직인" }: SealStampProps) {
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
