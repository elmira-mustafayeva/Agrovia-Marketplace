// Shared AZ mobile phone normalization + validation.
// Used by middleware/validators.js and controllers/authController.js.
// Keep logic in one place so frontend + backend rules stay in sync.

const AZ_MOBILE_RE = /^\+994(10|50|51|55|60|70|77|99)\d{7}$/;

/**
 * Normalizes any common AZ phone input to +994XXXXXXXXX.
 * Accepts: 501234567 | 0501234567 | +994501234567
 * Returns raw input unchanged if it cannot be mapped (isValidAzMobile will then reject it).
 */
function normalizeAzPhone(raw) {
  const str = String(raw || '').trim();
  const digits = str.replace(/\D/g, '');
  if (digits.startsWith('994') && digits.length >= 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10) return '+994' + digits.slice(1);
  if (digits.length === 9) return '+994' + digits;
  return str;
}

/**
 * Returns true only for AZ mobile numbers with an approved operator prefix.
 * Approved prefixes: 10, 50, 51, 55, 60, 70, 77, 99
 */
function isValidAzMobile(normalized) {
  return AZ_MOBILE_RE.test(normalized);
}

module.exports = { normalizeAzPhone, isValidAzMobile };
