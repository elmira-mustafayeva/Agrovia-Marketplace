// AZ mobile phone normalization + validation for the frontend.
// Mirrors agrovia-backend/utils/phoneValidator.js — keep in sync.

export const AZ_PREFIX = '+994';
export const AZ_MOBILE_PREFIXES = ['10', '50', '51', '55', '60', '70', '77', '99'];

const AZ_MOBILE_RE = /^\+994(10|50|51|55|60|70|77|99)\d{7}$/;

/**
 * Normalizes any common AZ phone input to +994XXXXXXXXX.
 *   501234567       → +994501234567
 *   0501234567      → +994501234567
 *   +994501234567   → +994501234567
 * Returns the raw string unchanged if it cannot be mapped
 * (isValidAzMobile will then reject it).
 */
export function normalizePhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('994') && digits.length >= 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10) return '+994' + digits.slice(1);
  if (digits.length === 9) return '+994' + digits;
  return raw;
}

/**
 * Returns true only for AZ mobile numbers with an approved operator prefix.
 * Approved prefixes: 10, 50, 51, 55, 60, 70, 77, 99
 */
export function isValidAzMobile(normalized) {
  return AZ_MOBILE_RE.test(normalized);
}

/**
 * Strips the +994 prefix from a stored phone value so PhoneInput
 * can show only the local portion in its editable field.
 * Returns the original string if it doesn't start with +994.
 */
export function stripPrefix(stored = '') {
  if (stored.startsWith('+994')) return stored.slice(4);
  if (stored.startsWith('994')) return stored.slice(3);
  if (stored.startsWith('0')) return stored.slice(1);
  return stored;
}
