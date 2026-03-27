export type ObjectPosition = `${number}% ${number}%`;

type ImageSource = File | Blob | string;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parseObjectPosition(position?: string | null) {
  const fallback = { x: 50, y: 50 };
  if (!position) return fallback;

  const parts = position.trim().split(/\s+/);
  if (parts.length !== 2) return fallback;

  const x = Number.parseFloat(parts[0].replace("%", ""));
  const y = Number.parseFloat(parts[1].replace("%", ""));

  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
  return { x, y };
}

export function formatObjectPosition(x: number, y: number): ObjectPosition {
  return `${clamp(Math.round(x), 0, 100)}% ${clamp(Math.round(y), 0, 100)}%`;
}

export function nudgeObjectPosition(position: string | null | undefined, deltaX: number, deltaY: number) {
  const { x, y } = parseObjectPosition(position);
  return formatObjectPosition(x + deltaX, y + deltaY);
}

function loadImage(source: ImageSource) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    if (typeof source === "string") {
      img.crossOrigin = "anonymous";
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("לא הצלחנו לטעון את התמונה למסגור."));
    };
  });
}

export async function renderAvatarFrameBlob(
  source: ImageSource,
  options?: {
    position?: string | null;
    zoom?: number;
    size?: number;
    quality?: number;
  },
) {
  const image = await loadImage(source);
  const size = options?.size ?? 512;
  const zoom = clamp(options?.zoom ?? 1, 0.85, 1.35);
  const quality = clamp(options?.quality ?? 0.9, 0.5, 1);
  const { x, y } = parseObjectPosition(options?.position);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("לא הצלחנו להכין את האווטאר לעיבוד.");
  }

  const backgroundScale = Math.max(size / image.width, size / image.height);
  const backgroundWidth = image.width * backgroundScale;
  const backgroundHeight = image.height * backgroundScale;
  const backgroundOffsetX = (size - backgroundWidth) * (x / 100);
  const backgroundOffsetY = (size - backgroundHeight) * (y / 100);

  const innerPadding = Math.round(size * 0.08);
  const availableSize = size - innerPadding * 2;
  const containScale = Math.min(availableSize / image.width, availableSize / image.height) * zoom;
  const foregroundWidth = image.width * containScale;
  const foregroundHeight = image.height * containScale;
  const foregroundOffsetX = (size - foregroundWidth) / 2;
  const foregroundOffsetY = (size - foregroundHeight) / 2;

  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.filter = "blur(20px) saturate(0.92) brightness(0.55)";
  context.drawImage(image, backgroundOffsetX, backgroundOffsetY, backgroundWidth, backgroundHeight);
  context.filter = "none";

  const overlay = context.createLinearGradient(0, 0, 0, size);
  overlay.addColorStop(0, "rgba(4, 7, 16, 0.22)");
  overlay.addColorStop(1, "rgba(4, 7, 16, 0.46)");
  context.fillStyle = overlay;
  context.fillRect(0, 0, size, size);

  context.shadowColor = "rgba(3, 7, 18, 0.55)";
  context.shadowBlur = size * 0.04;
  context.shadowOffsetY = size * 0.012;
  context.drawImage(image, foregroundOffsetX, foregroundOffsetY, foregroundWidth, foregroundHeight);
  context.shadowColor = "transparent";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob) {
    throw new Error("לא הצלחנו לשמור את האווטאר המעודכן.");
  }

  return blob;
}