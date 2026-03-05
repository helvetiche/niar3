'use client';

import { useState } from 'react';
import { CheckCircleIcon, WarningCircleIcon, XCircleIcon, DatabaseIcon } from '@phosphor-icons/react';

interface Issue {
  lotCode: string;
  issueType: string;
  field: string;
  ifrValue: string | number;
  consolidatedValue: string | number;
  difference?: number;
  severity: 'error' | 'warning';
  reason: string;
}

interface CheckResult {
  success: boolean;
  summary: {
    totalLots: number;
    consolidatedLots: number;
    matchingLots: number;
    totalIssues: number;
    errors: number;
    warnings: number;
  };
  issues: Issue[];
}

export default function IFRCheckerTool() {
  const [currentStep, setCurrentStep] = useState(1);
  const [ifrFiles, setIfrFiles] = useState<FileList | null>(null);
  const [consolidatedFile, setConsolidatedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const handleIFRFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIfrFiles(e.target.files);
    setResult(null);
  };

  const handleConsolidatedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setConsolidatedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const runCheck = async () => {
    if (!ifrFiles || ifrFiles.length === 0 || !consolidatedFile) return;

    setLoading(true);
    setCurrentStep(3);
    
    try {
      const formData = new FormData();
      
      for (let i = 0; i < ifrFiles.length; i++) {
        formData.append('ifrFiles', ifrFiles[i]);
      }
      formData.append('consolidatedFile', consolidatedFile);

      const res = await fetch('/api/v1/ifr-checker', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        summary: { totalLots: 0, consolidatedLots: 0, matchingLots: 0, totalIssues: 0, errors: 0, warnings: 0 },
        issues: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setCurrentStep(1);
    setIfrFiles(null);
    setConsolidatedFile(null);
    setResult(null);
  };

  const canProceedToStep2 = ifrFiles && ifrFiles.length > 0;
  const canProceedToStep3 = canProceedToStep2 && consolidatedFile;

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-xl font-medium text-white sm:text-2xl">IFR Checker</h2>
        <p className="mt-2 text-sm text-white/85">
          Validate consolidated files against source IFR data and identify discrepancies automatically.
        </p>
      </header>

      {/* Stepper */}
      <div className="mb-6 flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition ${
                  currentStep >= step
                    ? 'border-white bg-white text-emerald-900'
                    : 'border-white/40 bg-emerald-900/60 text-white/60'
                }`}
              >
                {step}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-white' : 'text-white/60'
                }`}
              >
                {step === 1 && 'Upload IFR Files'}
                {step === 2 && 'Upload Consolidated'}
                {step === 3 && 'View Results'}
              </span>
            </div>
            {step < 3 && (
              <div
                className={`mx-4 h-0.5 flex-1 ${
                  currentStep > step ? 'bg-white' : 'bg-white/40'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-4 backdrop-blur-sm sm:p-6">
        {/* Step 1: Upload IFR Files */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Upload IFR Files (Source Data):
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleIFRFilesChange}
                className="block w-full rounded-lg border border-white/30 bg-white/10 p-3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-900 hover:file:bg-white/90"
              />
              {ifrFiles && (
                <p className="mt-2 flex items-center gap-2 text-sm text-green-300">
                  <CheckCircleIcon size={16} weight="fill" />
                  {ifrFiles.length} IFR file(s) selected
                </p>
              )}
            </div>

            {canProceedToStep2 && (
              <button
                onClick={() => setCurrentStep(2)}
                className="rounded-lg bg-white px-6 py-3 font-semibold text-emerald-900 transition hover:bg-white/90"
              >
                Next: Upload Consolidated File
              </button>
            )}
          </div>
        )}

        {/* Step 2: Upload Consolidated File */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Upload Consolidated File (To Validate):
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleConsolidatedFileChange}
                className="block w-full rounded-lg border border-white/30 bg-white/10 p-3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-900 hover:file:bg-white/90"
              />
              {consolidatedFile && (
                <p className="mt-2 flex items-center gap-2 text-sm text-green-300">
                  <CheckCircleIcon size={16} weight="fill" />
                  {consolidatedFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Back
              </button>
              {canProceedToStep3 && (
                <button
                  onClick={runCheck}
                  disabled={loading}
                  className="rounded-lg bg-white px-6 py-3 font-semibold text-emerald-900 transition hover:bg-white/90 disabled:opacity-50"
                >
                  Run Validation Check
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                <p className="text-white">Validating consolidated file against IFR data...</p>
              </div>
            ) : result ? (
              <>
                {/* Summary */}
                <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
                  <h3 className="mb-4 text-lg font-semibold text-white">Validation Summary</h3>
                  <div className="grid grid-cols-3 gap-8 text-sm text-white/90">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DatabaseIcon size={16} className="text-white/60" />
                        <span>Total Lots in IFR: <strong className="text-white">{result.summary.totalLots}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DatabaseIcon size={16} className="text-white/60" />
                        <span>Consolidated Lots: <strong className="text-white">{result.summary.consolidatedLots}</strong></span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon size={16} weight="fill" className="text-green-400" />
                        <span>Matching Lots: <strong className="text-green-300">{result.summary.matchingLots}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <WarningCircleIcon size={16} weight="fill" className="text-white/60" />
                        <span>Total Issues: <strong className="text-white">{result.summary.totalIssues}</strong></span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircleIcon size={16} weight="fill" className="text-red-400" />
                        <span>Errors: <strong className="text-red-300">{result.summary.errors}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <WarningCircleIcon size={16} weight="fill" className="text-yellow-400" />
                        <span>Warnings: <strong className="text-yellow-300">{result.summary.warnings}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issues Table or Success Message */}
                {result.issues.length === 0 ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center backdrop-blur-sm">
                    <CheckCircleIcon size={64} weight="fill" className="mx-auto mb-4 text-green-300" />
                    <div className="text-2xl font-semibold text-white">Perfect Match!</div>
                    <p className="mt-2 text-white/80">
                      The consolidated file matches the IFR data perfectly. No issues found.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/20 bg-white/5 p-4 backdrop-blur-sm">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      Issues Found ({result.issues.length}):
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-white/20">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/20 bg-white/5">
                          <tr className="text-left text-white">
                            <th className="border-r border-white/10 p-3 font-semibold">Severity</th>
                            <th className="border-r border-white/10 p-3 font-semibold">Lot Code</th>
                            <th className="border-r border-white/10 p-3 font-semibold">Field</th>
                            <th className="border-r border-white/10 p-3 font-semibold">IFR Value</th>
                            <th className="border-r border-white/10 p-3 font-semibold">Consolidated</th>
                            <th className="border-r border-white/10 p-3 font-semibold">Difference</th>
                            <th className="p-3 font-semibold">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.issues.map((issue, idx) => (
                            <tr
                              key={idx}
                              className={`border-b border-white/10 ${
                                issue.severity === 'error'
                                  ? 'bg-red-500/5 hover:bg-red-500/10'
                                  : 'bg-yellow-500/5 hover:bg-yellow-500/10'
                              } transition`}
                            >
                              <td className="border-r border-white/10 p-3">
                                {issue.severity === 'error' ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                                    <XCircleIcon size={14} weight="fill" />
                                    ERROR
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
                                    <WarningCircleIcon size={14} weight="fill" />
                                    WARNING
                                  </span>
                                )}
                              </td>
                              <td className="border-r border-white/10 p-3 font-mono font-semibold text-white">
                                {issue.lotCode}
                              </td>
                              <td className="border-r border-white/10 p-3 text-white/80">{issue.field}</td>
                              <td className="border-r border-white/10 p-3 font-mono text-white">
                                {issue.ifrValue}
                              </td>
                              <td className="border-r border-white/10 p-3 font-mono text-white">
                                {issue.consolidatedValue}
                              </td>
                              <td className="border-r border-white/10 p-3 font-mono">
                                {issue.difference !== undefined ? (
                                  <span
                                    className={
                                      issue.difference > 0 ? 'text-red-300' : 'text-green-300'
                                    }
                                  >
                                    {issue.difference > 0 ? '+' : ''}
                                    {typeof issue.difference === 'number'
                                      ? issue.difference.toFixed(2)
                                      : issue.difference}
                                  </span>
                                ) : (
                                  <span className="text-white/40">-</span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-white/70">{issue.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Reset Button */}
                <button
                  onClick={resetTool}
                  className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
                >
                  Check Another File
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
