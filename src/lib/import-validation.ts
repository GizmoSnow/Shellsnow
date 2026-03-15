import type {
  NormalizedActivityCandidate,
  ValidationDetails,
  DuplicateDetection
} from './import-types';
import { supabase } from './supabase';

export function validateCandidate(candidate: NormalizedActivityCandidate): ValidationDetails {
  const fieldErrors: Record<string, string> = {};
  const missingRequired: string[] = [];
  const invalidValues: Record<string, string> = {};

  if (!candidate.normalizedTitle || candidate.normalizedTitle.trim().length === 0) {
    missingRequired.push('title');
    fieldErrors.title = 'Title is required';
  }

  if (!candidate.owner) {
    missingRequired.push('owner');
    fieldErrors.owner = 'Owner (Salesforce/Partner/Customer) is required';
  }

  if (!candidate.activityType) {
    missingRequired.push('activityType');
    fieldErrors.activityType = 'Activity type could not be determined';
  }

  if (!candidate.startDate && !candidate.startMonth) {
    missingRequired.push('date');
    fieldErrors.date = 'No usable date field found';
  }

  if (candidate.startMonth !== undefined && (candidate.startMonth < 0 || candidate.startMonth > 11)) {
    invalidValues.startMonth = `Invalid start month: ${candidate.startMonth}`;
  }

  if (candidate.endMonth !== undefined && (candidate.endMonth < 0 || candidate.endMonth > 11)) {
    invalidValues.endMonth = `Invalid end month: ${candidate.endMonth}`;
  }

  if (candidate.activityType === 'spanning' && !candidate.quarters?.length) {
    invalidValues.quarters = 'Spanning activity missing quarters';
  }

  const isValid = missingRequired.length === 0 && Object.keys(invalidValues).length === 0;

  return {
    isValid,
    ...(Object.keys(fieldErrors).length > 0 && { fieldErrors }),
    ...(missingRequired.length > 0 && { missingRequired }),
    ...(Object.keys(invalidValues).length > 0 && { invalidValues }),
  };
}

export async function checkForDuplicates(
  candidate: NormalizedActivityCandidate,
  roadmapId: string
): Promise<DuplicateDetection> {
  if (candidate.sourceRecordId) {
    const { data: existingPills } = await supabase
      .from('activities')
      .select('id, name')
      .eq('roadmap_id', roadmapId)
      .eq('source_record_id', candidate.sourceRecordId)
      .maybeSingle();

    if (existingPills) {
      return {
        isDuplicate: true,
        matchType: 'source_record_id',
        matchedPillId: existingPills.id,
        matchDetails: `Already imported as "${existingPills.name}"`,
      };
    }

    const { data: existingCandidates } = await supabase
      .from('activity_import_candidates')
      .select('id, normalized_title, import_status')
      .eq('roadmap_id', roadmapId)
      .eq('source_record_id', candidate.sourceRecordId)
      .neq('id', candidate.id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingCandidates) {
      return {
        isDuplicate: true,
        matchType: 'source_record_id',
        matchedCandidateId: existingCandidates.id,
        matchDetails: `Duplicate in staging: "${existingCandidates.normalized_title}" (${existingCandidates.import_status})`,
      };
    }
  }

  if (candidate.normalizedTitle && candidate.startDate) {
    const { data: existingPills } = await supabase
      .from('activities')
      .select('id, name, start_month')
      .eq('roadmap_id', roadmapId)
      .eq('name', candidate.normalizedTitle)
      .maybeSingle();

    if (existingPills && existingPills.start_month === candidate.startMonth) {
      return {
        isDuplicate: true,
        matchType: 'title_and_date',
        matchedPillId: existingPills.id,
        matchDetails: `Similar pill exists: "${existingPills.name}" in same timeframe`,
      };
    }
  }

  return { isDuplicate: false };
}

export function buildWarnings(candidate: NormalizedActivityCandidate): string[] {
  const warnings: string[] = [];

  if (candidate.confidence !== undefined && candidate.confidence < 0.7) {
    warnings.push(`Low confidence classification (${Math.round(candidate.confidence * 100)}%)`);
  }

  if (!candidate.status) {
    warnings.push('Status could not be determined');
  }

  if (!candidate.health) {
    warnings.push('Health indicator not available');
  }

  if (candidate.activityType === 'standard' && candidate.endMonth && candidate.endMonth !== candidate.startMonth) {
    warnings.push('Standard activity spans multiple months');
  }

  if (candidate.flags && candidate.flags.length > 0) {
    candidate.flags.forEach(flag => {
      warnings.push(`Flag: ${flag}`);
    });
  }

  if (!candidate.sourceRecordId) {
    warnings.push('No source record ID - cannot prevent future duplicates');
  }

  return warnings;
}

export function buildErrorMessages(validation: ValidationDetails): string[] {
  const errors: string[] = [];

  if (validation.missingRequired) {
    validation.missingRequired.forEach(field => {
      errors.push(`Missing required field: ${field}`);
    });
  }

  if (validation.fieldErrors) {
    Object.entries(validation.fieldErrors).forEach(([field, message]) => {
      if (!validation.missingRequired?.includes(field)) {
        errors.push(message);
      }
    });
  }

  if (validation.invalidValues) {
    Object.values(validation.invalidValues).forEach(message => {
      errors.push(message);
    });
  }

  return errors;
}

export function determineSkipReason(
  candidate: NormalizedActivityCandidate,
  validation: ValidationDetails,
  duplicate: DuplicateDetection
): string | undefined {
  if (duplicate.isDuplicate) {
    return `Duplicate: ${duplicate.matchDetails}`;
  }

  if (!validation.isValid) {
    return 'Validation failed';
  }

  if (!candidate.include) {
    return 'Excluded by user';
  }

  return undefined;
}
