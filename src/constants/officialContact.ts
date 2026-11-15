/**
 * Official contact & WhatsApp configuration for ÇAVÊ BAADRÊ & RABA Organization.
 * Single source of truth shared across frontend and backend modules.
 */

export const OFFICIAL_PHONE_LOCAL = '07502138853';
export const OFFICIAL_WHATSAPP_INTL = '9647502138853';
export const OFFICIAL_PHONE_E164 = '+9647502138853';
export const OFFICIAL_PHONE_FORMATTED = '07502138853';
export const OFFICIAL_CONTACT_EMAIL = 'cavebaadre@gmail.com';

const LEGACY_PHONE_TAILS = ['7749019911', '7504738358', '7756063636'];

/**
 * Replaces empty or legacy default numbers with `OFFICIAL_PHONE_LOCAL` (`07502138853`),
 * while preserving valid admin-configured phone numbers if updated in the future.
 */
export function resolveActiveOfficialPhone(phone?: string | null): string {
  const trimmed = String(phone || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits || digits.length < 10) return OFFICIAL_PHONE_LOCAL;
  if (LEGACY_PHONE_TAILS.some((tail) => digits.endsWith(tail))) {
    return OFFICIAL_PHONE_LOCAL;
  }
  if (digits === OFFICIAL_WHATSAPP_INTL || digits === OFFICIAL_PHONE_LOCAL) {
    return OFFICIAL_PHONE_LOCAL;
  }
  return trimmed;
}

/**
 * Normalizes any Iraqi local or international phone string into a pure
 * international digit string suitable for `https://wa.me/<digits>`.
 * Falls back to `OFFICIAL_WHATSAPP_INTL` (`9647502138853`).
 */
export function toWhatsAppIntlNumber(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return OFFICIAL_WHATSAPP_INTL;
  if (digits.startsWith('00964')) return digits.slice(2);
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  return `964${digits}`;
}

/**
 * Builds a reliable `tel:` URI using international E.164 format (`tel:+964...`).
 */
export function toTelHref(phone?: string | null): string {
  return `tel:+${toWhatsAppIntlNumber(phone)}`;
}

/**
 * Formats an official or custom phone number for clean display (`07502138853` when matching official).
 */
export function formatDisplayPhone(phone?: string | null): string {
  return resolveActiveOfficialPhone(phone);
}
