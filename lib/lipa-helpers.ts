export const sanitizeAssociationName = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/[\n\r\t]/g, " ")
    .trim();

export const parseNumericArea = (value: number | string): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseRetryDelayMs = (message: string): number => {
  const retryInMatch = message.match(/retry in ([0-9.]+)s/i);
  if (retryInMatch?.[1]) {
    const seconds = Number.parseFloat(retryInMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const retryDelayMatch = message.match(/"retryDelay":"([0-9.]+)s"/i);
  if (retryDelayMatch?.[1]) {
    const seconds = Number.parseFloat(retryDelayMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return 60_000;
};

export const isQuotaOrRateLimitError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit")
  );
};
