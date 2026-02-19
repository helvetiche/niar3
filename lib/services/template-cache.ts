import { type StoredTemplate } from "@/lib/api/templates";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry<StoredTemplate[]>>();

export function getCachedTemplates(scope: string): StoredTemplate[] | null {
  const entry = cache.get(scope);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(scope);
    return null;
  }

  return entry.data;
}

export function setCachedTemplates(
  scope: string,
  templates: StoredTemplate[],
): void {
  cache.set(scope, {
    data: templates,
    timestamp: Date.now(),
  });
}

export function invalidateTemplateCache(scope?: string): void {
  if (scope) {
    cache.delete(scope);
  } else {
    cache.clear();
  }
}
