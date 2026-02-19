export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong";
}

export function handleApiError(error: unknown, fallback?: string): string {
  const message = getApiErrorMessage(error);
  return message || fallback || "Something went wrong";
}
