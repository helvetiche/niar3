import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateInventoryQuarterlyData } from "@/lib/firebase-admin/inventory";
import { logger } from "@/lib/logger";

const updateQuarterlyBodySchema = z.object({
  year: z.number().int().min(2000).max(9999),
  quarter: z.number().int().min(1).max(4),
  field: z.enum(["requestedQuantity", "receivedQuantity"]),
  value: z.number().int().min(0).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const json = await request.json();
    const parsed = updateQuarterlyBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { year, quarter, field, value } = parsed.data;

    const updated = await updateInventoryQuarterlyData(
      itemId,
      year,
      quarter,
      field,
      value
    );

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    logger.error("Error updating quarterly data:", error);
    return NextResponse.json(
      { error: "Failed to update quarterly data" },
      { status: 500 }
    );
  }
}
