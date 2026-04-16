/** Client payload shape for POST /api/v1/compose-email/send `attachments`. */
export type OutgoingComposeEmailAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export const formatComposeEmailAttachmentSizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const fileToOutgoingComposeEmailAttachment = (
  file: File
): Promise<OutgoingComposeEmailAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : "";
      if (!base64.trim()) {
        reject(new Error("Could not read file."));
        return;
      }
      resolve({
        filename: file.name,
        contentBase64: base64,
        ...(file.type ? { contentType: file.type } : {}),
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
