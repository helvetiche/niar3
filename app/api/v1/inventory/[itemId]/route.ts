import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryItem,
} from "@/lib/firebase-admin/inventory";

const updateItemBodySchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(["box", "pieces", "ream"]).optional(),
  stockAmount: z.number().int().min(0).optional(),
  stockYear: z.number().int().min(2000).max(9999).optional(),
  stockMonth: z.number().int().min(1).max(12).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const item = await getInventoryItem(itemId);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const json = await request.json();
    const parsed = updateItemBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateInventoryItem(itemId, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    await deleteInventoryItem(itemId);

    return NextResponse.json({ success: true, id: itemId }, { status: 200 });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
