"use client";

import { useState } from "react";
import { XIcon, PackageIcon, StackIcon, CubeIcon } from "@phosphor-icons/react";
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
} from "@/lib/hooks/use-inventory";
import type { InventoryItem } from "@/lib/db/inventory-types";
import { MasonryModal } from "@/components/MasonryModal";

type InventoryFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialValues?: InventoryItem;
  onSubmit: (values: CreateInventoryInput | UpdateInventoryInput) => void;
  isSubmitting: boolean;
  error: string | null;
};

const UNITS: Array<{
  value: "box" | "pieces" | "ream";
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "box",
    label: "Box(es)",
    icon: <PackageIcon size={18} weight="regular" />,
  },
  {
    value: "pieces",
    label: "Pieces",
    icon: <StackIcon size={18} weight="regular" />,
  },
  {
    value: "ream",
    label: "Ream(s)",
    icon: <CubeIcon size={18} weight="regular" />,
  },
];

export function InventoryFormModal({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
  isSubmitting,
  error,
}: InventoryFormModalProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [stockAmount, setStockAmount] = useState<number | "">(
    initialValues?.stockAmount ?? "",
  );
  const [selectedUnit, setSelectedUnit] = useState<"box" | "pieces" | "ream">(
    (initialValues?.unit as "box" | "pieces" | "ream") || "pieces",
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const values: CreateInventoryInput = {
      sku: `ITEM-${Date.now()}`, // Auto-generate SKU
      name: name.trim(),
      unit: selectedUnit,
      stockAmount: stockAmount === "" ? 0 : stockAmount,
    };

    onSubmit(values);
  };

  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="max-w-lg"
      duration={0.4}
    >
      {(close) => (
        <div className="rounded-xl border border-white/45 bg-white/15 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/20 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 border border-white/30">
                <PackageIcon
                  size={20}
                  className="text-white"
                  weight="regular"
                />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">
                  {mode === "create" ? "Add New Item" : "Edit Item"}
                </h2>
                <p className="mt-0.5 text-xs text-white/70">
                  {mode === "create"
                    ? "Create a new inventory item"
                    : "Update item details"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-white/90 transition hover:bg-white/25 disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <XIcon size={16} weight="regular" />
            </button>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs text-white/80 leading-5 mb-5">
              {mode === "create"
                ? "Add a new item to your inventory. Provide the item name, stock amount, and select the unit of measurement. The item will be automatically assigned a unique SKU."
                : "Update the details of this inventory item. You can change the name, stock amount, and unit of measurement."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-5">
            <div className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="item-name"
                  className="block text-sm font-medium text-white"
                >
                  Item Name
                </label>
                <input
                  id="item-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name..."
                  className="w-full rounded-lg border border-white/50 bg-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-all focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>

              {/* Stock Amount Field */}
              <div className="space-y-2">
                <label
                  htmlFor="item-stock-amount"
                  className="block text-sm font-medium text-white"
                >
                  Stock Amount
                </label>
                <input
                  id="item-stock-amount"
                  type="number"
                  min={0}
                  required
                  value={stockAmount}
                  onChange={(e) =>
                    setStockAmount(
                      e.target.value === ""
                        ? ""
                        : parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-white/50 bg-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-all focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={isSubmitting}
                />
              </div>

              {/* Unit Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white">
                  Unit of Measurement
                </label>
                <div className="flex gap-3">
                  {UNITS.map((unit) => (
                    <button
                      key={unit.value}
                      type="button"
                      onClick={() => setSelectedUnit(unit.value)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 transition-all text-sm font-medium ${
                        selectedUnit === unit.value
                          ? "border-white bg-white text-emerald-900 shadow-sm shadow-black/10"
                          : "border-white/50 bg-white/20 text-white hover:bg-white/30"
                      }`}
                      disabled={isSubmitting}
                    >
                      <span className="flex-shrink-0">{unit.icon}</span>
                      <span>{unit.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-rose-500/50 bg-rose-900/20 p-4">
                <p className="text-sm text-rose-200" role="alert">
                  {error}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t border-white/20 pt-5">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/50 bg-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/30"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-black/10 transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </div>
                ) : mode === "create" ? (
                  "Create Item"
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </MasonryModal>
  );
}
