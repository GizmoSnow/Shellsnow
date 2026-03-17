import type { NormalizedActivityCandidate } from './import-types';
import type { RoadmapData, Activity } from './supabase';
import { updateCandidate, updateCandidates, updateBatchCounts } from './import-processor';
import { appendMetadataToDescription } from './import-metadata-formatter';
import { getAllRoadmapMonths, type FiscalYearConfig } from './fiscal-year';
import { validateCandidate, buildErrorMessages } from './import-validation';

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ candidate: NormalizedActivityCandidate; error: string }>;
  updatedRoadmapData: RoadmapData;
}

function deriveMonthFromDate(date?: string): number | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.getMonth();
}

export async function executeImport(
  batchId: string,
  candidates: NormalizedActivityCandidate[],
  roadmapData: RoadmapData,
  fiscalConfig: FiscalYearConfig
): Promise<ImportResult> {
  const importedIds: string[] = [];
  const failedImports: Array<{ candidate: NormalizedActivityCandidate; error: string }> = [];
  const skippedImports: Array<{ candidate: NormalizedActivityCandidate; reason: string }> = [];
  const updatedData = { ...roadmapData };

  for (const candidate of candidates) {
    try {
      if (!candidate.include) {
        skippedImports.push({ candidate, reason: 'Excluded by user' });
        await updateCandidate(candidate.id, {
          importStatus: 'ignored',
          skipReason: 'Excluded by user',
        });
        continue;
      }

      const validation = validateCandidate(candidate);
      const currentErrors = buildErrorMessages(validation);
      if (currentErrors.length > 0) {
        failedImports.push({ candidate, error: currentErrors.join('; ') });
        await updateCandidate(candidate.id, {
          errors: currentErrors,
        });
        continue;
      }

      if (candidate.duplicateDetection?.isDuplicate) {
        skippedImports.push({
          candidate,
          reason: `Duplicate: ${candidate.duplicateDetection.matchDetails}`
        });
        await updateCandidate(candidate.id, {
          importStatus: 'ignored',
          skipReason: `Duplicate: ${candidate.duplicateDetection.matchDetails}`,
        });
        continue;
      }

      const finalTitle = candidate.overrideTitle || candidate.normalizedTitle;
      const finalOwner = candidate.overrideOwner || candidate.owner;
      const finalStatus = candidate.overrideStatus || candidate.status;
      const finalStartMonth =
        candidate.overrideStartMonth ??
        candidate.startMonth ??
        deriveMonthFromDate(candidate.overrideStartDate ?? candidate.startDate);
      const finalEndMonth =
        candidate.overrideEndMonth ??
        candidate.endMonth ??
        deriveMonthFromDate(candidate.overrideEndDate ?? candidate.endDate);

      if (!finalTitle || !finalOwner) {
        failedImports.push({ candidate, error: 'Missing required fields: title or owner' });
        await updateCandidate(candidate.id, {
          errors: ['Missing required fields'],
        });
        continue;
      }

      if (finalStartMonth === undefined) {
        failedImports.push({ candidate, error: 'Missing required field: date' });
        await updateCandidate(candidate.id, {
          errors: ['Missing required field: date'],
        });
        continue;
      }

      const goalId = candidate.destinationGoalId || candidate.goalId;
      if (!goalId) {
        failedImports.push({ candidate, error: 'Goal required before import' });
        await updateCandidate(candidate.id, {
          errors: ['Goal required before import'],
        });
        continue;
      }

      const targetGoal = updatedData.goals.find(g => g.id === goalId);
      if (!targetGoal) {
        failedImports.push({ candidate, error: 'Selected goal not found' });
        await updateCandidate(candidate.id, {
          errors: ['Selected goal not found'],
        });
        continue;
      }

      let initiativeId = candidate.destinationInitiativeId || candidate.initiativeId;
      if (targetGoal.initiatives.length > 0 && !initiativeId) {
        if (targetGoal.initiatives.length === 1) {
          initiativeId = targetGoal.initiatives[0].id;
        } else {
          failedImports.push({ candidate, error: 'Initiative required for selected goal' });
          await updateCandidate(candidate.id, {
            errors: ['Initiative required for selected goal'],
          });
          continue;
        }
      }

      const typeKey = mapSourceTypeToActivityType(candidate.sourceType);

      const activity: Activity = {
        id: crypto.randomUUID(),
        name: finalTitle,
        type: typeKey,
        owner: finalOwner,
        status: finalStatus,
        health: candidate.health,
        start_month: finalStartMonth,
        end_month: finalEndMonth,
        sourceType: candidate.sourceType,
        sourceSystem: candidate.sourceSystem,
        sourceRecordId: candidate.sourceRecordId,
        description: appendMetadataToDescription(undefined, candidate),
      };

      if (candidate.activityType === 'spanning' && candidate.quarters) {
        const spanningActivity: any = {
          ...activity,
          quarters: candidate.quarters,
        };
        delete spanningActivity.start_month;
        delete spanningActivity.end_month;

        if (!updatedData.accountSpanning) {
          updatedData.accountSpanning = [];
        }
        updatedData.accountSpanning.push(spanningActivity);
      } else {
        const targetQuarter = determineQuarterFromActivity(activity, fiscalConfig);

        if (initiativeId) {
          const targetInitiative = targetGoal.initiatives.find(i => i.id === initiativeId);
          if (targetInitiative) {
            targetInitiative.activities[targetQuarter].push(activity);
          }
        } else {
          if (!targetGoal.initiatives || targetGoal.initiatives.length === 0) {
            if (!targetGoal.initiatives) {
              targetGoal.initiatives = [];
            }
            if (targetGoal.initiatives.length === 0) {
              targetGoal.initiatives.push({
                id: crypto.randomUUID(),
                label: '',
                activities: { q1: [], q2: [], q3: [], q4: [] }
              });
            }
            targetGoal.initiatives[0].activities[targetQuarter].push(activity);
          }
        }
      }

      await updateCandidate(candidate.id, {
        errors: [],
      });

      importedIds.push(candidate.id);
    } catch (error) {
      failedImports.push({
        candidate,
        error: error instanceof Error ? error.message : 'Unknown error during import'
      });
      await updateCandidate(candidate.id, {
        errors: [error instanceof Error ? error.message : 'Import failed'],
      });
    }
  }

  if (importedIds.length > 0) {
    await updateCandidates(importedIds, {
      importStatus: 'imported',
      importedAt: new Date().toISOString(),
    });
  }

  await updateBatchCounts(batchId);

  return {
    importedCount: importedIds.length,
    skippedCount: skippedImports.length,
    failedCount: failedImports.length,
    errors: failedImports,
    updatedRoadmapData: updatedData,
  };
}

function determineQuarterFromActivity(activity: Activity, fiscalConfig: FiscalYearConfig): 'q1' | 'q2' | 'q3' | 'q4' {
  if (activity.start_month === undefined || activity.start_month === null) return 'q1';

  const allMonths = getAllRoadmapMonths(fiscalConfig);
  const monthIndex = allMonths.findIndex(m => m.calendarMonth === activity.start_month);

  if (monthIndex === -1) return 'q1';

  const quarterIndex = Math.floor(monthIndex / 3);
  return `q${quarterIndex + 1}` as 'q1' | 'q2' | 'q3' | 'q4';
}

function mapSourceTypeToActivityType(sourceType: string): string {
  switch (sourceType) {
    case 'engagement':
      return 'architect';
    case 'support':
      return 'specialist';
    case 'training':
      return 'enablement';
    default:
      return 'csm';
  }
}
