export function getLuminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isDarkBackground(color?: string): boolean {
  if (!color) return false;
  return getLuminance(color) < 0.3;
}
