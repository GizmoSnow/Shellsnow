import { parseCSV, findColumn } from './csv-parser';
import { parseExcelFile, isExcelFile } from './excel-parser';
import { detectAdapter } from './import-adapters';
import type { ImportResult, NormalizedActivityCandidate, ImportDiagnostics } from './import-types';
import { supabase } from './supabase';
import { detectDuplicates } from './deduplication';

export async function processImportFile(
  file: File,
  roadmapId: string,
  userId: string
): Promise<ImportResult> {
  const batchId = crypto.randomUUID();
  const errors: string[] = [];
  const candidates: NormalizedActivityCandidate[] = [];
  const diagnostics: ImportDiagnostics = {};

  try {
    let rows;

    if (isExcelFile(file.name)) {
      rows = await parseExcelFile(file);
    } else {
      const content = await file.text();
      rows = parseCSV(content);
    }

    if (rows.length === 0) {
      errors.push('No data rows found in file');
      return { batchId, totalRows: 0, parsedRows: 0, candidates: [], errors, diagnostics };
    }

    const headers = Object.keys(rows[0]);
    diagnostics.rawHeaders = headers;
    diagnostics.normalizedHeaders = headers.map(h =>
      h.toLowerCase().trim().replace(/[\s_-]+/g, '')
    );

    const adapter = detectAdapter(headers);

    if (!adapter) {
      errors.push(
        'Unable to detect report type from file headers. ' +
        'Supported formats: OrgCS Engagement, Org62 Support, Org62 Training. ' +
        'Please ensure your file has recognizable column names.'
      );
      return { batchId, totalRows: rows.length, parsedRows: 0, candidates: [], errors, diagnostics };
    }

    diagnostics.detectedAdapter = adapter.name;

    if (adapter.sourceSystem === 'org62_training' && rows.length > 0) {
      const sampleRow = rows[0];
      diagnostics.dateFields = {
        completionDate: findColumn(sampleRow, ['Completion Date', 'Completed Date', 'Date Completed']),
        sessionDate: findColumn(sampleRow, ['Session Date', 'Class Date', 'Training Date']),
        enrollmentDate: findColumn(sampleRow, ['Start Date', 'Enrollment Date', 'Registration Date', 'Date Enrolled']),
        endDate: findColumn(sampleRow, ['End Date']),
      };

      const selectedField = diagnostics.dateFields.completionDate ? 'Completion Date' :
                           diagnostics.dateFields.sessionDate ? 'Session Date' :
                           diagnostics.dateFields.enrollmentDate ? 'Start/Enrollment Date' :
                           diagnostics.dateFields.endDate ? 'End Date' :
                           'None';
      diagnostics.dateFields.selectedField = selectedField;
    }

    for (const row of rows) {
      try {
        const candidate = adapter.normalize(row, batchId, roadmapId, userId);

        if (candidate) {
          candidates.push(candidate);
        }
      } catch (error) {
        errors.push(`Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    detectDuplicates(candidates);

    if (candidates.length > 0) {
      await saveCandidatesToDatabase(candidates);
    }

    return {
      batchId,
      totalRows: rows.length,
      parsedRows: candidates.length,
      candidates,
      errors,
      diagnostics,
    };
  } catch (error) {
    errors.push(`File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { batchId, totalRows: 0, parsedRows: 0, candidates: [], errors, diagnostics };
  }
}

async function saveCandidatesToDatabase(candidates: NormalizedActivityCandidate[]): Promise<void> {
  const dbRecords = candidates.map((c) => ({
    id: c.id,
    batch_id: c.batchId,
    roadmap_id: c.roadmapId,
    user_id: c.userId,
    source_system: c.sourceSystem,
    source_type: c.sourceType,
    source_record_id: c.sourceRecordId,
    raw_title: c.rawTitle,
    raw_template: c.rawTemplate,
    raw_stage: c.rawStage,
    start_date: c.startDate,
    end_date: c.endDate,
    normalized_title: c.normalizedTitle,
    normalized_category: c.normalizedCategory,
    owner: c.owner,
    activity_type: c.activityType,
    start_month: c.startMonth,
    end_month: c.endMonth,
    quarters: c.quarters,
    health: c.health,
    status: c.status,
    confidence: c.confidence,
    flags: c.flags,
    include: c.include,
  }));

  const { error } = await supabase.from('activity_import_candidates').insert(dbRecords);

  if (error) {
    throw new Error(`Failed to save candidates to database: ${error.message}`);
  }
}

export async function loadCandidatesFromDatabase(batchId: string): Promise<NormalizedActivityCandidate[]> {
  const { data, error } = await supabase
    .from('activity_import_candidates')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load candidates: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    roadmapId: row.roadmap_id,
    userId: row.user_id,
    sourceSystem: row.source_system,
    sourceType: row.source_type,
    sourceRecordId: row.source_record_id,
    rawTitle: row.raw_title,
    rawTemplate: row.raw_template,
    rawStage: row.raw_stage,
    startDate: row.start_date,
    endDate: row.end_date,
    normalizedTitle: row.normalized_title,
    normalizedCategory: row.normalized_category,
    owner: row.owner,
    activityType: row.activity_type,
    startMonth: row.start_month,
    endMonth: row.end_month,
    quarters: row.quarters,
    health: row.health,
    status: row.status,
    confidence: row.confidence,
    flags: row.flags,
    include: row.include,
    overrideTitle: row.override_title,
    overrideStartDate: row.override_start_date,
    overrideEndDate: row.override_end_date,
    overrideActivityType: row.override_activity_type,
    overrideOwner: row.override_owner,
    overrideStatus: row.override_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function updateCandidate(
  id: string,
  updates: Partial<NormalizedActivityCandidate>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.include !== undefined) dbUpdates.include = updates.include;
  if (updates.overrideTitle !== undefined) dbUpdates.override_title = updates.overrideTitle;
  if (updates.overrideStartDate !== undefined) dbUpdates.override_start_date = updates.overrideStartDate;
  if (updates.overrideEndDate !== undefined) dbUpdates.override_end_date = updates.overrideEndDate;
  if (updates.overrideActivityType !== undefined) dbUpdates.override_activity_type = updates.overrideActivityType;
  if (updates.overrideOwner !== undefined) dbUpdates.override_owner = updates.overrideOwner;
  if (updates.overrideStatus !== undefined) dbUpdates.override_status = updates.overrideStatus;

  const { error } = await supabase
    .from('activity_import_candidates')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update candidate: ${error.message}`);
  }
}

export async function deleteBatch(batchId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_import_candidates')
    .delete()
    .eq('batch_id', batchId);

  if (error) {
    throw new Error(`Failed to delete batch: ${error.message}`);
  }
}
