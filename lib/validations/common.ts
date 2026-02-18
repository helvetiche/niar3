import { z } from "zod";

/**
 * Common validation schemas. Use with .safeParse() for runtime validation.
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1).max(128),
});

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(255);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");

export const weakPasswordSchema = z.string().min(6).max(128); // For login (don't validate complexity)

export const stringSchema = z
  .string()
  .max(10_000, "String exceeds maximum length");

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must be lowercase alphanumeric and hyphens only",
  );

export const urlSchema = z.string().url().max(2048);

export const nonEmptyStringSchema = z.string().min(1).max(10_000);
