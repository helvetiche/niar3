import { useState, useEffect, useCallback } from "react";
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
  }, [sourceFiles]);

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
    sourceFolderNames,
    updateFolderName,
  };
}
