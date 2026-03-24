import { z } from "zod";

export const inventoryLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type InventoryLocation = z.infer<typeof inventoryLocationSchema>;

export const quarterlyDataSchema = z.object({
  requestedQuantity: z.number().int().min(0).nullable().optional(),
  receivedQuantity: z.number().int().min(0).nullable().optional(),
  baseQuantity: z.number().int().min(0).default(0),
});

export type QuarterlyData = z.infer<typeof quarterlyDataSchema>;

export const yearlyQuarterlyDataSchema = z.object({
  q1: quarterlyDataSchema.optional(),
  q2: quarterlyDataSchema.optional(),
  q3: quarterlyDataSchema.optional(),
  q4: quarterlyDataSchema.optional(),
});

export type YearlyQuarterlyData = z.infer<typeof yearlyQuarterlyDataSchema>;

export const inventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(["box", "pieces", "ream"]),
  stockAmount: z.number().int().min(0),
  stockMonth: z.number().int().min(1).max(12).optional(),
  yearlyData: z.record(z.string(), yearlyQuarterlyDataSchema).optional(), // {2026: {q1: {...}, q2: {...}}, 2025: {...}}
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const inventoryLevelSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  quantity: z.number(),
  safetyStock: z.number().optional(),
  updatedAt: z.date(),
});

export type InventoryLevel = z.infer<typeof inventoryLevelSchema>;

export const inventoryMovementTypeSchema = z.enum(["IN", "OUT", "ADJUSTMENT"]);

export type InventoryMovementType = z.infer<typeof inventoryMovementTypeSchema>;

export const inventoryMovementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  type: inventoryMovementTypeSchema,
  quantity: z.number(),
  reference: z.string().optional(),
  note: z.string().optional(),
  createdAt: z.date(),
});

export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;
