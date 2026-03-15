import type { NormalizedActivityCandidate } from './import-types';

export function formatImportMetadata(candidate: NormalizedActivityCandidate): string {
  const metadataParts: string[] = [];

  if (candidate.sourceAccountName) {
    metadataParts.push(`Account: ${candidate.sourceAccountName}`);
  }

  if (candidate.sourceReportType) {
    metadataParts.push(`Source: ${candidate.sourceReportType}`);
  }

  if (candidate.sourceOrgName) {
    metadataParts.push(`Org: ${candidate.sourceOrgName}`);
  }

  if (candidate.sourceTemplateName) {
    metadataParts.push(`Template: ${candidate.sourceTemplateName}`);
  }

  if (candidate.sourceStageRaw) {
    metadataParts.push(`Status: ${candidate.sourceStageRaw}`);
  }

  if (candidate.sourceRecordId) {
    metadataParts.push(`Record ID: ${candidate.sourceRecordId}`);
  }

  if (metadataParts.length === 0) {
    return '';
  }

  return '\n\nImported metadata:\n' + metadataParts.join('\n');
}

export function appendMetadataToDescription(
  existingDescription: string | undefined,
  candidate: NormalizedActivityCandidate
): string | undefined {
  const metadata = formatImportMetadata(candidate);

  if (!metadata) {
    return existingDescription;
  }

  if (!existingDescription) {
    return metadata.trim();
  }

  return existingDescription + metadata;
}
