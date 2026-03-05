"use client";

import { useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  DatabaseIcon,
  UploadSimpleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { WorkspaceStepper } from "@/components/WorkspaceStepper";
import { getErrorMessage } from "@/lib/utils";

interface Issue {
  lotCode: string;
  issueType: string;
  field: string;
  ifrValue: string | number;
  consolidatedValue: string | number;
  difference?: number;
  severity: "error" | "warning";
  reason: string;
}

interface CheckResult {
  success: boolean;
  summary: {
    totalLots: number;
    consolidatedLots: number;
    matchingLots: number;
    totalIssues: number;
    errors: number;
    warnings: number;
  };
  issues: Issue[];
}

const ITEMS_PER_PAGE = 20;

export default function IFRCheckerTool() {
  const ifrFileInputRef = useRef<HTMLInputElement | null>(null);
  const consolidatedFileInputRef = useRef<HTMLInputElement | null>(null);

  const [ifrFiles, setIfrFiles] = useState<File[]>([]);
  const [consolidatedFile, setConsolidatedFile] = useState<File | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  // Pagination, search, and filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warning">("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");

  const handleIFRFilesSelection = (incoming: FileList | null) => {
    setIfrFiles(Array.from(incoming ?? []));
    setResult(null);
  };

  const handleConsolidatedFileSelection = (incoming: FileList | null) => {
    const file = incoming?.[0];
    if (file) {
      setConsolidatedFile(file);
      setResult(null);
    }
  };

  const runValidation = async () => {
    if (ifrFiles.length === 0 || !consolidatedFile) {
      toast.error("Please upload both IFR files and consolidated file.");
      return;
    }

    setIsChecking(true);

    try {
      const formData = new FormData();

      for (const file of ifrFiles) {
        formData.append("ifrFiles", file);
      }
      formData.append("consolidatedFile", consolidatedFile);

      const res = await fetch("/api/v1/ifr-checker", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Validation failed");
      }

      const data = await res.json();
      setResult(data);
      setCurrentPage(1); // Reset to first page
      setSearchQuery(""); // Reset search
      setSeverityFilter("all"); // Reset filters
      setFieldFilter("all");

      if (data.issues.length === 0) {
        toast.success("Perfect match! No issues found.");
      } else {
        toast.success(`Validation complete. Found ${data.issues.length} issue(s).`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to validate files."));
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Get unique fields for filter dropdown
  const uniqueFields = useMemo(() => {
    if (!result) return [];
    const fields = new Set(result.issues.map(issue => issue.field));
    return Array.from(fields).sort();
  }, [result]);

  // Filter and search issues
  const filteredIssues = useMemo(() => {
    if (!result) return [];

    let filtered = result.issues;

    // Apply severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(issue => issue.severity === severityFilter);
    }

    // Apply field filter
    if (fieldFilter !== "all") {
      filtered = filtered.filter(issue => issue.field === fieldFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(issue =>
        issue.lotCode.toLowerCase().includes(query) ||
        issue.field.toLowerCase().includes(query) ||
        issue.reason.toLowerCase().includes(query) ||
        String(issue.ifrValue).toLowerCase().includes(query) ||
        String(issue.consolidatedValue).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [result, severityFilter, fieldFilter, searchQuery]);

  // Paginate filtered issues
  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredIssues.slice(startIndex, endIndex);
  }, [filteredIssues, currentPage]);

  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const steps = [
    {
      title: "Upload IFR Files",
      description: "Source data",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Upload IFR Files (Source Data)
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Upload one or more Excel files (.xlsx or .xls) containing the
              original IFR data.
            </p>
          </div>

          <input
            ref={ifrFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => handleIFRFilesSelection(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => ifrFileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleIFRFilesSelection(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop IFR files here, or click to browse
            </span>
          </button>

          {ifrFiles.length > 0 && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                {ifrFiles.length} IFR file(s) selected
              </p>
              <ul className="space-y-1 text-sm text-white/80">
                {ifrFiles.map((file, idx) => (
                  <li key={idx} className="truncate">
                    • {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Upload Consolidated",
      description: "File to validate",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Upload Consolidated File
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Upload the consolidated Excel file that you want to validate
              against the IFR source data.
            </p>
          </div>

          <input
            ref={consolidatedFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleConsolidatedFileSelection(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => consolidatedFileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleConsolidatedFileSelection(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/45 bg-white/5 px-6 py-10 text-base text-white transition hover:border-white hover:bg-white/10"
          >
            <UploadSimpleIcon size={34} className="text-white" />
            <span className="font-medium">
              Drag and drop consolidated file here, or click to browse
            </span>
          </button>

          {consolidatedFile && (
            <div className="rounded-xl border border-white/35 bg-white/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircleIcon size={16} className="text-white" />
                Consolidated file selected
              </p>
              <p className="text-sm text-white/80">• {consolidatedFile.name}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Review",
      description: "Run validation",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Review & Validate
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Review your files and run the validation check.
            </p>
          </div>

          <div className="rounded-lg border border-white/30 bg-white/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Summary</h4>
            <div className="space-y-2 text-sm text-white/90">
              <p>
                <span className="text-white/70">IFR Files:</span>{" "}
                {ifrFiles.length}
              </p>
              <p>
                <span className="text-white/70">Consolidated File:</span>{" "}
                {consolidatedFile?.name || "Not selected"}
              </p>
            </div>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/30 bg-white/5 p-4">
                <h4 className="mb-3 text-sm font-medium text-white">
                  Validation Results
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm text-white/90">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon size={16} className="text-white/60" />
                      Total Lots in IFR: {result.summary.totalLots}
                    </div>
                    <div className="flex items-center gap-2">
                      <DatabaseIcon size={16} className="text-white/60" />
                      Consolidated Lots: {result.summary.consolidatedLots}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon size={16} className="text-white/60" />
                      Matching Lots: {result.summary.matchingLots}
                    </div>
                    <div className="flex items-center gap-2">
                      <WarningIcon size={16} className="text-white/60" />
                      Total Issues: {result.summary.totalIssues}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircleIcon size={16} className="text-white/60" />
                      Errors: {result.summary.errors}
                    </div>
                    <div className="flex items-center gap-2">
                      <WarningIcon size={16} className="text-white/60" />
                      Warnings: {result.summary.warnings}
                    </div>
                  </div>
                </div>
              </div>

              {result.issues.length === 0 ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center">
                  <CheckCircleIcon
                    size={64}
                    weight="fill"
                    className="mx-auto mb-4 text-green-300"
                  />
                  <div className="text-2xl font-semibold text-white">
                    Perfect Match!
                  </div>
                  <p className="mt-2 text-white/80">
                    The consolidated file matches the IFR data perfectly. No
                    issues found.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="rounded-lg border border-white/30 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3 py-2">
                        <MagnifyingGlassIcon
                          size={18}
                          className="shrink-0 text-white/70"
                        />
                        <input
                          type="search"
                          placeholder="Search by lot code, field, or reason..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3 py-2">
                          <FunnelIcon size={16} className="text-white/70" />
                          <select
                            value={severityFilter}
                            onChange={(e) => {
                              setSeverityFilter(e.target.value as "all" | "error" | "warning");
                              setCurrentPage(1);
                            }}
                            className="bg-transparent text-sm text-white focus:outline-none"
                          >
                            <option value="all">All Severity</option>
                            <option value="error">Errors Only</option>
                            <option value="warning">Warnings Only</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3 py-2">
                          <FunnelIcon size={16} className="text-white/70" />
                          <select
                            value={fieldFilter}
                            onChange={(e) => {
                              setFieldFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="bg-transparent text-sm text-white focus:outline-none"
                          >
                            <option value="all">All Fields</option>
                            {uniqueFields.map((field) => (
                              <option key={field} value={field}>
                                {field}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                      Showing {paginatedIssues.length} of {filteredIssues.length} issue(s)
                      {filteredIssues.length !== result.issues.length && ` (filtered from ${result.issues.length} total)`}
                    </p>
                  </div>

                  {/* Issues Table */}
                  <div className="rounded-lg border border-white/30 bg-white/5 p-4">
                    <h4 className="mb-3 text-sm font-medium text-white">
                      Issues Found
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-white/20">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/20 bg-white/5">
                          <tr className="text-left text-white">
                            <th className="border-r border-white/10 p-3 font-semibold">
                              Severity
                            </th>
                            <th className="border-r border-white/10 p-3 font-semibold">
                              Lot Code
                            </th>
                            <th className="border-r border-white/10 p-3 font-semibold">
                              Field
                            </th>
                            <th className="border-r border-white/10 p-3 font-semibold">
                              IFR Value
                            </th>
                            <th className="border-r border-white/10 p-3 font-semibold">
                              Consolidated
                            </th>
                            <th className="border-r border-white/10 p-3 font-semibold">
                              Difference
                            </th>
                            <th className="p-3 font-semibold">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedIssues.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-white/60">
                                No issues match your search criteria
                              </td>
                            </tr>
                          ) : (
                            paginatedIssues.map((issue, idx) => (
                              <tr
                                key={idx}
                                className={`border-b border-white/10 ${
                                  issue.severity === "error"
                                    ? "bg-red-500/5 hover:bg-red-500/10"
                                    : "bg-yellow-500/5 hover:bg-yellow-500/10"
                                } transition`}
                              >
                                <td className="border-r border-white/10 p-3">
                                  {issue.severity === "error" ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                                      <XCircleIcon size={14} weight="fill" />
                                      ERROR
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
                                      <WarningIcon size={14} weight="fill" />
                                      WARNING
                                    </span>
                                  )}
                                </td>
                                <td className="border-r border-white/10 p-3 font-mono font-semibold text-white">
                                  {issue.lotCode}
                                </td>
                                <td className="border-r border-white/10 p-3 text-white/80">
                                  {issue.field}
                                </td>
                                <td className="border-r border-white/10 p-3 font-mono text-white">
                                  {issue.ifrValue}
                                </td>
                                <td className="border-r border-white/10 p-3 font-mono text-white">
                                  {issue.consolidatedValue}
                                </td>
                                <td className="border-r border-white/10 p-3 font-mono">
                                  {issue.difference !== undefined ? (
                                    <span
                                      className={
                                        issue.difference > 0
                                          ? "text-red-300"
                                          : "text-green-300"
                                      }
                                    >
                                      {issue.difference > 0 ? "+" : ""}
                                      {typeof issue.difference === "number"
                                        ? issue.difference.toFixed(2)
                                        : issue.difference}
                                    </span>
                                  ) : (
                                    <span className="text-white/40">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-xs text-white/70">
                                  {issue.reason}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-white/60">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <CaretLeftIcon size={14} weight="bold" />
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                            <CaretRightIcon size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <ShieldCheckIcon size={18} className="text-white" />
          </span>
          IFR Checker
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <DatabaseIcon size={12} className="text-white" />
            Data Validation
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <CheckCircleIcon size={12} className="text-white" />
            Quality Assurance
          </span>
        </div>
        <p className="mt-2 text-sm text-white/85">
          Validate consolidated files against source IFR data and identify
          discrepancies automatically.
        </p>
      </div>

      <WorkspaceStepper
        steps={steps}
        onComplete={() => void runValidation()}
        canProceed={(step) => {
          if (step === 0) return ifrFiles.length > 0;
          if (step === 1) return !!consolidatedFile;
          return true;
        }}
        completeButtonText={isChecking ? "Validating..." : "Run Validation"}
      />
    </section>
  );
}
