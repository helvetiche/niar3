'use client';

import { useState } from 'react';
import { IRRIGATION_RATE_TABLE, lookupIrrigationRate } from '@/lib/irrigation-rate-table';

export default function ExperimentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchSeason, setSearchSeason] = useState('2012-D');
  
  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [humanFile, setHumanFile] = useState<File | null>(null);
  const [systemFile, setSystemFile] = useState<File | null>(null);
  const [compareResults, setCompareResults] = useState<Record<string, unknown> | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleHumanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHumanFile(e.target.files[0]);
      setCompareResults(null);
    }
  };

  const handleSystemFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSystemFile(e.target.files[0]);
      setCompareResults(null);
    }
  };

  const runExperiment = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/v1/experiment', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      setResults(data);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (!humanFile || !systemFile) return;
    setCompareLoading(true);
    try {
      const formData = new FormData();
      formData.append('humanFile', humanFile);
      formData.append('systemFile', systemFile);
      
      const res = await fetch('/api/v1/experiment/compare', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      setCompareResults(data);
    } catch (error) {
      setCompareResults({ error: String(error) });
    } finally {
      setCompareLoading(false);
    }
  };

  const searchResult = lookupIrrigationRate(searchSeason);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">IFR Calculation Experiment</h1>
      
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setCompareMode(false)}
          className={`px-4 py-2 rounded ${!compareMode ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          IFR Calculator
        </button>
        <button
          onClick={() => setCompareMode(true)}
          className={`px-4 py-2 rounded ${compareMode ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          File Comparison
        </button>
      </div>

      {!compareMode ? (
        <>
          <div className="mb-6 p-4 bg-blue-50 rounded">
            <h2 className="font-semibold mb-2">Irrigation Rate Lookup Table</h2>
            <p className="text-sm mb-3">
              Total entries: {IRRIGATION_RATE_TABLE.length} crop seasons (1975-2016)
            </p>
            
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Search Crop Season:</label>
                <input
                  type="text"
                  value={searchSeason}
                  onChange={(e) => setSearchSeason(e.target.value)}
                  placeholder="e.g., 2012-D"
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              {searchResult && (
                <div className="p-2 bg-green-100 rounded text-sm">
                  <strong>Rate:</strong> ₱{searchResult.rate.toFixed(2)} | 
                  <strong> Penalty Months:</strong> {searchResult.penaltyMonths}
                </div>
              )}
              {!searchResult && searchSeason && (
                <div className="p-2 bg-red-100 rounded text-sm">
                  Not found
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded max-h-96 overflow-auto">
            <h3 className="font-semibold mb-2">Full Table:</h3>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-200">
                <tr>
                  <th className="p-2 text-left">Crop Season</th>
                  <th className="p-2 text-right">Rate (₱)</th>
                  <th className="p-2 text-right">Penalty Months</th>
                </tr>
              </thead>
              <tbody>
                {IRRIGATION_RATE_TABLE.map((entry, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{entry.cropSeason}</td>
                    <td className="p-2 text-right">{entry.rate.toFixed(2)}</td>
                    <td className="p-2 text-right">{entry.penaltyMonths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-medium">
              Upload IFR Excel File (Optional):
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm border rounded p-2"
            />
          </div>

          {file && (
            <div className="mb-6">
              <button
                onClick={runExperiment}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                Run Experiment
              </button>
            </div>
          )}

          {loading && (
            <div className="p-4 bg-gray-100 rounded">
              Processing...
            </div>
          )}

          {results && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-3">Results:</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-[600px] text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 p-4 bg-yellow-50 rounded">
            <h2 className="font-semibold mb-2">File Comparison Tool</h2>
            <p className="text-sm">
              Compare human-consolidated file with system-consolidated file to identify differences.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2 font-medium">
                Human Consolidated File:
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleHumanFileChange}
                className="block w-full text-sm border rounded p-2"
              />
              {humanFile && (
                <p className="mt-1 text-sm text-green-600">✓ {humanFile.name}</p>
              )}
            </div>

            <div>
              <label className="block mb-2 font-medium">
                System Consolidated File:
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleSystemFileChange}
                className="block w-full text-sm border rounded p-2"
              />
              {systemFile && (
                <p className="mt-1 text-sm text-green-600">✓ {systemFile.name}</p>
              )}
            </div>
          </div>

          {humanFile && systemFile && (
            <div className="mb-6">
              <button
                onClick={runComparison}
                disabled={compareLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-semibold"
              >
                Compare Files
              </button>
            </div>
          )}

          {compareLoading && (
            <div className="p-4 bg-gray-100 rounded">
              Comparing files...
            </div>
          )}

          {compareResults && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-3">Comparison Results:</h2>
              
              {compareResults.summary && (
                <div className="mb-4 p-4 bg-blue-50 rounded">
                  <h3 className="font-semibold mb-2">Summary:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>✅ Matching Lots: <strong>{compareResults.summary.matchingLots}</strong></p>
                      <p>❌ Different Lots: <strong>{compareResults.summary.differentLots}</strong></p>
                    </div>
                    <div>
                      <p>📄 Only in Human: <strong>{compareResults.summary.onlyInHumanCount}</strong></p>
                      <p>🤖 Only in System: <strong>{compareResults.summary.onlyInSystemCount}</strong></p>
                    </div>
                  </div>
                </div>
              )}

              {compareResults.details && compareResults.details.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Differences by Lot Code:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border p-2">Lot Code</th>
                          <th className="border p-2">Field</th>
                          <th className="border p-2 bg-green-100">Human Value</th>
                          <th className="border p-2 bg-blue-100">System Value</th>
                          <th className="border p-2">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareResults.details.map((detail: any, idx: number) => (
                          detail.differences.map((diff: any, diffIdx: number) => (
                            <tr key={`${idx}-${diffIdx}`} className={diff.isDifferent ? "hover:bg-gray-50" : "bg-gray-100 hover:bg-gray-150"}>
                              {diffIdx === 0 && (
                                <td 
                                  className="border p-2 font-mono font-semibold" 
                                  rowSpan={detail.differences.length}
                                >
                                  {detail.lotCode}
                                </td>
                              )}
                              <td className="border p-2">
                                {diff.columnName}
                                {!diff.isDifferent && <span className="ml-2 text-xs text-gray-500">(match)</span>}
                              </td>
                              <td className="border p-2 bg-green-50 font-mono">
                                {typeof diff.humanValue === 'number' 
                                  ? diff.humanValue.toFixed(2) 
                                  : diff.humanValue}
                              </td>
                              <td className="border p-2 bg-blue-50 font-mono">
                                {typeof diff.systemValue === 'number' 
                                  ? diff.systemValue.toFixed(2) 
                                  : diff.systemValue}
                              </td>
                              <td className="border p-2 font-mono">
                                {diff.isDifferent && diff.difference !== 'N/A' && (
                                  <span className={diff.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {diff.difference > 0 ? '+' : ''}{diff.difference}
                                  </span>
                                )}
                                {diff.isDifferent && diff.difference === 'N/A' && '-'}
                                {!diff.isDifferent && <span className="text-gray-400">✓</span>}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {compareResults.onlyInHuman && compareResults.onlyInHuman.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 rounded">
                  <h3 className="font-semibold mb-2">Only in Human File ({compareResults.onlyInHuman.length}):</h3>
                  <div className="flex flex-wrap gap-2">
                    {compareResults.onlyInHuman.map((lotCode: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-yellow-200 rounded text-sm font-mono">
                        {lotCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {compareResults.onlyInSystem && compareResults.onlyInSystem.length > 0 && (
                <div className="mb-4 p-4 bg-purple-50 rounded">
                  <h3 className="font-semibold mb-2">Only in System File ({compareResults.onlyInSystem.length}):</h3>
                  <div className="flex flex-wrap gap-2">
                    {compareResults.onlyInSystem.map((lotCode: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-purple-200 rounded text-sm font-mono">
                        {lotCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
