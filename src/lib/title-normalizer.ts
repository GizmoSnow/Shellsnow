const ACCOUNT_NAME_PATTERNS = [
  /scotts?/i,
  /the scotts company,?\s*llc\.?/i,
  /salesforce\.com,?\s*inc\.?/i,
];

const ID_PATTERNS = [
  /ENG-\d{7}/g,
  /CASE-\d{7}/g,
  /\b\d{7,10}\b/g,
  /[A-Z]{2,3}-\d{4,}/g,
];

const PREFIX_PATTERNS = [
  /^architect:\s*/i,
  /^case:\s*/i,
  /^support request:\s*/i,
  /^help with:\s*/i,
  /^question about:\s*/i,
  /^re:\s*/i,
  /^fwd?:\s*/i,
  /^fw:\s*/i,
];

const TRAINING_CODE_PATTERNS = [
  /\b[A-Z]{2}\d{3}\b/g,
  /\b[A-Z]{3}\d{2,3}\b/g,
];

const LOW_VALUE_SUPPORT_TITLES = [
  /password\s*reset/i,
  /access\s*request/i,
  /user\s*added/i,
  /license\s*change/i,
  /account\s*setup/i,
  /permission\s*request/i,
];

const BOILERPLATE_PHRASES = [
  'case:',
  'support request',
  'help with',
  'question about',
  're:',
  'fwd:',
  'fw:',
  'architect:',
];

const FISCAL_YEAR_QUARTER_PATTERN = /FY\d{2}\s+Q[1-4]\s*-?\s*/i;

export interface NormalizationResult {
  normalizedTitle: string;
  flags: string[];
  confidence: number;
}

export function normalizeTitle(rawTitle: string): NormalizationResult {
  let title = rawTitle.trim();
  const flags: string[] = [];
  let confidence = 80;

  if (!title || title.length < 3) {
    flags.push('InvalidTitle');
    return { normalizedTitle: rawTitle, flags, confidence: 0 };
  }

  for (const pattern of ACCOUNT_NAME_PATTERNS) {
    title = title.replace(pattern, '').trim();
  }

  for (const pattern of ID_PATTERNS) {
    title = title.replace(pattern, '').trim();
  }

  for (const pattern of PREFIX_PATTERNS) {
    title = title.replace(pattern, '').trim();
  }

  for (const pattern of TRAINING_CODE_PATTERNS) {
    title = title.replace(pattern, '').trim();
  }

  title = title.replace(FISCAL_YEAR_QUARTER_PATTERN, '').trim();

  for (const phrase of BOILERPLATE_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    title = title.replace(regex, '').trim();
  }

  title = title.replace(/\s*-\s*$/, '').trim();
  title = title.replace(/^-\s*/, '').trim();
  title = title.replace(/\s+/g, ' ').trim();

  if (title.length < 5) {
    flags.push('NeedsRename');
    confidence = 30;
  }

  if (isGenericTitle(title)) {
    flags.push('NeedsRename');
    confidence = 40;
  }

  if (title !== rawTitle) {
    confidence += 10;
  }

  return {
    normalizedTitle: title || rawTitle,
    flags,
    confidence: Math.min(100, confidence),
  };
}

function isGenericTitle(title: string): boolean {
  const genericPatterns = [
    /^consultation$/i,
    /^review$/i,
    /^meeting$/i,
    /^call$/i,
    /^discussion$/i,
    /^session$/i,
    /^training$/i,
    /^workshop$/i,
    /^support$/i,
    /^help$/i,
  ];

  return genericPatterns.some(pattern => pattern.test(title.trim()));
}

export function detectLowValueSupportActivity(title: string): boolean {
  return LOW_VALUE_SUPPORT_TITLES.some(pattern => pattern.test(title));
}

export function extractQuarterFromTitle(title: string): 'q1' | 'q2' | 'q3' | 'q4' | null {
  const match = title.match(/\bQ([1-4])\b/i);
  if (match) {
    return `q${match[1]}` as 'q1' | 'q2' | 'q3' | 'q4';
  }
  return null;
}
