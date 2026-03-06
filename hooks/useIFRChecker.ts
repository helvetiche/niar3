import { useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
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

export function useIFRChecker() {
  const ifrFileInputRef = useRef<HTMLInputElement | null>(null);
  const consolidatedFileInputRef = useRef<HTMLInputElement | null>(null);

  const [ifrFiles, setIfrFiles] = useState<File[]>([]);
  const [consolidatedFile, setConsolidatedFile] = useState<File | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "error" | "warning"
  >("all");
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
      setCurrentPage(1);
      setSearchQuery("");
      setSeverityFilter("all");
      setFieldFilter("all");

      if (data.issues.length === 0) {
        toast.success("Perfect match! No issues found.");
      } else {
        toast.success(
          `Validation complete. Found ${data.issues.length} issue(s).`,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to validate files."));
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  };

  const uniqueFields = useMemo(() => {
    if (!result) return [];
    const fields = new Set(result.issues.map((issue) => issue.field));
    return Array.from(fields).sort();
  }, [result]);

  const filteredIssues = useMemo(() => {
    if (!result) return [];

    let filtered = result.issues;

    if (severityFilter !== "all") {
      filtered = filtered.filter((issue) => issue.severity === severityFilter);
    }

    if (fieldFilter !== "all") {
      filtered = filtered.filter((issue) => issue.field === fieldFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.lotCode.toLowerCase().includes(query) ||
          issue.field.toLowerCase().includes(query) ||
          issue.reason.toLowerCase().includes(query) ||
          String(issue.ifrValue).toLowerCase().includes(query) ||
          String(issue.consolidatedValue).toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [result, severityFilter, fieldFilter, searchQuery]);

  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredIssues.slice(startIndex, endIndex);
  }, [filteredIssues, currentPage]);

  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSeverityFilterChange = (value: "all" | "error" | "warning") => {
    setSeverityFilter(value);
    setCurrentPage(1);
  };

  const handleFieldFilterChange = (value: string) => {
    setFieldFilter(value);
    setCurrentPage(1);
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 0) return ifrFiles.length > 0;
    if (step === 1) return !!consolidatedFile;
    return true;
  };

  return {
    // Refs
    ifrFileInputRef,
    consolidatedFileInputRef,
    // State
    ifrFiles,
    consolidatedFile,
    isChecking,
    result,
    currentPage,
    searchQuery,
    severityFilter,
    fieldFilter,
    uniqueFields,
    filteredIssues,
    paginatedIssues,
    totalPages,
    // Handlers
    handleIFRFilesSelection,
    handleConsolidatedFileSelection,
    runValidation,
    handlePageChange,
    handleSearchChange,
    handleSeverityFilterChange,
    handleFieldFilterChange,
    canProceedToStep,
  };
}
