import type { NormalizedActivityCandidate } from './import-types';

export function detectDuplicates(candidates: NormalizedActivityCandidate[]): void {
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (arePotentialDuplicates(candidates[i], candidates[j])) {
        if (!candidates[i].flags) candidates[i].flags = [];
        if (!candidates[j].flags) candidates[j].flags = [];

        if (!candidates[i].flags.includes('PossibleDuplicate')) {
          candidates[i].flags.push('PossibleDuplicate');
        }
        if (!candidates[j].flags.includes('PossibleDuplicate')) {
          candidates[j].flags.push('PossibleDuplicate');
        }
      }
    }
  }
}

function arePotentialDuplicates(
  a: NormalizedActivityCandidate,
  b: NormalizedActivityCandidate
): boolean {
  if (a.sourceRecordId && b.sourceRecordId && a.sourceRecordId === b.sourceRecordId) {
    return true;
  }

  const titleSimilarity = calculateTitleSimilarity(
    a.overrideTitle || a.normalizedTitle,
    b.overrideTitle || b.normalizedTitle
  );

  if (titleSimilarity > 0.8) {
    const datesOverlap = checkDateOverlap(
      a.overrideStartDate || a.startDate,
      a.overrideEndDate || a.endDate,
      b.overrideStartDate || b.startDate,
      b.overrideEndDate || b.endDate
    );

    if (datesOverlap) {
      return true;
    }
  }

  return false;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const norm1 = normalize(title1);
  const norm2 = normalize(title2);

  if (norm1 === norm2) return 1;

  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;

  if (longer.length === 0) return 1;

  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.85;
  }

  const distance = levenshteinDistance(norm1, norm2);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

function checkDateOverlap(
  start1: string | undefined,
  end1: string | undefined,
  start2: string | undefined,
  end2: string | undefined
): boolean {
  if (!start1 || !start2) return false;

  const s1 = new Date(start1);
  const e1 = end1 ? new Date(end1) : s1;
  const s2 = new Date(start2);
  const e2 = end2 ? new Date(end2) : s2;

  const daysDiff = Math.abs(s1.getTime() - s2.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 7) return true;

  const sameMonth =
    s1.getFullYear() === s2.getFullYear() && s1.getMonth() === s2.getMonth();

  if (sameMonth) return true;

  return s1 <= e2 && s2 <= e1;
}
