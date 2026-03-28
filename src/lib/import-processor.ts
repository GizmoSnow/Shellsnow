import { parseCSV, findColumn } from './csv-parser';
import { parseExcelFile, isExcelFile } from './excel-parser';
import { detectAdapter, scoreAllAdapters } from './import-adapters';
import type { ImportResult, NormalizedActivityCandidate, ImportDiagnostics, ImportBatch, AdapterScore } from './import-types';
import { supabase } from './supabase';
import { detectDuplicates } from './deduplication';
import { validateCandidate, buildWarnings, buildErrorMessages, checkForDuplicates, determineSkipReason } from './import-validation';

export async function processImportFile(
  file: File,
  roadmapId: string,
  userId: string,
  batchName?: string
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

    const adapterScores = scoreAllAdapters(headers);
    const adapter = detectAdapter(headers);

    diagnostics.adapterScores = adapterScores.map(s => ({
      adapterName: s.name,
      score: s.score,
      confidence: s.score / 20,
      matchedFields: [],
      missingFields: [],
    }));

    if (!adapter) {
      errors.push(
        'Unable to detect report type from file headers. ' +
        'Supported formats: OrgCS Engagement, Org62 Support, Org62 Training. ' +
        'Please ensure your file has recognizable column names.'
      );
      return { batchId, totalRows: rows.length, parsedRows: 0, candidates: [], errors, diagnostics };
    }

    diagnostics.detectedAdapter = adapter.name;

    if (rows.length > 0) {
      const sampleRow = rows[0];
      const mappings: Record<string, string> = {};

      Object.keys(sampleRow).forEach(header => {
        if (sampleRow[header]) {
          mappings[header] = sampleRow[header];
        }
      });

      diagnostics.sampleMappedValues = mappings;
    }

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

    const defaultBatchName = batchName || `${adapter.name} - ${new Date().toLocaleDateString()}`;

    for (const row of rows) {
      try {
        const candidate = adapter.normalize(row, batchId, roadmapId, userId);

        if (candidate) {
          candidate.batchName = defaultBatchName;
          candidate.fileName = file.name;
          candidate.importStatus = 'pending';
          candidate.isDeleted = false;

          const validation = validateCandidate(candidate);
          const warnings = buildWarnings(candidate);
          const candidateErrors = buildErrorMessages(validation);

          candidate.warnings = warnings.length > 0 ? warnings : undefined;
          candidate.errors = candidateErrors.length > 0 ? candidateErrors : undefined;
          candidate.validationDetails = validation;
          candidate.detectedAdapter = adapter.name;
          candidate.adapterScores = diagnostics.adapterScores;

          candidates.push(candidate);
        }
      } catch (error) {
        errors.push(`Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    detectDuplicates(candidates);

    if (candidates.length > 0) {
      await createBatchMetadata({
        id: batchId,
        userId,
        roadmapId,
        batchName: defaultBatchName,
        fileName: file.name,
        sourceSystem: adapter.sourceSystem,
        sourceType: adapter.sourceType,
        totalRows: candidates.length,
        importedCount: 0,
        ignoredCount: 0,
      });

      try {
        await saveCandidatesToDatabase(candidates);
      } catch (saveError) {
        // Clean up orphaned batch if candidate save fails
        await supabase.from('import_batches').delete().eq('id', batchId);
        throw saveError;
      }
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
    batch_name: c.batchName,
    file_name: c.fileName,
    import_status: c.importStatus,
    imported_at: c.importedAt,
    goal_id: c.goalId,
    initiative_id: c.initiativeId,
    is_deleted: c.isDeleted,
    warnings: c.warnings,
    errors: c.errors,
    skip_reason: c.skipReason,
    duplicate_detection: c.duplicateDetection,
    validation_details: c.validationDetails,
    adapter_scores: c.adapterScores,
    detected_adapter: c.detectedAdapter,
    field_mappings: c.fieldMappings,
  }));

  const { error } = await supabase.from('activity_import_candidates').insert(dbRecords);

  if (error) {
    throw new Error(`Failed to save candidates to database: ${error.message}`);
  }
}

async function createBatchMetadata(batch: Partial<ImportBatch>): Promise<void> {
  const { error } = await supabase.from('import_batches').insert({
    id: batch.id,
    user_id: batch.userId,
    roadmap_id: batch.roadmapId,
    batch_name: batch.batchName,
    file_name: batch.fileName,
    source_system: batch.sourceSystem,
    source_type: batch.sourceType,
    notes: batch.notes,
    total_rows: batch.totalRows,
    imported_count: batch.importedCount,
    ignored_count: batch.ignoredCount,
  });

  if (error) {
    throw new Error(`Failed to create batch metadata: ${error.message}`);
  }
}

export async function loadCandidatesFromDatabase(batchId: string, includeDeleted = false): Promise<NormalizedActivityCandidate[]> {
  let query = supabase
    .from('activity_import_candidates')
    .select('*')
    .eq('batch_id', batchId);

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

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
    batchName: row.batch_name,
    fileName: row.file_name,
    importStatus: row.import_status,
    importedAt: row.imported_at,
    goalId: row.goal_id,
    initiativeId: row.initiative_id,
    destinationGoalId: row.goal_id,
    destinationInitiativeId: row.initiative_id,
    isDeleted: row.is_deleted,
    overrideTitle: row.override_title,
    overrideStartDate: row.override_start_date,
    overrideEndDate: row.override_end_date,
    overrideStartMonth: row.override_start_month,
    overrideEndMonth: row.override_end_month,
    overrideActivityType: row.override_activity_type,
    overrideOwner: row.override_owner,
    overrideStatus: row.override_status,
    warnings: row.warnings,
    errors: row.errors,
    skipReason: row.skip_reason,
    duplicateDetection: row.duplicate_detection,
    validationDetails: row.validation_details,
    adapterScores: row.adapter_scores,
    detectedAdapter: row.detected_adapter,
    fieldMappings: row.field_mappings,
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
  if (updates.overrideStartMonth !== undefined) dbUpdates.override_start_month = updates.overrideStartMonth;
  if (updates.overrideEndMonth !== undefined) dbUpdates.override_end_month = updates.overrideEndMonth;
  if (updates.overrideActivityType !== undefined) dbUpdates.override_activity_type = updates.overrideActivityType;
  if (updates.overrideOwner !== undefined) dbUpdates.override_owner = updates.overrideOwner;
  if (updates.overrideStatus !== undefined) dbUpdates.override_status = updates.overrideStatus;
  if (updates.importStatus !== undefined) dbUpdates.import_status = updates.importStatus;
  if (updates.importedAt !== undefined) dbUpdates.imported_at = updates.importedAt;
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
  if (updates.initiativeId !== undefined) dbUpdates.initiative_id = updates.initiativeId;
  if (updates.destinationGoalId !== undefined) dbUpdates.goal_id = updates.destinationGoalId;
  if (updates.destinationInitiativeId !== undefined) dbUpdates.initiative_id = updates.destinationInitiativeId;
  if (updates.isDeleted !== undefined) dbUpdates.is_deleted = updates.isDeleted;
  if (updates.warnings !== undefined) dbUpdates.warnings = updates.warnings;
  if (updates.errors !== undefined) dbUpdates.errors = updates.errors;
  if (updates.skipReason !== undefined) dbUpdates.skip_reason = updates.skipReason;
  if (updates.duplicateDetection !== undefined) dbUpdates.duplicate_detection = updates.duplicateDetection;
  if (updates.validationDetails !== undefined) dbUpdates.validation_details = updates.validationDetails;

  const { error } = await supabase
    .from('activity_import_candidates')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update candidate: ${error.message}`);
  }
}

export async function updateCandidates(
  ids: string[],
  updates: Partial<NormalizedActivityCandidate>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.include !== undefined) dbUpdates.include = updates.include;
  if (updates.importStatus !== undefined) dbUpdates.import_status = updates.importStatus;
  if (updates.importedAt !== undefined) dbUpdates.imported_at = updates.importedAt;
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
  if (updates.initiativeId !== undefined) dbUpdates.initiative_id = updates.initiativeId;
  if (updates.destinationGoalId !== undefined) dbUpdates.goal_id = updates.destinationGoalId;
  if (updates.destinationInitiativeId !== undefined) dbUpdates.initiative_id = updates.destinationInitiativeId;
  if (updates.isDeleted !== undefined) dbUpdates.is_deleted = updates.isDeleted;

  const { error } = await supabase
    .from('activity_import_candidates')
    .update(dbUpdates)
    .in('id', ids);

  if (error) {
    throw new Error(`Failed to update candidates: ${error.message}`);
  }
}

