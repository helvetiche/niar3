const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;
const RESUMABLE_THRESHOLD = 500 * 1024 * 1024;

type FileValidationResult = {
  isValid: boolean;
  error?: string;
  needsProgress: boolean;
  needsResumable: boolean;
  estimatedTime?: number;
};

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  pdf: [".pdf"],
  excel: [".xlsx", ".xls"],
  all: [".pdf", ".xlsx", ".xls"],
};

export function validateFileBeforeUpload(
  file: File,
  allowedTypes: keyof typeof ALLOWED_EXTENSIONS = "all",
): FileValidationResult {
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;
  const extensions = ALLOWED_EXTENSIONS[allowedTypes];

  if (!extensions.some((ext) => fileName.endsWith(ext))) {
    return {
      isValid: false,
      error: `Only ${extensions.join(", ")} files are allowed`,
      needsProgress: false,
      needsResumable: false,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 2GB limit (${formatFileSize(fileSize)})`,
      needsProgress: false,
      needsResumable: false,
    };
  }

  if (fileSize === 0) {
    return {
      isValid: false,
      error: "File is empty",
      needsProgress: false,
      needsResumable: false,
    };
  }

  const needsProgress = fileSize >= LARGE_FILE_THRESHOLD;
  const needsResumable = fileSize >= RESUMABLE_THRESHOLD;
  const estimatedTime = needsResumable
    ? Math.ceil(fileSize / (10 * 1024 * 1024))
    : undefined;

  return {
    isValid: true,
    needsProgress,
    needsResumable,
    estimatedTime,
  };
}

export function validateMultipleFiles(
  files: File[],
  allowedTypes: keyof typeof ALLOWED_EXTENSIONS = "all",
): {
  valid: File[];
  invalid: Array<{ file: File; error: string }>;
  totalSize: number;
  needsProgress: boolean;
  needsResumable: boolean;
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];
  let totalSize = 0;
  let needsProgress = false;
  let needsResumable = false;

  for (const file of files) {
    const validation = validateFileBeforeUpload(file, allowedTypes);
    if (validation.isValid) {
      valid.push(file);
      totalSize += file.size;
      if (validation.needsProgress) needsProgress = true;
      if (validation.needsResumable) needsResumable = true;
    } else {
      invalid.push({ file, error: validation.error ?? "Invalid file" });
    }
  }

  return {
    valid,
    invalid,
    totalSize,
    needsProgress,
    needsResumable,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function estimateUploadTime(bytes: number, speedMbps = 10): number {
  const speedBytesPerSecond = (speedMbps * 1024 * 1024) / 8;
  return Math.ceil(bytes / speedBytesPerSecond);
}
