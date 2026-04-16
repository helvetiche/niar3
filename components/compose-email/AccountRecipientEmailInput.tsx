"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useAccountEmailSuggestions } from "@/hooks/useAccountEmailSuggestions";

const MAX_VISIBLE = 8;

type SuggestionPortalRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const matchesQuery = (
  row: { email: string; displayName: string },
  queryLower: string
): boolean => {
  if (!queryLower) return true;
  const email = row.email.toLowerCase();
  const name = row.displayName.toLowerCase();
  return email.includes(queryLower) || name.includes(queryLower);
};

type AccountRecipientEmailInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  /** Lighter hint shown under the field when the directory is available */
  hintClassName?: string;
};

export const AccountRecipientEmailInput = ({
  id,
  value,
  onChange,
  required,
  placeholder = "name@example.com",
  "aria-label": ariaLabel = "Recipient email addresses",
  className,
  hintClassName,
}: AccountRecipientEmailInputProps) => {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, isLoading } = useAccountEmailSuggestions();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [portalRect, setPortalRect] = useState<SuggestionPortalRect | null>(null);

  const queryTrimmed = value.trim();
  const queryLower = queryTrimmed.toLowerCase();

  const filtered = useMemo(() => {
    if (suggestions.length === 0) return [];
    const ranked = suggestions.filter((s) => matchesQuery(s, queryLower));
    return ranked.slice(0, MAX_VISIBLE);
  }, [suggestions, queryLower]);

  const showList = open && suggestions.length > 0 && filtered.length > 0;

  const updatePortalRect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const pad = 8;
    const belowTop = r.bottom + gap;
    const spaceBelow = window.innerHeight - belowTop - pad;
    const maxListPx = 192;
    const maxHeight = Math.min(maxListPx, Math.max(96, spaceBelow));
    setPortalRect({
      top: belowTop,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showList) return;
    updatePortalRect();
    window.addEventListener("resize", updatePortalRect);
    window.addEventListener("scroll", updatePortalRect, true);
    return () => {
      window.removeEventListener("resize", updatePortalRect);
      window.removeEventListener("scroll", updatePortalRect, true);
    };
  }, [showList, updatePortalRect, filtered]);

  useEffect(() => {
    if (!showList) return;
    const handlePointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
      setPortalRect(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showList]);

  const applySuggestion = useCallback(
    (email: string) => {
      onChange(email);
      setOpen(false);
      setPortalRect(null);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const safeHighlighted =
    filtered.length === 0 ? 0 : Math.min(highlighted, filtered.length - 1);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setHighlighted(0);
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setPortalRect(null);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => {
        const base = Math.min(i, Math.max(0, filtered.length - 1));
        return Math.min(base + 1, Math.max(0, filtered.length - 1));
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => {
        const base = Math.min(i, Math.max(0, filtered.length - 1));
        return Math.max(base - 1, 0);
      });
      return;
    }
    if (event.key === "Enter") {
      const pick = filtered[safeHighlighted];
      if (pick) {
        event.preventDefault();
        applySuggestion(pick.email);
      }
    }
  };

  const activeOptionId =
    showList && filtered[safeHighlighted]
      ? `${listId}-opt-${safeHighlighted}`
      : undefined;

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onFocus={() => {
          setHighlighted(0);
          if (suggestions.length > 0) setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleInputKeyDown}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        className={className}
        placeholder={placeholder}
      />
      {showList && portalRect && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Matching workspace accounts"
              className="z-[100] max-h-[min(12rem,40vh)] overflow-y-auto rounded-lg border border-emerald-600/80 bg-emerald-950 py-1 shadow-lg ring-1 ring-black/30"
              style={{
                position: "fixed",
                top: portalRect.top,
                left: portalRect.left,
                width: portalRect.width,
                maxHeight: portalRect.maxHeight,
              }}
            >
              {filtered.map((row, index) => (
                <li key={row.email} role="presentation" className="list-none">
                  <button
                    type="button"
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={index === safeHighlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => applySuggestion(row.email)}
                    className={`flex w-full flex-col gap-0.5 px-2.5 py-2 text-left text-xs transition focus:outline-none focus-visible:bg-emerald-800/60 ${
                      index === safeHighlighted
                        ? "bg-emerald-800/50"
                        : "hover:bg-emerald-800/40"
                    }`}
                  >
                    <span className="truncate font-medium text-white">{row.email}</span>
                    {row.displayName ? (
                      <span className="truncate text-[11px] font-light text-emerald-200/80">
                        {row.displayName}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
      {suggestions.length > 0 ? (
        <p
          className={
            hintClassName ??
            "mt-1 text-[10px] font-light leading-snug text-emerald-200/60"
          }
        >
          Type to filter workspace accounts. Arrow keys and Enter choose a row.
        </p>
      ) : isLoading ? (
        <p className="mt-1 text-[10px] font-light text-emerald-200/55">Loading addresses…</p>
      ) : (
        <p className="mt-1 text-[10px] font-light text-emerald-200/55">
          Account directory suggestions appear for super-admins (same list as Account
          Management).
        </p>
      )}
    </div>
  );
};
