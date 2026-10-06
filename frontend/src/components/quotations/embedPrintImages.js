/** Wait for all images inside an element to load (or fail). */
export function waitForImages(root, timeoutMs = 8000) {
  if (!root) return Promise.resolve();
  const imgs = [...root.querySelectorAll('img')];
  if (!imgs.length) return Promise.resolve();

  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, timeoutMs);
        })
    )
  );
}

/** Make relative /uploads paths absolute against the CRM origin. */
export function absolutizeUrl(url, baseOrigin = typeof window !== 'undefined' ? window.location.origin : '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!baseOrigin) return raw;
  if (raw.startsWith('//')) return `${window.location.protocol}${raw}`;
  try {
    return new URL(raw, baseOrigin.endsWith('/') ? baseOrigin : `${baseOrigin}/`).href;
  } catch {
    return raw;
  }
}

function isSameOriginUrl(url) {
  try {
    if (!url || String(url).startsWith('data:')) return true;
    const u = new URL(url, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Print-safe max dimensions — keeps quotation PDF small. */
function getPrintImageLimits(img) {
  const cls = String(img?.className || '');
  if (cls.includes('quote-ht-cover-img')) return { maxW: 880, maxH: 520, quality: 0.72 };
  if (cls.includes('quote-ht-highlight-img')) return { maxW: 340, maxH: 200, quality: 0.68 };
  if (cls.includes('quote-ht-stay-photo-img')) return { maxW: 480, maxH: 360, quality: 0.72 };
  if (cls.includes('quote-ht-logo-img') || cls.includes('quote-ht-footer-logo')) {
    return { maxW: 220, maxH: 90, quality: 0.82 };
  }
  return { maxW: 640, maxH: 480, quality: 0.7 };
}

function scaleToFit(width, height, maxW, maxH) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const ratio = Math.min(1, maxW / w, maxH / h);
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  };
}

/** Encode a drawn canvas as compressed JPEG data URL. */
function canvasToJpeg(canvas, quality = 0.7) {
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

/**
 * Resize + compress an HTMLImageElement for print/PDF embedding.
 */
export function imgElementToDataUrl(img, limits) {
  if (!img?.naturalWidth) return null;
  const { maxW, maxH, quality } = limits || getPrintImageLimits(img);
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxW, maxH);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvasToJpeg(canvas, quality);
  } catch {
    return null;
  }
}

/** Load remote image into an Image element. Same-origin skips CORS to avoid tainted canvas. */
function loadImageElement(url, { forceCors = false } = {}) {
  return new Promise((resolve) => {
    const el = new Image();
    el.decoding = 'async';
    const absolute = absolutizeUrl(url);
    const sameOrigin = isSameOriginUrl(absolute);
    if (!String(absolute).startsWith('data:') && (forceCors || !sameOrigin)) {
      el.crossOrigin = 'anonymous';
      el.referrerPolicy = 'no-referrer';
    }
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = absolute;
  });
}

/** Fetch/load image then compress through canvas for a light data URL. */
async function urlToCompressedDataUrl(url, limits) {
  if (!url) return null;
  const absolute = absolutizeUrl(url);

  if (String(absolute).startsWith('data:image/')) {
    const el = await loadImageElement(absolute);
    if (!el) return absolute.length < 120_000 ? absolute : null;
    return imgElementToDataUrl(el, limits) || (absolute.length < 120_000 ? absolute : null);
  }

  // Prefer same-origin load without CORS (uploads/hotels work this way).
  let el = await loadImageElement(absolute, { forceCors: false });
  if (el?.naturalWidth) {
    const compressed = imgElementToDataUrl(el, limits);
    if (compressed) return compressed;
  }

  // Cross-origin retry with anonymous CORS
  if (!isSameOriginUrl(absolute)) {
    el = await loadImageElement(absolute, { forceCors: true });
    if (el?.naturalWidth) {
      const compressed = imgElementToDataUrl(el, limits);
      if (compressed) return compressed;
    }
  }

  // Fetch blob (same-origin always works; cross-origin needs CORS)
  try {
    const res = await fetch(absolute, {
      mode: isSameOriginUrl(absolute) ? 'same-origin' : 'cors',
      credentials: isSameOriginUrl(absolute) ? 'same-origin' : 'omit',
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const blobImg = await loadImageElement(objectUrl);
      if (blobImg?.naturalWidth) {
        return imgElementToDataUrl(blobImg, limits);
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Clone quotation DOM and inline compressed image data URLs for print/PDF. */
export async function cloneWithEmbeddedImages(contentEl) {
  if (!contentEl) return null;

  // Absolutize live img srcs first so relative /uploads paths resolve for print clones
  contentEl.querySelectorAll('img').forEach((img) => {
    const raw = img.getAttribute('src') || img.src || '';
    if (!raw || raw.startsWith('data:')) return;
    const abs = absolutizeUrl(raw);
    if (abs && abs !== raw) {
      img.setAttribute('src', abs);
      img.src = abs;
    }
  });

  await waitForImages(contentEl, 12000);

  const clone = contentEl.cloneNode(true);
  const srcImgs = contentEl.querySelectorAll('img');
  const cloneImgs = clone.querySelectorAll('img');

  for (let i = 0; i < cloneImgs.length; i += 1) {
    const srcImg = srcImgs[i];
    const cloneImg = cloneImgs[i];
    if (!srcImg || !cloneImg) continue;

    const limits = getPrintImageLimits(srcImg);
    const rawSrc = srcImg.currentSrc || srcImg.src || srcImg.getAttribute('src') || '';
    const absolute = absolutizeUrl(rawSrc);

    let dataUrl = imgElementToDataUrl(srcImg, limits);
    if (!dataUrl && absolute) {
      dataUrl = await urlToCompressedDataUrl(absolute, limits);
    }

    if (dataUrl) {
      cloneImg.src = dataUrl;
      cloneImg.removeAttribute('srcset');
      cloneImg.removeAttribute('sizes');
      cloneImg.removeAttribute('crossorigin');
    } else if (absolute) {
      // Keep absolute URL so print iframe (with <base>) can still load it
      cloneImg.src = absolute;
      cloneImg.removeAttribute('srcset');
      cloneImg.removeAttribute('sizes');
    }
  }

  return clone;
}
