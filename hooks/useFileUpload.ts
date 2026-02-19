import { useState, useCallback } from "react";

type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

type UseFileUploadOptions = {
  onProgress?: (progress: UploadProgress) => void;
};

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { onProgress } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percent: 0,
  });

  const uploadWithProgress = useCallback(
    async (url: string, formData: FormData): Promise<Response> => {
      setIsUploading(true);
      setProgress({ loaded: 0, total: 0, percent: 0 });

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percent: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(progressData);
            onProgress?.(progressData);
          }
        });

        xhr.addEventListener("load", () => {
          setIsUploading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            const contentType = xhr.getResponseHeader("content-type");
            const responseBody =
              contentType?.includes("application/json")
                ? xhr.response
                : xhr.responseText;

            resolve(
              new Response(responseBody, {
                status: xhr.status,
                statusText: xhr.statusText,
              }),
            );
          } else {
            reject(new Error(`Server error: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          setIsUploading(false);
          reject(new Error("Network broken during upload"));
        });

        xhr.addEventListener("abort", () => {
          setIsUploading(false);
          reject(new Error("Upload cancelled"));
        });

        xhr.open("POST", url);
        xhr.send(formData);
      });
    },
    [onProgress],
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress({ loaded: 0, total: 0, percent: 0 });
  }, []);

  return {
    uploadWithProgress,
    isUploading,
    progress,
    reset,
  };
}
