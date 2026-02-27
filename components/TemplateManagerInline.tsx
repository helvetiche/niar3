"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  TrashIcon,
  UploadSimpleIcon,
  PencilSimpleIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
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

export function TemplateManagerInline({
  scope,
  selectedTemplateId,
  onSelectedTemplateIdChange,
}: Props) {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleDelete = async (templateId: string) => {
    setIsLoading(true);
    try {
      await deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
      if (selectedTemplateId === templateId) {
        onSelectedTemplateIdChange("");
      }
      toast.success("Template deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (template: StoredTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditFile(null);
    if (editInputRef.current) editInputRef.current.value = "";
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditFile(null);
    if (editInputRef.current) editInputRef.current.value = "";
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const trimmedName = editName.trim();
    if (!trimmedName && !editFile) {
      toast.error("Provide a new name and/or replacement file.");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateTemplate(editingId, {
        name: trimmedName || undefined,
        file: editFile,
      });
      setTemplates((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      cancelEdit();
      toast.success("Template updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload New Template */}
      <div className="rounded-lg border border-white/30 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-medium text-white">
          Upload New Template
        </h4>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={uploadInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) =>
              setUploadFile(event.target.files?.[0] ?? null)
            }
            className="block w-full rounded-lg border border-white/40 bg-white/5 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-900 hover:file:bg-emerald-50"
          />
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isLoading || !uploadFile}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/70"
          >
            <UploadSimpleIcon size={16} />
            Upload
          </button>
        </div>
        <p className="mt-2 text-xs text-white/70">
          Upload .xlsx or .xls files. New templates are auto-selected.
        </p>
      </div>

      {/* Template List */}
      <div className="rounded-lg border border-white/30 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-medium text-white">
          Saved Templates ({templates.length})
        </h4>

        {templates.length === 0 ? (
          <p className="text-sm text-white/70">
            No templates saved yet. Upload one above.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const isEditing = editingId === template.id;

              return (
                <div
                  key={template.id}
                  className={`rounded-lg border p-3 transition ${
                    isSelected
                      ? "border-white bg-white/20"
                      : "border-white/30 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Template name"
                        className="w-full rounded border border-white/40 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none"
                      />
                      <input
                        ref={editInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(event) =>
                          setEditFile(event.target.files?.[0] ?? null)
                        }
                        className="block w-full rounded border border-white/40 bg-white/5 px-2 py-1.5 text-xs text-white file:mr-2 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-medium file:text-emerald-900 hover:file:bg-emerald-50"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUpdate()}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckIcon size={14} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 rounded border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XIcon size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectedTemplateIdChange(template.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {template.name}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {template.uploadedAt
                            ? new Date(
                                typeof template.uploadedAt === "object" &&
                                  "toDate" in template.uploadedAt
                                  ? template.uploadedAt.toDate()
                                  : template.uploadedAt,
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(template)}
                          disabled={isLoading}
                          className="rounded p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          title="Edit template"
                        >
                          <PencilSimpleIcon size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(template.id)}
                          disabled={isLoading}
                          className="rounded p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          title="Delete template"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