export async function deleteBatch(batchId: string): Promise<void> {
  const { error: candidatesError } = await supabase
    .from('activity_import_candidates')
    .delete()
    .eq('batch_id', batchId);

  if (candidatesError) {
    throw new Error(`Failed to delete batch candidates: ${candidatesError.message}`);
  }

  const { error: batchError } = await supabase
    .from('import_batches')
    .delete()
    .eq('id', batchId);

  if (batchError) {
    throw new Error(`Failed to delete batch metadata: ${batchError.message}`);
  }
}

export async function loadBatches(userId: string, roadmapId?: string): Promise<ImportBatch[]> {
  let query = supabase
    .from('import_batches')
    .select('*')
    .eq('user_id', userId);

  if (roadmapId) {
    query = query.eq('roadmap_id', roadmapId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load batches: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    roadmapId: row.roadmap_id,
    batchName: row.batch_name,
    fileName: row.file_name,
    sourceSystem: row.source_system,
    sourceType: row.source_type,
    notes: row.notes,
    totalRows: row.total_rows,
    importedCount: row.imported_count,
    ignoredCount: row.ignored_count,
    failedCount: row.failed_count,
    skippedCount: row.skipped_count,
    lastImportSummary: row.last_import_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function updateBatchMetadata(
  batchId: string,
  updates: Partial<ImportBatch>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.batchName !== undefined) dbUpdates.batch_name = updates.batchName;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { error } = await supabase
    .from('import_batches')
    .update(dbUpdates)
    .eq('id', batchId);

  if (error) {
    throw new Error(`Failed to update batch metadata: ${error.message}`);
  }
}

export async function validateAndCheckDuplicates(
  candidates: NormalizedActivityCandidate[],
  roadmapId: string
): Promise<void> {
  for (const candidate of candidates) {
    const validation = validateCandidate(candidate);
    const duplicateCheck = await checkForDuplicates(candidate, roadmapId);

    candidate.duplicateDetection = duplicateCheck;
    candidate.validationDetails = validation;
    candidate.skipReason = determineSkipReason(candidate, validation, duplicateCheck);

    if (duplicateCheck.isDuplicate) {
      candidate.include = false;
    }

    await updateCandidate(candidate.id, {
      duplicateDetection: duplicateCheck,
      validationDetails: validation,
      skipReason: candidate.skipReason,
      warnings: candidate.warnings,
      errors: candidate.errors,
      include: candidate.include,
    });
  }
}

export async function updateBatchCounts(batchId: string): Promise<void> {
  const { data, error } = await supabase
    .from('activity_import_candidates')
    .select('import_status, is_deleted, skip_reason, errors')
    .eq('batch_id', batchId)
    .eq('is_deleted', false);

  if (error) {
    throw new Error(`Failed to load candidates for count: ${error.message}`);
  }

  const importedCount = data.filter(c => c.import_status === 'imported').length;
  const ignoredCount = data.filter(c => c.import_status === 'ignored').length;
  const skippedCount = data.filter(c => c.skip_reason).length;
  const failedCount = data.filter(c => c.errors && c.errors.length > 0).length;

  await supabase
    .from('import_batches')
    .update({
      imported_count: importedCount,
      ignored_count: ignoredCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
    })
    .eq('id', batchId);
}
