"use client";

import useSWR from "swr";
import { z } from "zod";
import type { InventoryItem } from "@/lib/db/inventory-types";

export type InventoryQueryParams = {
  limit?: number;
  page?: number;
  search?: string | null;
  category?: string | null;
  cursor?: string | null;
};

export type InventoryPaginatedResponse = {
  items: InventoryItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  nextCursor: string | null;
};

const createInventoryInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(["box", "pieces", "ream"]),
  stockAmount: z.number().int().min(0),
  stockMonth: z.number().int().min(1).max(12).optional(),
  requestedQuantity: z.number().int().min(0).optional(),
  receivedQuantity: z.number().int().min(0).optional(),
});

export type CreateInventoryInput = z.infer<typeof createInventoryInputSchema>;

export type UpdateInventoryInput = CreateInventoryInput & { id: string };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function useInventoryQuery(params: InventoryQueryParams = {}) {
  const {
    limit = 16,
    page = 1,
    search,
    category,
    cursor,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  searchParams.set("page", String(page));
  if (search) searchParams.set("search", search);
  if (category) searchParams.set("category", category);
  if (cursor) searchParams.set("cursor", cursor);

  const { data, error, isLoading, mutate } = useSWR<InventoryPaginatedResponse>(
    `/api/v1/inventory?${searchParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

export function useCreateInventoryMutation() {
  return {
    mutate: async (
      payload: CreateInventoryInput,
      options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      }
    ) => {
      try {
        const parsedPayload = createInventoryInputSchema.parse(payload);

        const response = await fetch("/api/v1/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsedPayload),
        });

        if (!response.ok) {
          throw new Error("Failed to create inventory item");
        }

        const json = await response.json();
        options?.onSuccess?.();
        return json as InventoryItem;
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      }
    },
    isPending: false,
    error: null,
  };
}

export function useUpdateInventoryMutation(id: string | null) {
  return {
    mutate: async (
      payload: UpdateInventoryInput,
      options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      }
    ) => {
      try {
        if (!id) throw new Error("No item ID provided");

        const response = await fetch(`/api/v1/inventory/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to update inventory item");
        }

        const json = await response.json();
        options?.onSuccess?.();
        return json;
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      }
    },
    isPending: false,
    error: null,
  };
}

export function useUpdateQuarterlyDataMutation() {
  return {
    mutate: async (
      {
        itemId,
        year,
        quarter,
        field,
        value,
      }: {
        itemId: string;
        year: number;
        quarter: number;
        field: "requestedQuantity" | "receivedQuantity";
        value: number | null;
      },
      options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      }
    ) => {
      try {
        const response = await fetch(`/api/v1/inventory/${itemId}/quarterly`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ year, quarter, field, value }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to update quarterly data: ${response.status} ${errorText}`
          );
        }

        const json = await response.json();
        options?.onSuccess?.();
        return json;
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      }
    },
    isPending: false,
    error: null,
  };
}
