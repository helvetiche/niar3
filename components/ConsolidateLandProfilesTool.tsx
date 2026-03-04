'use client';

import { useState, useRef } from 'react';
import {
  UploadSimpleIcon,
  FileIcon,
  XIcon,
  DownloadSimpleIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  MicrosoftExcelLogoIcon,
} from '@phosphor-icons/react';

interface UploadedFile {
  file: File;
  id: string;
}

export default function ConsolidateLandProfilesTool() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [landProfileFiles, setLandProfileFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ count: number; errors: string[]; warning?: string } | null>(null);
  
  const templateInputRef = useRef<HTMLInputElement>(null);
  const landProfileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleLandProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    
    setLandProfileFiles(prev => [...prev, ...newFiles]);
    setError(null);
    setSuccess(null);
    
    // Reset input
    if (landProfileInputRef.current) {
      landProfileInputRef.current.value = '';
    }
  };

  const removeLandProfileFile = (id: string) => {
    setLandProfileFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeTemplateFile = () => {
    setTemplateFile(null);
    if (templateInputRef.current) {
      templateInputRef.current.value = '';
    }
  };

  const handleConsolidate = async () => {
    if (!templateFile) {
      setError('Please upload a template file');
      return;
    }

    if (landProfileFiles.length === 0) {
      setError('Please upload at least one land profile file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('template', templateFile);
      
      landProfileFiles.forEach((item, index) => {
        formData.append(`landProfile_${index}`, item.file);
      });

      const response = await fetch('/api/v1/consolidate-land-profiles', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to consolidate land profiles');
      }

      // Get metadata from headers
      const processedCount = parseInt(response.headers.get('X-Processed-Count') || '0');
      const errorCount = parseInt(response.headers.get('X-Error-Count') || '0');
      const errors = JSON.parse(response.headers.get('X-Errors') || '[]');
      const warnings = JSON.parse(response.headers.get('X-Warnings') || '[]');

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidated-land-profiles-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess({ count: processedCount, errors, warning: warnings.length > 0 ? warnings.join(' ') : undefined });
      
      if (errorCount === 0) {
        // Clear files on complete success
        setTemplateFile(null);
        setLandProfileFiles([]);
        if (templateInputRef.current) templateInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <header className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-medium text-white sm:text-2xl">
          <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
            <MicrosoftExcelLogoIcon size={20} className="text-white" weight="duotone" />
          </span>
          Consolidate Land Profiles
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Upload a template and multiple land profile Excel files to consolidate them into a single file.
        </p>
      </header>

      <div className="space-y-6">
        {/* Template Upload */}
        <div className="rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-4 backdrop-blur-sm sm:p-5">
          <h3 className="text-base font-medium text-white mb-3">Template File</h3>
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadSimpleIcon size={18} weight="duotone" />
            {templateFile ? 'Change Template' : 'Upload Template'}
          </button>
          <input
            ref={templateInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleTemplateUpload}
            className="hidden"
          />
          
          {templateFile && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-green-500/40 bg-green-900/20 p-3">
              <div className="flex items-center gap-2">
                <FileIcon size={18} className="text-green-400" weight="duotone" />
                <span className="text-sm text-white">{templateFile.name}</span>
              </div>
              <button
                type="button"
                onClick={removeTemplateFile}
                disabled={isProcessing}
                className="rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <XIcon size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Land Profile Files Upload */}
        <div className="rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-4 backdrop-blur-sm sm:p-5">
          <h3 className="text-base font-medium text-white mb-3">
            Land Profile Files ({landProfileFiles.length})
          </h3>
          <button
            type="button"
            onClick={() => landProfileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadSimpleIcon size={18} weight="duotone" />
            Add Land Profile Files
          </button>
          <input
            ref={landProfileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleLandProfileUpload}
            className="hidden"
          />
          
          {landProfileFiles.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {landProfileFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-blue-500/40 bg-blue-900/20 p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileIcon size={18} className="text-blue-400" weight="duotone" />
                    <span className="text-sm text-white">{item.file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLandProfileFile(item.id)}
                    disabled={isProcessing}
                    className="rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-900/30 p-4">
            <div className="flex items-start gap-3">
              <WarningCircleIcon size={20} className="text-red-400 shrink-0 mt-0.5" weight="duotone" />
              <p className="text-sm text-white">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="rounded-xl border border-green-500/50 bg-green-900/30 p-4">
            <div className="flex items-start gap-3">
              <CheckCircleIcon size={20} className="text-green-400 shrink-0 mt-0.5" weight="duotone" />
              <div className="text-sm text-white">
                <p className="font-medium">Successfully processed {success.count} land profile(s)!</p>
                {success.warning && (
                  <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded">
                    <p className="text-yellow-200 font-medium">⚠️ Important:</p>
                    <p className="text-yellow-100">{success.warning}</p>
                    <p className="text-yellow-100 mt-1 text-xs">
                      To get Area, Principal, and Penalty values: Open each land profile in Excel, press Cmd+S to save, then re-upload.
                    </p>
                  </div>
                )}
                {success.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {success.errors.map((err, idx) => (
                        <li key={idx} className="text-white/80">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Consolidate Button */}
        <button
          onClick={handleConsolidate}
          disabled={!templateFile || landProfileFiles.length === 0 || isProcessing}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 text-base font-semibold text-emerald-900 transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <SpinnerGapIcon size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DownloadSimpleIcon size={20} weight="duotone" />
              Consolidate & Download
            </>
          )}
        </button>

        {/* Instructions */}
        <div className="rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-4 backdrop-blur-sm sm:p-5">
          <h3 className="text-base font-medium text-white mb-3">Instructions</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex gap-2">
              <span className="text-white/60">1.</span>
              <span>Upload the consolidation template Excel file</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/60">2.</span>
              <span>Upload one or more land profile Excel files</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/60">3.</span>
              <span>Land profile filenames must start with a number (e.g., "01 2512-C-10B...")</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/60">4.</span>
              <span>The system will extract data from sheets "00 ACC DETAILS 01" and "01 SOA 01"</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/60">5.</span>
              <span>Click "Consolidate & Download" to generate the consolidated file</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
