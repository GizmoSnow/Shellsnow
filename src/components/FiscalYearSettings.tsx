import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { FiscalYearConfig } from '../lib/fiscal-year';
import { getRoadmapQuarters, getMonthName, getRoadmapTitle } from '../lib/fiscal-year';

interface FiscalYearSettingsProps {
  isOpen: boolean;
  config: FiscalYearConfig;
  onClose: () => void;
  onSave: (config: FiscalYearConfig) => void;
}

export default function FiscalYearSettings({ isOpen, config, onClose, onSave }: FiscalYearSettingsProps) {
  const [startMonth, setStartMonth] = useState(config.startMonth);
  const [baseYear, setBaseYear] = useState(config.baseYear);
  const [roadmapStartQuarter, setRoadmapStartQuarter] = useState(config.roadmapStartQuarter);

  useEffect(() => {
    if (isOpen) {
      setStartMonth(config.startMonth);
      setBaseYear(config.baseYear);
      setRoadmapStartQuarter(config.roadmapStartQuarter);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const previewConfig: FiscalYearConfig = {
    startMonth,
    baseYear,
    roadmapStartQuarter
  };

  const previewQuarters = getRoadmapQuarters(previewConfig);
  const roadmapTitlePreview = getRoadmapTitle(previewConfig);

  const handleSave = () => {
    onSave(previewConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Fiscal Year Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fiscal Year Start Month
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {getMonthName(i)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The month when your fiscal year begins (Q1 starts here)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Fiscal Year
            </label>
            <input
              type="number"
              value={baseYear}
              onChange={(e) => setBaseYear(Number(e.target.value))}
              min="20"
              max="99"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              e.g., 26 for FY26, 27 for FY27
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Roadmap Start Quarter
            </label>
            <select
              value={roadmapStartQuarter}
              onChange={(e) => setRoadmapStartQuarter(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Which quarter the roadmap begins on (shows 4 consecutive quarters)
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Preview: {roadmapTitlePreview} Digital Roadmap
            </h3>
            <div className="space-y-2">
              {previewQuarters.map((q, idx) => (
                <div
                  key={idx}
                  className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <span className="font-medium">{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Changing fiscal year settings will reorganize the roadmap grid.
              Existing activities will retain their calendar month positions, but may appear in different
              quarter columns or fall outside the visible range.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
