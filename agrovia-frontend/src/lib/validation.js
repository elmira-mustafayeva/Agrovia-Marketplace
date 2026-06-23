// Centralized Zod schemas for all Agrovia forms.
// Uses normalizePhone + isValidAzMobile from phoneUtils.js — no other validation imports.
import { z } from 'zod';
import { normalizePhone, isValidAzMobile } from './phoneUtils';

// ── Primitives ────────────────────────────────────────────────────────────────

/** Trims, then enforces min/max length. */
export const trimStr = (min, max, msg) =>
  z.string().trim().min(min, msg).max(max);

/** Azerbaijani name: letters only (Latin + AZ-specific chars), 2-50 chars. */
export const azNameStr = z
  .string()
  .trim()
  .regex(
    /^[a-zA-ZəƏğĞıİöÖüÜşŞçÇ\s'-]+$/,
    'Ad yalnız hərflərdən ibarət olmalıdır'
  )
  .min(2, 'Ad ən az 2 simvol olmalıdır')
  .max(50, 'Ad ən çox 50 simvol ola bilər');

/**
 * AZ mobile phone schema.
 * Accepts: 501234567 | 0501234567 | +994501234567
 * Transforms to +994XXXXXXXXX then validates operator prefix.
 * Price/stock/qty are positive numbers, NOT integers — decimals allowed.
 */
export const azMobileStr = z
  .string()
  .transform(normalizePhone)
  .refine(isValidAzMobile, {
    message: 'Telefon nömrəsi düzgün deyil. Məsələn: +994501234567',
  });

/** Password: min 8 chars, at least one uppercase letter, at least one digit. */
export const passwordStr = z
  .string()
  .min(8, 'Şifrə ən az 8 simvol olmalıdır')
  .regex(/[A-Z]/, 'Ən az bir böyük hərf tələb olunur')
  .regex(/[0-9]/, 'Ən az bir rəqəm tələb olunur');

/**
 * Positive number (decimals allowed — price can be 3.50 AZN, stock can be 1.5 kg).
 * Accepts optional max cap.
 */
export const positiveNum = (max = 9_999_999) =>
  z.coerce.number().positive('Dəyər sıfırdan böyük olmalıdır').max(max, `Dəyər ${max}-dən böyük ola bilməz`);

// ── Form schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Düzgün email daxil edin'),
  password: z.string().min(1, 'Şifrəni daxil edin'),
});

export const registerSchema = z.object({
  firstName: azNameStr,
  lastName: azNameStr,
  email: z.string().email('Düzgün email daxil edin'),
  phone: azMobileStr,
  password: passwordStr,
  role: z.enum(['buyer', 'seller', 'courier'], {
    errorMap: () => ({ message: 'Rol seçilməlidir' }),
  }),
  region: z.string().min(1, 'Region seçilməlidir'),
  // Seller-only (optional in schema; component validates presence when role===seller)
  sellerSaleType: z.string().optional(),
  // Courier-only
  courierRegions: z.array(z.string()).optional(),
});

export const checkoutSchema = z.object({
  recipientName: azNameStr,
  phone: azMobileStr,
  region: z.string().min(1, 'Region seçilməlidir'),
  street: trimStr(3, 200, 'Ünvan ən az 3 simvol olmalıdır'),
  notes: z.string().max(500, 'Qeyd 500 simvoldan çox ola bilməz').optional(),
});

export const productSchema = z
  .object({
    name: trimStr(2, 150, 'Ad ən az 2 simvol olmalıdır'),
    description: trimStr(10, 2000, 'Açıqlama ən az 10 simvol olmalıdır'),
    price: positiveNum(9_999_999),
    minOrderQuantity: positiveNum(9_999_999),
    stockQuantity: z.coerce.number().min(0, 'Stok miqdarı mənfi ola bilməz').max(9_999_999, 'Stok miqdarı həddindən yüksəkdir'),
    unit: z.string().min(1, 'Vahid seçilməlidir'),
    saleType: z.enum(['retail', 'wholesale', 'both']),
    category: z.string().min(1, 'Kateqoriya seçilməlidir'),
    discountPercentage: z
      .coerce.number()
      .min(0)
      .max(100, 'Endirim 0-100 arasında olmalıdır')
      .optional()
      .default(0),
  })
  .superRefine((data, ctx) => {
    if (
      data.minOrderQuantity !== undefined &&
      data.stockQuantity !== undefined &&
      data.stockQuantity > 0 &&
      data.minOrderQuantity > data.stockQuantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum sifariş miqdarı stokdan çox ola bilməz',
        path: ['minOrderQuantity'],
      });
    }
  });

export const reviewSchema = z.object({
  productRating: z
    .number({ required_error: 'Ulduzla qiymətləndirin' })
    .min(1, 'Ulduzla qiymətləndirin')
    .max(5),
  productReview: z
    .string()
    .trim()
    .min(1, 'Rəy mətni boş ola bilməz')
    .max(1000, 'Rəy 1000 simvoldan çox ola bilməz'),
});
