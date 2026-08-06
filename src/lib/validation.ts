// src/lib/validation.ts

// Standard Indian GSTIN Regex
// e.g. 22AAAAA0000A1Z5 (2 chars, 5 letters, 4 numbers, 1 letter, 1 number/letter, Z, 1 number/letter)
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const PHONE_REGEX = /^[0-9]{10}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PINCODE_REGEX = /^[0-9]{6}$/;

export function validateGST(gstin: string | undefined): string | null {
  if (!gstin) return null;
  if (!GST_REGEX.test(gstin)) {
    return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
  }
  return null;
}

export function validatePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  if (!PHONE_REGEX.test(phone)) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
}

export function validateEmail(email: string | undefined): string | null {
  if (!email) return null;
  if (!EMAIL_REGEX.test(email)) {
    return 'Invalid email address format';
  }
  return null;
}

export function validatePincode(pincode: string | undefined): string | null {
  if (!pincode) return null;
  if (!PINCODE_REGEX.test(pincode)) {
    return 'Pincode must be exactly 6 digits';
  }
  return null;
}
