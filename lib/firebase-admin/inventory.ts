import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./app";
import type { InventoryItem, QuarterlyData } from "@/lib/db/inventory-types";

function getDb() {
  return getFirestore(getFirebaseAdminApp());
}

function inventoryCollection() {
  return getDb().collection("inventory");
}

function toInventoryItem(
  id: string,
  data: Record<string, unknown>
): InventoryItem | null {
  if (!data) return null;

  return {
    id,
    sku: typeof data.sku === "string" ? data.sku : "",
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : undefined,
    category: typeof data.category === "string" ? data.category : undefined,
    unit:
      data.unit === "box" || data.unit === "pieces" || data.unit === "ream"
        ? data.unit
        : "pieces",
    stockAmount: typeof data.stockAmount === "number" ? data.stockAmount : 0,
    stockMonth: typeof data.stockMonth === "number" ? data.stockMonth : undefined,
    yearlyData: data.yearlyData as
      | Record<string, Record<string, QuarterlyData | undefined>>
      | undefined,
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    createdAt: new Date(
      typeof data.createdAt === "number" ? data.createdAt : Date.now()
    ),
    updatedAt: new Date(
      typeof data.updatedAt === "number" ? data.updatedAt : Date.now()
    ),
  };
}

export async function getInventoryItemsPaginated(params: {
  limit: number;
  page: number;
  search?: string | null;
  category?: string | null;
}): Promise<{
  items: InventoryItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  nextCursor: string | null;
}> {
  const { limit, page, search, category } = params;

  let query = inventoryCollection().where("isActive", "==", true);

  if (category) {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();

  let items = snapshot.docs
    .map((doc) => toInventoryItem(doc.id, doc.data()))
    .filter((item): item is InventoryItem => item !== null);

  // Client-side search filtering (Firestore doesn't support full-text search)
  if (search) {
    const searchLower = search.toLowerCase();
    items = items.filter((item) => item.name.toLowerCase().includes(searchLower));
  }

  // Sort by SKU numerically
  items.sort((a, b) => {
    const aNum = parseInt(a.sku.replace("ITEM-", ""), 10) || 0;
    const bNum = parseInt(b.sku.replace("ITEM-", ""), 10) || 0;
    return aNum - bNum;
  });

  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    page,
    totalPages,
    totalCount,
    nextCursor: null,
  };
}

export async function getInventoryCategories(): Promise<string[]> {
  const snapshot = await inventoryCollection().where("isActive", "==", true).get();

  const categoriesSet = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.category && typeof data.category === "string") {
      categoriesSet.add(data.category);
    }
  });

  return Array.from(categoriesSet).sort();
}

export async function createInventoryItem(input: {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: "box" | "pieces" | "ream";
  stockAmount: number;
  stockMonth?: number;
  year?: number;
  quarter?: number;
  requestedQuantity?: number;
  receivedQuantity?: number;
  baseQuantity?: number;
}): Promise<InventoryItem> {
  const ref = inventoryCollection().doc();
  const now = Date.now();
  const year = input.year || 2026;

  const quarterData: QuarterlyData = {
    requestedQuantity: input.requestedQuantity || 0,
    receivedQuantity: input.receivedQuantity || 0,
    baseQuantity: input.baseQuantity || 0,
  };

  const yearlyData: Record<string, Record<string, QuarterlyData>> = {};
  yearlyData[year] = {
    q1: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
    q2: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
    q3: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
    q4: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
  };

  // Set the specific quarter if provided
  if (input.quarter && input.quarter >= 1 && input.quarter <= 4) {
    const quarterKey = `q${input.quarter}` as "q1" | "q2" | "q3" | "q4";
    yearlyData[year][quarterKey] = quarterData;
  }

  const item = {
    sku: input.sku,
    name: input.name,
    description: input.description,
    category: input.category,
    unit: input.unit,
    stockAmount: input.stockAmount,
    stockMonth: input.stockMonth,
    yearlyData,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(item);

  return toInventoryItem(ref.id, item as unknown as Record<string, unknown>)!;
}

export async function updateInventoryItem(
  id: string,
  updates: {
    sku?: string;
    name?: string;
    description?: string;
    category?: string;
    unit?: "box" | "pieces" | "ream";
    stockAmount?: number;
    stockMonth?: number;
  }
): Promise<InventoryItem | null> {
  const ref = inventoryCollection().doc(id);
  const existing = await ref.get();

  if (!existing.exists) return null;

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (updates.sku !== undefined) payload.sku = updates.sku;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.stockAmount !== undefined) payload.stockAmount = updates.stockAmount;
  if (updates.stockMonth !== undefined) payload.stockMonth = updates.stockMonth;

  await ref.update(payload);

  const updated = await ref.get();
  return toInventoryItem(updated.id, updated.data() || {});
}

export async function updateInventoryQuarterlyData(
  id: string,
  year: number,
  quarter: number,
  field: "requestedQuantity" | "receivedQuantity",
  value: number | null
): Promise<InventoryItem | null> {
  if (quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4");
  }

  const ref = inventoryCollection().doc(id);
  const existing = await ref.get();

  if (!existing.exists) return null;

  const data = existing.data();
  const yearlyData =
    (data?.yearlyData as Record<string, Record<string, QuarterlyData>>) || {};

  // Initialize year if it doesn't exist
  if (!yearlyData[year]) {
    yearlyData[year] = {
      q1: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
      q2: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
      q3: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
      q4: { requestedQuantity: null, receivedQuantity: null, baseQuantity: 0 },
    };
  }

  const quarterKey = `q${quarter}` as "q1" | "q2" | "q3" | "q4";
  const currentQuarterData = yearlyData[year][quarterKey] || {
    requestedQuantity: null,
    receivedQuantity: null,
    baseQuantity: 0,
  };

  const updatedQuarterData = {
    ...currentQuarterData,
    [field]: value,
  };

  yearlyData[year][quarterKey] = updatedQuarterData;

  await ref.update({
    yearlyData,
    updatedAt: Date.now(),
  });

  const updated = await ref.get();
  return toInventoryItem(updated.id, updated.data() || {});
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const ref = inventoryCollection().doc(id);
  await ref.update({
    isActive: false,
    updatedAt: Date.now(),
  });
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const ref = inventoryCollection().doc(id);
  const snap = await ref.get();

  if (!snap.exists) return null;

  return toInventoryItem(snap.id, snap.data() || {});
}
