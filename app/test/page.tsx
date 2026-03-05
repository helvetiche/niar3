"use client";

import { useState } from "react";

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const testExcelJS = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "exceljs");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const testXLSX = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "xlsx");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const testHyperFormula = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "hyperformula");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const testXLSXCalc = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "xlsx-calc");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const testTargeted = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "targeted");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const testTargetedCalc = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "targeted-calc");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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

  const inspectRange = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("method", "inspect-range");

      const res = await fetch("/api/v1/test-excel", {
        method: "POST",
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Excel Formula Testing</h1>

      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="font-semibold mb-2">About Formula Caching:</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li>Excel libraries can only read cached formula values</li>
          <li>
            If formulas haven&apos;t been calculated, values may be empty/stale
          </li>
          <li>Manual fix: Open file → F9 → Save</li>
          <li>This test compares different library approaches</li>
        </ul>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Upload Excel File:</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm border rounded p-2"
        />
      </div>

      {file && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={testTargeted}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold"
          >
            Quick Test (D100, F100, G101)
          </button>
          <button
            onClick={inspectRange}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 font-semibold"
          >
            Inspect D17:D99 & F17:F99
          </button>
          <button
            onClick={testTargetedCalc}
            disabled={loading}
            className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50 font-semibold"
          >
            Quick Test + Calculate
          </button>
          <button
            onClick={testExcelJS}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test ExcelJS
          </button>
          <button
            onClick={testXLSX}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test XLSX (SheetJS)
          </button>
          <button
            onClick={testHyperFormula}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Test HyperFormula (Calc)
          </button>
          <button
            onClick={testXLSXCalc}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Test XLSX-CALC
          </button>
        </div>
      )}

      {loading && <div className="p-4 bg-gray-100 rounded">Processing...</div>}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Results:</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
