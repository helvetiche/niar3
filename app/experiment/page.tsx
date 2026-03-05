'use client';

import { useState } from 'react';

export default function ExperimentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Excel Reverse Engineering Experiment</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="font-semibold mb-2">Goal:</h2>
        <p className="text-sm">
          Reverse engineer the Excel formulas and calculate principal/penalty values manually
        </p>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Upload Excel File:
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
