/**
 * Phone photos are 3-10 MB, and the backend takes about a second per MB and refuses anything over 10 MB (checked on the live
 * server: 8.3 MB took 8 s from a fast line, 19 MB answered "must not be greater than 10240 KB"). On an ordinary connection that
 * is minutes, so the request timed out and the product was never saved. Pictures are therefore scaled down in the browser before
 * they are uploaded: a 1800 px side is plenty for the storefront and the file drops to a few hundred KB.
 */
const MAX_SIDE = 1800;
const SKIP_BELOW = 500 * 1024;
const QUALITY = 0.85;

const toBlob = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

/** @returns {Promise<File>} the scaled-down file, or the original when it is small, not a photo, or cannot be decoded. */
export async function compressImage(file) {
  if (typeof document === 'undefined' || !(file instanceof File) || !/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    // WebP keeps transparency; a browser without WebP encoding answers PNG, so fall back to JPEG on a white background.
    let blob = await toBlob(canvas, 'image/webp');
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, 'image/jpeg');
    }
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

/** `fn` over `items` with at most `limit` running at once; results keep the order of `items`. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}
