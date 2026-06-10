type PreparedImage = {
  file: File;
  extension: string;
  contentType: string;
};

const MAX_IMAGE_SIDE = 1800;
const JPEG_QUALITY = 0.82;

export const imageAccept = "image/*,.heic,.heif";

export function isSupportedImageFile(file: File) {
  return file.type.startsWith("image/") || isHeicFile(file);
}

export function canPreviewImageFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") && !name.endsWith(".heic") && !name.endsWith(".heif");
}

export async function prepareImageForUpload(file: File, fallbackName = "imagem"): Promise<PreparedImage> {
  const source = isHeicFile(file) ? await convertHeicToPng(file, fallbackName) : file;
  const compressed = await compressImage(source, fallbackName);
  const extension = extensionFromType(compressed.type) || "jpg";

  return {
    file: compressed,
    extension,
    contentType: compressed.type || "image/jpeg"
  };
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function convertHeicToPng(file: File, fallbackName: string) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/png",
    quality: 0.9
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], `${stripExtension(file.name) || fallbackName}.png`, { type: "image/png" });
}

async function compressImage(file: File, fallbackName: string) {
  if (!file.type.startsWith("image/")) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(imageUrl);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType, outputType === "image/jpeg" ? JPEG_QUALITY : undefined);

    if (!blob || blob.size > file.size && !isHeicFile(file)) return file;
    return new File([blob], `${stripExtension(file.name) || fallbackName}.${extensionFromType(outputType)}`, { type: outputType });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível preparar a imagem."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}
