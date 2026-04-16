import isEmail from "validator/lib/isEmail";

const splitAddresses = (raw: string): string[] =>
  raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Validates each address and returns a comma-separated list for nodemailer.
 */
export const normalizeAddressList = (raw: string | undefined): string | undefined => {
  if (!raw?.trim()) return undefined;
  const parts = splitAddresses(raw);
  if (parts.length === 0) return undefined;
  for (const addr of parts) {
    if (!isEmail(addr)) {
      throw new Error(`Invalid email address: ${addr}`);
    }
  }
  return parts.join(", ");
};
