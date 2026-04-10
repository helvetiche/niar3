import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  getInventoryItemsPaginated,
  createInventoryItem,
} from "@/lib/firebase-admin/inventory";
import { logger } from "@/lib/logger";

const createItemBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(["box", "pieces", "ream"]),
  stockAmount: z.number().int().min(0),
  stockMonth: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .default(() => new Date().getMonth() + 1),
  year: z.number().int().min(2000).max(9999).default(2026),
  quarter: z.number().int().min(1).max(4).optional().default(1),
  requestedQuantity: z.number().int().min(0).optional().default(0),
  receivedQuantity: z.number().int().min(0).optional().default(0),
  baseQuantity: z.number().int().min(0).optional().default(0),
});

const limitSchema = z.coerce.number().min(1).max(100).default(16);
const pageSchema = z.coerce.number().min(1).default(1);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = limitSchema.parse(searchParams.get("limit") ?? 16);
    const page = pageSchema.parse(searchParams.get("page") ?? 1);
    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const result = await getInventoryItemsPaginated({
      limit,
      page,
      search: search || null,
      category: category || null,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const json = await request.json();
    const parsed = createItemBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await createInventoryItem(parsed.data);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
