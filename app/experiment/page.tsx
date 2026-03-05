'use client';

import { useState } from 'react';
import { IRRIGATION_RATE_TABLE, lookupIrrigationRate } from '@/lib/irrigation-rate-table';

export default function ExperimentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchSeason, setSearchSeason] = useState('2012-D');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResults(null);
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

  const searchResult = lookupIrrigationRate(searchSeason);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">IFR Calculation Experiment</h1>
      
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
    </div>
  );
}
