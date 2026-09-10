import { jsPDF } from "jspdf";

export function sanitizeFilePart(value: string) {
  return String(value || "").replace(/[^0-9A-Za-z가-힣_-]/g, "").slice(0, 60) || "문서";
}

function coerceDate(value: unknown) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

export function formatCompactDate(value: unknown) {
  if (typeof value === "string") {
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matched) return matched[1] + matched[2] + matched[3];
  }
  const date = coerceDate(value) || new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function isJpegBytes(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function buildPdfFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  if (!isJpegBytes(jpegBytes)) {
    throw new Error("PDF로 변환할 이미지가 JPEG 형식이 아닙니다. 다시 시도해 주세요.");
  }
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("PDF 이미지 크기가 올바르지 않습니다. 다시 시도해 주세요.");
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const imageRatio = imageWidth / imageHeight;
  const imageData = `data:image/jpeg;base64,${bytesToBase64(jpegBytes)}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  const drawWidth = pageWidth;
  const drawHeight = pageWidth / imageRatio;
  if (drawHeight <= pageHeight) {
    pdf.addImage(imageData, "JPEG", 0, (pageHeight - drawHeight) / 2, drawWidth, drawHeight, undefined, "FAST");
    return pdf;
  }

  const pageCount = Math.ceil(drawHeight / pageHeight);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(imageData, "JPEG", 0, -pageIndex * pageHeight, drawWidth, drawHeight, undefined, "FAST");
  }
  return pdf;
}

export function createPdfFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  const pdf = buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight);
  return new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
}

export async function downloadPdfFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number, filename: string) {
  const pdf = buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight);
  const blob = new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
  if (isMobileBrowser()) {
    await downloadBlob(blob, filename);
    return;
  }
  pdf.save(filename);
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

function canvasSafeColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return /oklch|oklab|\blch\(|\blab\(|color\(/i.test(value) ? fallback : value;
}

export function normalizeCanvasColors(root: HTMLElement) {
  [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach((element) => {
    const computed = window.getComputedStyle(element);
    element.style.color = canvasSafeColor(computed.color, "#0f172a");
    element.style.backgroundColor = canvasSafeColor(computed.backgroundColor, "transparent");
    element.style.borderColor = canvasSafeColor(computed.borderColor, "transparent");
    element.style.borderTopColor = canvasSafeColor(computed.borderTopColor, "transparent");
    element.style.borderRightColor = canvasSafeColor(computed.borderRightColor, "transparent");
    element.style.borderBottomColor = canvasSafeColor(computed.borderBottomColor, "transparent");
    element.style.borderLeftColor = canvasSafeColor(computed.borderLeftColor, "transparent");
    element.style.outlineColor = canvasSafeColor(computed.outlineColor, "transparent");
    element.style.textDecorationColor = "currentColor";
    element.style.backgroundImage = "none";
    element.style.boxShadow = "none";
    element.style.textShadow = "none";
  });
}

export async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src");
    if (!source || source.startsWith("data:")) return;
    const response = await fetch(new URL(source, window.location.href).toString(), { credentials: "same-origin" });
    if (!response.ok) return;
    image.setAttribute("src", await blobToDataUrl(await response.blob()));
  }));
}

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareData & { files?: File[] }) => boolean;
  share?: (data: ShareData & { files?: File[] }) => Promise<void>;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function downloadBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type || "application/pdf" });
  const nav = navigator as NavigatorWithFileShare;

  if (isMobileBrowser() && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (isAbortError(error)) return;
    }
  }

  const url = URL.createObjectURL(blob);
  if (isMobileBrowser()) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
