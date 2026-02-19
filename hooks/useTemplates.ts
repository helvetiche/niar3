import useSWR from "swr";
import {
  listTemplates,
  type StoredTemplate,
  type TemplateScope,
} from "@/lib/api/templates";

/**
 * Custom hook for fetching and caching templates with SWR.
 * Automatically revalidates on focus and provides loading/error states.
 * @param scope - Template scope to filter by (or empty string to skip fetching)
 * @returns SWR response with templates data, loading state, and error
 */
export function useTemplates(scope: TemplateScope | "") {
  return useSWR<StoredTemplate[]>(
    scope ? `/api/templates/${scope}` : null,
    () => (scope ? listTemplates(scope as TemplateScope) : Promise.resolve([])),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    },
  );
}
