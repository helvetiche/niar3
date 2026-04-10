"use client";

import type { JSX } from "react";
import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PackageIcon,
  CaretLeftIcon,
  CaretRightIcon,
  TagIcon,
  StackIcon,
  CubeIcon,
  ArchiveIcon,
  DownloadIcon,
  XIcon,
} from "@phosphor-icons/react";
import { exportInventoryToExcel } from "@/lib/utils/excel-export";
import { logger } from "@/lib/logger";
import {
  useInventoryQuery,
  useCreateInventoryMutation,
  useUpdateQuarterlyDataMutation,
  useUpdateInventoryMutation,
  type CreateInventoryInput,
  type UpdateInventoryInput,
} from "@/lib/hooks/use-inventory";
import type { InventoryItem } from "@/lib/db/inventory-types";
import { InventoryFormModal } from "./InventoryFormModal";
import { MasonryModal } from "@/components/MasonryModal";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function Inventory(): JSX.Element {
  const [searchInput, setSearchInput] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [page, setPage] = useState(1);
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: "requested" | "received";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isUpdatingCell, setIsUpdatingCell] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportYears, setSelectedExportYears] = useState<number[]>([
    selectedYear,
  ]);

  const {
    data,
    isLoading,
    error,
    mutate: refetch,
  } = useInventoryQuery({
    limit: PAGE_SIZE,
    page,
    search: searchParam || null,
    category: null,
  });

  const createMutation = useCreateInventoryMutation();
  const updateQuarterlyMutation = useUpdateQuarterlyDataMutation();
  const updateMutation = useUpdateInventoryMutation(editItemId);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const currentPage = data?.page ?? 1;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParam(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const result: (number | "ellipsis")[] = [];
    if (currentPage <= 4) {
      result.push(1, 2, 3, 4, 5, "ellipsis", totalPages);
    } else if (currentPage >= totalPages - 3) {
      result.push(
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      result.push(
        1,
        "ellipsis",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "ellipsis",
        totalPages
      );
    }
    return result;
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchInput(e.target.value);
    },
    []
  );

  const handleCreateSubmit = (
    values: CreateInventoryInput | UpdateInventoryInput
  ): void => {
    createMutation.mutate(values as CreateInventoryInput, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        refetch();
      },
    });
  };

  const handleEditSubmit = (
    values: CreateInventoryInput | UpdateInventoryInput
  ): void => {
    if (!editItemId) return;
    updateMutation.mutate(values as UpdateInventoryInput, {
      onSuccess: () => {
        setEditItemId(null);
        refetch();
      },
    });
  };

  const handleStartEdit = (
    itemId: string,
    field: "requested" | "received",
    currentValue: number
  ): void => {
    setEditingCell({ itemId, field });
    setEditValue(String(currentValue));
    setIsUpdatingCell(false);
  };

  const handleSaveEdit = (): void => {
    if (!editingCell || isUpdatingCell) return;

    const trimmedValue = editValue.trim();

    // If empty, set to null
    if (trimmedValue === "") {
      const apiFieldName: "requestedQuantity" | "receivedQuantity" =
        editingCell.field === "requested" ? "requestedQuantity" : "receivedQuantity";

      setIsUpdatingCell(true);

      updateQuarterlyMutation.mutate(
        {
          itemId: editingCell.itemId,
          year: selectedYear,
          quarter: selectedQuarter,
          field: apiFieldName,
          value: null,
        },
        {
          onSuccess: () => {
            setEditingCell(null);
            setEditValue("");
            setIsUpdatingCell(false);
            refetch();
          },
          onError: (error: Error) => {
            logger.error("Failed to update quarterly data:", error);
            setIsUpdatingCell(false);
          },
        }
      );
      return;
    }

    const newValue = parseInt(trimmedValue);
    if (isNaN(newValue) || newValue < 0) {
      setEditingCell(null);
      setEditValue("");
      return;
    }

    const apiFieldName: "requestedQuantity" | "receivedQuantity" =
      editingCell.field === "requested" ? "requestedQuantity" : "receivedQuantity";

    setIsUpdatingCell(true);

    updateQuarterlyMutation.mutate(
      {
        itemId: editingCell.itemId,
        year: selectedYear,
        quarter: selectedQuarter,
        field: apiFieldName,
        value: newValue,
      },
      {
        onSuccess: () => {
          setEditingCell(null);
          setEditValue("");
          setIsUpdatingCell(false);
          refetch();
        },
        onError: (error: Error) => {
          logger.error("Failed to update quarterly data:", error);
          setIsUpdatingCell(false);
        },
      }
    );
  };

  const handleCancelEdit = (): void => {
    setEditingCell(null);
    setEditValue("");
    setIsUpdatingCell(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancelEdit();
    }
  };

  const handleExportExcel = async (): Promise<void> => {
    try {
      setIsExporting(true);

      // Fetch all items with current filters, paginating through results
      const allItems = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `/api/v1/inventory?limit=100&page=${page}${
            searchParam ? `&search=${encodeURIComponent(searchParam)}` : ""
          }`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch inventory items");
        }

        const data = await response.json();
        allItems.push(...(data.items || []));

        // Check if there are more pages
        if (data.pagination) {
          hasMore = page < data.pagination.totalPages;
        } else {
          hasMore = (data.items || []).length === 100;
        }

        page++;
      }

      await exportInventoryToExcel({
        items: allItems,
        years: selectedExportYears,
        month: new Date().toLocaleString("en-US", { month: "long" }).toUpperCase(),
      });
    } catch (error) {
      logger.error("Failed to export inventory:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBlur = (): void => {
    if (!isUpdatingCell) {
      setTimeout(() => {
        if (editingCell && !isUpdatingCell) {
          handleSaveEdit();
        }
      }, 100);
    }
  };

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <PackageIcon size={20} className="text-white" />
          </span>
          Inventory Management
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <CubeIcon size={12} className="text-white" />
            Stock Tracking
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <StackIcon size={12} className="text-white" />
            Quarterly Data
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <TagIcon size={12} className="text-white" />
            Category Filter
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Track and manage inventory items with quarterly requested and received
          quantities.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-1">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              weight="regular"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search by name..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-emerald-700 bg-emerald-950/50 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              aria-label="Search items by name"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:w-32"
            aria-label="Select year"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
            <option value={2029}>2029</option>
            <option value={2030}>2030</option>
          </select>
          <div className="flex rounded-lg border border-emerald-700 bg-emerald-950/50">
            {[1, 2, 3, 4].map((quarter) => (
              <button
                key={quarter}
                type="button"
                onClick={() => {
                  setSelectedQuarter(quarter);
                  setPage(1);
                }}
                className={`px-4 py-2.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  selectedQuarter === quarter
                    ? "bg-emerald-700 text-white"
                    : "text-white hover:bg-emerald-800"
                }`}
                aria-label={`Quarter ${quarter}`}
              >
                Q{quarter}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          <PlusIcon size={18} weight="regular" aria-hidden />
          Add Item
        </button>
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          disabled={isExporting || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export inventory to Excel"
        >
          <DownloadIcon size={18} weight="regular" aria-hidden />
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-emerald-700/60 bg-emerald-950/50 shadow-lg">
        {isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] table-fixed border-collapse">
              <thead>
                <tr className="bg-emerald-800">
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <PackageIcon size={16} weight="regular" />
                      No.
                    </div>
                  </th>
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <TagIcon size={16} weight="regular" />
                      Particulars
                    </div>
                  </th>
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <StackIcon size={16} weight="regular" />
                      Stocks
                    </div>
                  </th>
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <PlusIcon size={16} weight="regular" />
                      Requested
                    </div>
                  </th>
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <ArchiveIcon size={16} weight="regular" />
                      Received
                    </div>
                  </th>
                  <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                    <div className="flex items-center justify-center gap-2">
                      <CubeIcon size={16} weight="regular" />
                      Remaining
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <tr key={i} className="even:bg-emerald-900/30">
                    <td className="border border-emerald-700 px-4 py-4 text-center">
                      <div className="mx-auto h-5 w-8 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                    <td className="border border-emerald-700 px-4 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                    <td className="border border-emerald-700 px-4 py-4 text-center">
                      <div className="mx-auto h-4 w-16 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                    <td className="border border-emerald-700 px-4 py-4 text-center">
                      <div className="mx-auto h-4 w-12 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                    <td className="border border-emerald-700 px-4 py-4 text-center">
                      <div className="mx-auto h-4 w-12 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                    <td className="border border-emerald-700 px-4 py-4 text-center">
                      <div className="mx-auto h-4 w-12 animate-pulse rounded bg-emerald-700/50" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div className="px-6 py-4">
            <p className="text-sm text-rose-200" role="alert">
              Failed to load inventory items. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageIcon size={48} weight="duotone" className="text-white/40 mb-4" />
            <p className="text-sm text-white/70">
              {searchParam
                ? "No items match your search."
                : "No items yet. Add your first item to get started."}
            </p>
            {!searchParam && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                <PlusIcon size={18} weight="regular" aria-hidden />
                Add Item
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-emerald-800">
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <PackageIcon size={16} weight="regular" />
                        No.
                      </div>
                    </th>
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <TagIcon size={16} weight="regular" />
                        Particulars
                      </div>
                    </th>
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <StackIcon size={16} weight="regular" />
                        Stocks
                      </div>
                    </th>
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <PlusIcon size={16} weight="regular" />
                        Requested
                      </div>
                    </th>
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <ArchiveIcon size={16} weight="regular" />
                        Received
                      </div>
                    </th>
                    <th className="w-[16.66%] border border-emerald-700 px-4 py-3 text-center text-xs font-medium text-white">
                      <div className="flex items-center justify-center gap-2">
                        <CubeIcon size={16} weight="regular" />
                        Remaining
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: InventoryItem) => {
                    const quarterKey = `q${selectedQuarter}` as
                      | "q1"
                      | "q2"
                      | "q3"
                      | "q4";

                    // Extract quarterly data from yearlyData
                    const yearlyData = item.yearlyData?.[selectedYear] || {};
                    const quarterData = yearlyData[quarterKey] || {
                      requestedQuantity: null,
                      receivedQuantity: null,
                      baseQuantity: 0,
                    };

                    let prevRemaining = 0;
                    if (selectedQuarter > 1) {
                      const prevQuarterKey = `q${selectedQuarter - 1}` as
                        | "q1"
                        | "q2"
                        | "q3"
                        | "q4";
                      const prevYearlyData = item.yearlyData?.[selectedYear] || {};
                      const prevQuarterData = prevYearlyData[prevQuarterKey] || {
                        requestedQuantity: null,
                        receivedQuantity: null,
                        baseQuantity: 0,
                      };
                      const prevTotalRequested =
                        (prevQuarterData.baseQuantity || 0) +
                        (prevQuarterData.requestedQuantity ?? 0);
                      prevRemaining =
                        prevTotalRequested - (prevQuarterData.receivedQuantity ?? 0);
                    } else if (selectedQuarter === 1) {
                      // Q1 of current year - check Q4 of previous year
                      const prevYearData = item.yearlyData?.[selectedYear - 1];
                      if (prevYearData) {
                        const prevYearQ4 = prevYearData.q4 || {
                          requestedQuantity: null,
                          receivedQuantity: null,
                          baseQuantity: 0,
                        };
                        const prevYearQ4Total =
                          (prevYearQ4.baseQuantity || 0) +
                          (prevYearQ4.requestedQuantity ?? 0);
                        prevRemaining =
                          prevYearQ4Total - (prevYearQ4.receivedQuantity ?? 0);
                      }
                    }

                    // Calculate totals for remaining (includes carryover)
                    const totalRequested =
                      (quarterData.baseQuantity || 0) +
                      (quarterData.requestedQuantity ?? 0) +
                      (prevRemaining > 0 ? prevRemaining : 0);
                    const totalReceived =
                      (quarterData.receivedQuantity ?? 0) +
                      (prevRemaining < 0 ? Math.abs(prevRemaining) : 0);
                    const remaining = totalRequested - totalReceived;

                    // Display values (only what user inputted, not including carryover)
                    const displayRequested = quarterData.requestedQuantity ?? 0;
                    const displayReceived = quarterData.receivedQuantity ?? 0;

                    // Check if values have been set by user
                    const hasRequestedValue =
                      quarterData.requestedQuantity !== null &&
                      quarterData.requestedQuantity !== undefined;
                    const hasReceivedValue =
                      quarterData.receivedQuantity !== null &&
                      quarterData.receivedQuantity !== undefined;

                    return (
                      <tr key={item.id} className="even:bg-emerald-900/30">
                        <td className="border border-emerald-700 px-4 py-3 text-center text-sm font-medium text-white hover:bg-emerald-800/50 transition-colors">
                          {item.sku.replace("ITEM-", "")}
                        </td>
                        <td className="border border-emerald-700 px-4 py-3 hover:bg-emerald-800/50 transition-colors">
                          <div className="text-sm font-medium text-white">
                            {item.name}
                          </div>
                        </td>
                        <td className="border border-emerald-700 px-4 py-3 text-center hover:bg-emerald-800/50 transition-colors">
                          <div className="text-sm font-medium text-white">
                            {item.stockAmount} {item.unit}
                          </div>
                        </td>
                        <td className="border border-emerald-700 px-4 py-3 hover:bg-emerald-800/50 transition-colors group">
                          {editingCell?.itemId === item.id &&
                          editingCell?.field === "requested" ? (
                            <div className="relative">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleBlur}
                                className="w-full text-center text-sm bg-emerald-950 border border-emerald-500 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                autoFocus
                                min="0"
                              />
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                              onClick={() =>
                                handleStartEdit(
                                  item.id,
                                  "requested",
                                  quarterData.requestedQuantity ?? 0
                                )
                              }
                            >
                              <div className="text-sm text-white">
                                {hasRequestedValue ? displayRequested : "—"}
                              </div>
                              <span className="inline-flex items-center rounded-full bg-emerald-700/40 px-2 py-0.5 text-xs text-white/70 whitespace-nowrap">
                                {prevRemaining > 0 ? `+${prevRemaining}` : "—"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="border border-emerald-700 px-4 py-3 hover:bg-emerald-800/50 transition-colors group">
                          {editingCell?.itemId === item.id &&
                          editingCell?.field === "received" ? (
                            <div className="relative">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleBlur}
                                className="w-full text-center text-sm bg-emerald-950 border border-emerald-500 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                autoFocus
                                min="0"
                              />
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                              onClick={() =>
                                handleStartEdit(
                                  item.id,
                                  "received",
                                  quarterData.receivedQuantity ?? 0
                                )
                              }
                            >
                              <div className="text-sm text-white">
                                {hasReceivedValue ? displayReceived : "—"}
                              </div>
                              <span className="inline-flex items-center rounded-full bg-emerald-700/40 px-2 py-0.5 text-xs text-white/70 whitespace-nowrap">
                                {prevRemaining < 0
                                  ? `+${Math.abs(prevRemaining)}`
                                  : "—"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="border border-emerald-700 px-4 py-3 text-center hover:bg-emerald-800/50 transition-colors">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-emerald-700/40 px-2 py-0.5 text-xs text-white/70 whitespace-nowrap">
                              {remaining !== 0 ? remaining : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from(
                    { length: Math.max(0, PAGE_SIZE - items.length) },
                    (_, i) => (
                      <tr
                        key={`empty-${i}`}
                        className="even:bg-emerald-900/30 group cursor-pointer transition-colors relative"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <td
                          colSpan={6}
                          className="border border-emerald-700 px-4 py-4 text-center transition-colors group-hover:bg-emerald-800/50"
                        >
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PackageIcon
                              size={18}
                              weight="regular"
                              className="text-white/70"
                            />
                            <span className="text-white/70 font-medium text-sm">
                              Add Item
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 border-t border-emerald-700 px-6 py-4 sm:flex-row">
              <p className="text-xs text-white/70">
                Showing {startItem}-{endItem} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700 text-white transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <CaretLeftIcon size={18} weight="bold" aria-hidden />
                </button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((n, i) =>
                    n === "ellipsis" ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-white/40">
                        ...
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                          currentPage === n
                            ? "bg-white text-emerald-900"
                            : "border border-emerald-700 text-white hover:bg-emerald-800"
                        }`}
                        aria-current={currentPage === n ? "page" : undefined}
                        aria-label={`Page ${n}`}
                      >
                        {n}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700 text-white transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Next page"
                >
                  <CaretRightIcon size={18} weight="bold" aria-hidden />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <InventoryFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        error={null}
      />

      <InventoryFormModal
        isOpen={Boolean(editItemId)}
        onClose={() => setEditItemId(null)}
        mode="edit"
        initialValues={
          editItemId ? items.find((i: InventoryItem) => i.id === editItemId) : undefined
        }
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
        error={null}
      />

      <MasonryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        panelClassName="max-w-md"
        duration={0.4}
      >
        {(close) => (
          <div className="rounded-xl border border-white/45 bg-white/15 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 border border-white/30">
                  <DownloadIcon size={20} className="text-white" weight="regular" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">Export Inventory</h3>
                  <p className="text-xs text-white/70">Select years to include</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/25"
              >
                <XIcon size={16} />
              </button>
            </div>
            <p className="text-xs text-white/80 mb-6 leading-5">
              Choose which years to include in your Excel export. Each selected year
              will be saved as a separate sheet in the workbook with all quarterly data
              and calculations.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    if (selectedExportYears.includes(year)) {
                      setSelectedExportYears(
                        selectedExportYears.filter((y) => y !== year)
                      );
                    } else {
                      setSelectedExportYears([...selectedExportYears, year].sort());
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedExportYears.includes(year)
                      ? "bg-white text-emerald-900 shadow-sm shadow-black/10"
                      : "border border-white/50 bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/80 mb-6">
              {selectedExportYears.length} year
              {selectedExportYears.length !== 1 ? "s" : ""} selected •{" "}
              {selectedExportYears.length} sheet
              {selectedExportYears.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-lg border border-white/50 bg-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportExcel();
                  close();
                }}
                disabled={selectedExportYears.length === 0 || isExporting}
                className="flex-1 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-black/10"
              >
                Export
              </button>
            </div>
          </div>
        )}
      </MasonryModal>
    </section>
  );
}
