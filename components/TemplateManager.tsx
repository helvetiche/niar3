"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GearIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  deleteTemplate,
  listTemplates,
  uploadTemplate,
  type StoredTemplate,
  type TemplateScope,
} from "@/lib/api/templates";

type Props = {
  scope: TemplateScope;
  selectedTemplateId: string;
  onSelectedTemplateIdChange: (id: string) => void;
};

const getTemplateStorageKey = (scope: TemplateScope): string =>
  `template-manager:last-selected:${scope}`;

export function TemplateManager({
  scope,
  selectedTemplateId,
  onSelectedTemplateIdChange,
}: Props) {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const refreshTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listTemplates(scope);
      setTemplates(items);
      if (selectedTemplateId && !items.some((t) => t.id === selectedTemplateId)) {
        onSelectedTemplateIdChange("");
        window.localStorage.removeItem(getTemplateStorageKey(scope));
        return;
      }

      if (!selectedTemplateId) {
        const savedTemplateId = window.localStorage.getItem(getTemplateStorageKey(scope));
        if (savedTemplateId && items.some((template) => template.id === savedTemplateId)) {
          onSelectedTemplateIdChange(savedTemplateId);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load templates.");
    } finally {
      setIsLoading(false);
    }
  }, [onSelectedTemplateIdChange, scope, selectedTemplateId]);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    const key = getTemplateStorageKey(scope);
    if (selectedTemplateId.trim()) {
      window.localStorage.setItem(key, selectedTemplateId.trim());
      return;
    }
    window.localStorage.removeItem(key);
  }, [scope, selectedTemplateId]);

  const handleUpload = async () => {
    if (!uploadFile) {
      setMessage("Choose a template file first.");
      return;
    }
    setIsLoading(true);
    setMessage("Uploading template...");
    try {
      const saved = await uploadTemplate(scope, uploadFile);
      setTemplates((prev) => [saved, ...prev]);
      onSelectedTemplateIdChange(saved.id);
      setUploadFile(null);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      setMessage("Template uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) {
      setMessage("Select a saved template to delete.");
      return;
    }
    setIsLoading(true);
    try {
      await deleteTemplate(selectedTemplateId);
      setTemplates((prev) => prev.filter((item) => item.id !== selectedTemplateId));
      onSelectedTemplateIdChange("");
      setMessage("Template deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-900">Template Manager</h3>
            <p className="mt-1 text-xs text-zinc-600">
              {selectedTemplateId
                ? "Saved template selected"
                : "No saved template selected"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Open template manager modal"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            <GearIcon size={16} />
            Manage
          </button>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setIsModalOpen(false)}
          />
          <section className="relative z-10 w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-900">Template Manager</h3>
              <button
                type="button"
                aria-label="Close template manager modal"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
              >
                <XIcon size={16} />
              </button>
            </div>

            <p className="mt-1 text-xs text-zinc-600">
              Save templates to Firebase Storage and reuse them later.
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Use this manager to keep your official templates in one place. Select
              a saved template to use it immediately in the current tool, upload a
              new file when layouts change, and delete outdated versions to keep the
              list clean. Templates are stored per account and per tool scope.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                aria-label="Select saved template"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                value={selectedTemplateId}
                onChange={(event) => onSelectedTemplateIdChange(event.target.value)}
                disabled={isLoading}
              >
                <option value="">No saved template selected</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Delete selected template"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={isLoading || !selectedTemplateId}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                <TrashIcon size={16} />
                Delete
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Select the template you want to use for the next run. When selected,
              the current tool automatically references this template during
              generation or consolidation. If you remove a selected template, the
              selection is cleared and you must choose another one before
              continuing.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                ref={uploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                aria-label="Upload template file to storage"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
              />
              <button
                type="button"
                aria-label="Upload template to manager"
                onClick={() => {
                  void handleUpload();
                }}
                disabled={isLoading || !uploadFile}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                <UploadSimpleIcon size={16} />
                Save
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Upload new templates in .xlsx or .xls format. Use clear file names so
              your team can identify the correct version quickly. After upload, the
              template is saved to Firebase Storage and selected automatically for
              this session. You can switch templates anytime without reloading the
              page.
            </p>

            {message && <p className="mt-3 text-xs text-zinc-700">{message}</p>}
          </section>
        </div>
      )}
    </>
  );
}
