/** Longest QR data URL accepted; a Google Sheets cell holds at most 50,000 characters. */
export const QR_MAX_LENGTH = 45_000;

/**
 * Shrinks an uploaded image into a data URL of at most QR_MAX_LENGTH characters,
 * trying PNG (crisp for QR codes) before JPEG, and smaller sizes until it fits.
 */
export async function compressQr(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  for (let side = 480; side >= 160; side = Math.round(side * 0.8)) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const url of [canvas.toDataURL("image/png"), canvas.toDataURL("image/jpeg", 0.85)]) {
      if (url.length <= QR_MAX_LENGTH) return url;
    }
  }
  throw new Error("This image is too detailed. Try a tighter crop of the QR code.");
}

/** Turns a data URL into a File, e.g. for the Web Share API. */
export function dataUrlToFile(url: string, name: string) {
  const [head, body] = url.split(",");
  const type = head.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new File([bytes], `${name}.${type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1]}`, { type });
}
