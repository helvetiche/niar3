import { useState, useCallback, useMemo } from "react";
import {
  getFileKey,
  getBaseName,
  sanitizeFolderName,
} from "@/lib/file-utils";

export function useIfrScanner() {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [sourceFolderNames, setSourceFolderNames] = useState<
    Record<string, string>
  >({});

  // Compute derived folder names from source files
  const derivedFolderNames = useMemo(() => {
    if (sourceFiles.length === 0) {
      return {};
    }

    const next: Record<string, string> = {};
    sourceFiles.forEach((file) => {
      const fileKey = getFileKey(file);
      const existingName = sourceFolderNames[fileKey];
      next[fileKey] = existingName || getBaseName(file.name);
    });
    return next;
  }, [sourceFiles, sourceFolderNames]);

  const updateFolderName = useCallback((fileKey: string, value: string) => {
    const sanitized = sanitizeFolderName(value);
    setSourceFolderNames((previous) => ({
      ...previous,
      [fileKey]: sanitized,
    }));
  }, []);

  return {
    sourceFiles,
    setSourceFiles,
    sourceFolderNames: derivedFolderNames,
    updateFolderName,
  };
}
