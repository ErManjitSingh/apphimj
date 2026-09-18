const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/apiError');

const HOTEL_UPLOAD_DIR = path.join(__dirname, '../../uploads/hotels');

function ensureUploadDir(dir = HOTEL_UPLOAD_DIR) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveHotelImageBase64({ base64, originalName, hotelId = 'hotel' } = {}) {
  if (!base64) throw new ApiError(400, 'Image data is required');
  ensureUploadDir();
  const raw = String(base64).replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  if (!buf.length) throw new ApiError(400, 'Invalid image data');
  if (buf.length > 8 * 1024 * 1024) throw new ApiError(400, 'Image must be under 8 MB');

  const extMatch = String(originalName || '').match(/\.([a-z0-9]+)$/i);
  const mimeExt = String(base64).match(/^data:image\/([a-z0-9+]+);/i)?.[1];
  const ext = (extMatch?.[1] || mimeExt || 'jpg').replace(/jpeg/i, 'jpg').toLowerCase();
  const safe = String(originalName || 'room')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 40);
  const idPart = String(hotelId || 'hotel').replace(/[^\w.-]+/g, '').slice(0, 24) || 'hotel';
  const fileName = `${idPart}-${Date.now()}-${safe || 'photo'}.${ext}`;
  fs.writeFileSync(path.join(HOTEL_UPLOAD_DIR, fileName), buf);
  return {
    url: `/uploads/hotels/${fileName}`,
    name: originalName || fileName,
  };
}

module.exports = {
  saveHotelImageBase64,
  HOTEL_UPLOAD_DIR,
};
