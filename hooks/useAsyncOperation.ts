"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

interface UseAsyncOperationOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for managing async operations with loading/error states
 * Handles error toasts and state management automatically
 */
export function useAsyncOperation(options: UseAsyncOperationOptions = {}) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = "Operation completed",
    errorMessage = "Operation failed",
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<void>) => {
      setIsLoading(true);
      setError(null);

      try {
        await fn();
        if (showSuccessToast) {
          toast.success(successMessage);
        }
        onSuccess?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);

        if (showErrorToast) {
          toast.error(errorMessage);
        }
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError, showErrorToast, showSuccessToast, successMessage, errorMessage]
  );

  return { execute, isLoading, error };
}
