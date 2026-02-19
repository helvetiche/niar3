import { useState, useEffect, useCallback } from "react";
import { listTemplates, type StoredTemplate } from "@/lib/api/templates";
import {
  getFileKey,
  getBaseName,
  detectDivisionAndIAFromFilename,
  sanitizeFolderName,
} from "@/lib/file-utils";
import { getErrorMessage } from "@/lib/utils";
import { ERROR_MESSAGES } from "@/constants/error-messages";

const SCANNER_CONSOLIDATION_TEMPLATE_KEY =
  "ifr-scanner:last-consolidation-template-id";

export function useIfrScanner() {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [sourceFolderNames, setSourceFolderNames] = useState<
    Record<string, string>
  >({});
  const [sourceConsolidationDivisions, setSourceConsolidationDivisions] =
    useState<Record<string, string>>({});
  const [sourceConsolidationIAs, setSourceConsolidationIAs] = useState<
    Record<string, string>
  >({});
  const [consolidationTemplates, setConsolidationTemplates] = useState<
    StoredTemplate[]
  >([]);
  const [consolidationTemplateId, setConsolidationTemplateId] = useState("");
  const [isLoadingConsolidationTemplates, setIsLoadingConsolidationTemplates] =
    useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setSourceFolderNames({});
      return;
    }

    setSourceFolderNames((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const existingName = previous[fileKey];
        next[fileKey] = existingName || getBaseName(file.name);
      });
      return next;
    });

    setSourceConsolidationDivisions((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const detected = detectDivisionAndIAFromFilename(file.name);
        const existingDivision = previous[fileKey];
        next[fileKey] = existingDivision ?? detected.division;
      });
      return next;
    });

    setSourceConsolidationIAs((previous) => {
      const next: Record<string, string> = {};
      sourceFiles.forEach((file) => {
        const fileKey = getFileKey(file);
        const detected = detectDivisionAndIAFromFilename(file.name);
        const existingIA = previous[fileKey];
        next[fileKey] = existingIA ?? detected.ia;
      });
      return next;
    });
  }, [sourceFiles]);

  const loadConsolidationTemplates = useCallback(async () => {
    setIsLoadingConsolidationTemplates(true);
    try {
      const items = await listTemplates("consolidate-ifr");
      setConsolidationTemplates(items);
      setConsolidationTemplateId((previous) => {
        if (previous && items.some((item) => item.id === previous))
          return previous;
        const savedTemplateId = window.localStorage.getItem(
          SCANNER_CONSOLIDATION_TEMPLATE_KEY,
        );
        if (savedTemplateId && items.some((item) => item.id === savedTemplateId)) {
          return savedTemplateId;
        }
        return items[0]?.id ?? "";
      });
    } catch (error) {
      setMessage(getErrorMessage(error, ERROR_MESSAGES.FAILED_LOAD_TEMPLATES));
    } finally {
      setIsLoadingConsolidationTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (!consolidationTemplateId.trim()) {
      window.localStorage.removeItem(SCANNER_CONSOLIDATION_TEMPLATE_KEY);
      return;
    }
    window.localStorage.setItem(
      SCANNER_CONSOLIDATION_TEMPLATE_KEY,
      consolidationTemplateId.trim(),
    );
  }, [consolidationTemplateId]);

  const updateFolderName = useCallback((fileKey: string, value: string) => {
    const sanitized = sanitizeFolderName(value);
    setSourceFolderNames((previous) => ({
      ...previous,
      [fileKey]: sanitized,
    }));
  }, []);

  const updateDivision = useCallback((fileKey: string, value: string) => {
    setSourceConsolidationDivisions((previous) => ({
      ...previous,
      [fileKey]: value.replace(/[^0-9]/g, ""),
    }));
  }, []);

  const updateIA = useCallback((fileKey: string, value: string) => {
    setSourceConsolidationIAs((previous) => ({
      ...previous,
      [fileKey]: value.trimStart(),
    }));
  }, []);

  return {
    sourceFiles,
    setSourceFiles,
    sourceFolderNames,
    sourceConsolidationDivisions,
    sourceConsolidationIAs,
    consolidationTemplates,
    consolidationTemplateId,
    setConsolidationTemplateId,
    isLoadingConsolidationTemplates,
    message,
    setMessage,
    loadConsolidationTemplates,
    updateFolderName,
    updateDivision,
    updateIA,
  };
}
