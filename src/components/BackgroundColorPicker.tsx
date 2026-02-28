import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';

interface BackgroundColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light Blue', value: '#F0F7FF' },
  { name: 'Light Gray', value: '#F5F5F5' },
  { name: 'Dark Navy', value: '#0B1D3A' },
  { name: 'Dark Slate', value: '#1A1A2E' },
  { name: 'Black', value: '#000000' },
];

export function BackgroundColorPicker({ value, onChange }: BackgroundColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      onChange(color);
    }
  };

  const handlePresetClick = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        title="Background Color"
      >
        <Palette className="w-4 h-4" />
        <div
          className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: value || '#FFFFFF' }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 w-64">
          <div className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Background Color
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Custom Hex Color
            </label>
            <input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#FFFFFF"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  );
}
