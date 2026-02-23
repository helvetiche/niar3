"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  GearIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { MasonryModal } from "@/components/MasonryModal";
import {
  deleteTemplate,
  listTemplates,
  updateTemplate,
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
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const updateInputRef = useRef<HTMLInputElement | null>(null);

  const refreshTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listTemplates(scope);
      setTemplates(items);
      if (
        selectedTemplateId &&
        !items.some((t) => t.id === selectedTemplateId)
      ) {
        onSelectedTemplateIdChange("");
        window.localStorage.removeItem(getTemplateStorageKey(scope));
      }

      const hasValidSelection =
        selectedTemplateId && items.some((t) => t.id === selectedTemplateId);
      if (!hasValidSelection && items.length > 0) {
        const savedTemplateId = window.localStorage.getItem(
          getTemplateStorageKey(scope),
        );
        const defaultId =
          savedTemplateId && items.some((t) => t.id === savedTemplateId)
            ? savedTemplateId
            : items[0].id;
        onSelectedTemplateIdChange(defaultId);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load templates.",
      );
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

  useEffect(() => {
    if (!selectedTemplateId) {
      setUpdateName("");
      setUpdateFile(null);
      if (updateInputRef.current) updateInputRef.current.value = "";
      return;
    }
    const selected = templates.find(
      (template) => template.id === selectedTemplateId,
    );
    setUpdateName(selected?.name ?? "");
  }, [selectedTemplateId, templates]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Choose a template file first.");
      return;
    }
    setIsLoading(true);
    const loadingToastId = toast.loading("Uploading template...");
    try {
      const saved = await uploadTemplate(scope, uploadFile);
      setTemplates((prev) => [saved, ...prev]);
      onSelectedTemplateIdChange(saved.id);
      setUploadFile(null);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      toast.dismiss(loadingToastId);
      toast.success("Template uploaded.");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) {
      toast.error("Select a saved template to delete.");
      return;
    }
    setIsLoading(true);
    try {
      await deleteTemplate(selectedTemplateId);
      setTemplates((prev) =>
        prev.filter((item) => item.id !== selectedTemplateId),
      );
      onSelectedTemplateIdChange("");
      toast.success("Template deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplateId) {
      toast.error("Select a saved template to update.");
      return;
    }

    const trimmedName = updateName.trim();
    if (!trimmedName && !updateFile) {
      toast.error("Provide a new name and/or replacement file.");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateTemplate(selectedTemplateId, {
        name: trimmedName || undefined,
        file: updateFile,
      });
      setTemplates((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      setUpdateFile(null);
      if (updateInputRef.current) updateInputRef.current.value = "";
      toast.success("Template updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="mt-6 rounded-xl border border-white/45 bg-white/15 p-4 shadow-lg shadow-black/10 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-white">Template Manager</h3>
            <p className="mt-1 text-xs text-white/80">
              {selectedTemplateId
                ? "Saved template selected"
                : "No saved template selected"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Open template manager modal"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/30"
          >
            <GearIcon size={16} />
            Manage
          </button>
        </div>
      </section>

      <MasonryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        panelClassName="max-w-2xl"
        duration={0.45}
      >
        {(close) => (
          <section className="max-h-[85dvh] overflow-y-auto rounded-xl border border-white/45 bg-white/15 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-white">
                Template Manager
              </h3>
              <button
                type="button"
                aria-label="Close template manager modal"
                onClick={close}
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/25"
              >
                <XIcon size={16} />
              </button>
            </div>

            <p className="mt-1 text-xs text-white/80">
              Save templates to Firebase Storage and reuse them later.
            </p>
            <p className="mt-2 text-xs leading-5 text-white/80 sm:hidden">
              Keep templates in one place. Select one to use now, upload new
              versions, and delete old ones.
            </p>
            <p className="mt-2 hidden text-xs leading-5 text-white/80 sm:block">
              Use this manager to keep your official templates in one place.
              Select a saved template to use it immediately in the current tool,
              upload a new file when layouts change, and delete outdated
              versions to keep the list clean. Templates are shared across all
              authenticated users and grouped by tool scope.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                aria-label="Select saved template"
                className="rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                value={selectedTemplateId}
                onChange={(event) =>
                  onSelectedTemplateIdChange(event.target.value)
                }
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:text-white/60"
              >
                <TrashIcon size={16} />
                Delete
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/80 sm:hidden">
              Pick a template for the next run. If deleted, choose another
              template before continuing.
            </p>
            <p className="mt-2 hidden text-xs leading-5 text-white/80 sm:block">
              Select the template you want to use for the next run. When
              selected, the current tool automatically references this template
              during generation or consolidation. If you remove a selected
              template, the selection is cleared and you must choose another one
              before continuing.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                ref={uploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                aria-label="Upload template file to storage"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
                className="block w-full rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-900 hover:file:bg-emerald-50"
              />
              <button
                type="button"
                aria-label="Upload template to manager"
                onClick={() => {
                  void handleUpload();
                }}
                disabled={isLoading || !uploadFile}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-900 shadow-sm shadow-black/10 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/70"
              >
                <UploadSimpleIcon size={16} />
                Save
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/80 sm:hidden">
              Upload .xlsx or .xls templates. New uploads are auto-selected for
              this session.
            </p>
            <p className="mt-2 hidden text-xs leading-5 text-white/80 sm:block">
              Upload new templates in .xlsx or .xls format. Use clear file names
              so your team can identify the correct version quickly. After
              upload, the template is saved to Firebase Storage and selected
              automatically for this session. You can switch templates anytime
              without reloading the page.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                aria-label="Update selected template name"
                value={updateName}
                onChange={(event) => setUpdateName(event.target.value)}
                disabled={isLoading || !selectedTemplateId}
                placeholder="Updated template name"
                className="rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:text-white/60"
              />
              <button
                type="button"
                aria-label="Update selected template"
                onClick={() => {
                  void handleUpdate();
                }}
                disabled={
                  isLoading ||
                  !selectedTemplateId ||
                  (!updateName.trim() && !updateFile)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:text-white/60"
              >
                Update
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                ref={updateInputRef}
                type="file"
                accept=".xlsx,.xls"
                aria-label="Replace selected template file"
                onChange={(event) =>
                  setUpdateFile(event.target.files?.[0] ?? null)
                }
                disabled={isLoading || !selectedTemplateId}
                className="block w-full rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-900 hover:file:bg-emerald-50 disabled:cursor-not-allowed disabled:text-white/60"
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-white/80">
              Update lets you rename the selected template and/or replace its
              file while keeping the same template ID for all users.
            </p>
          </section>
        )}
      </MasonryModal>
    </>
  );
}
