import { NextResponse } from "next/server";
import { getInventoryCategories } from "@/lib/firebase-admin/inventory";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await getInventoryCategories();
    return NextResponse.json(categories);
  } catch (error) {
    logger.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
