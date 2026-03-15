export type ActivityOwner = 'salesforce' | 'partner' | 'customer';

export interface ActivityTypeMetadata {
  key: string;
  label: string;
  color: string;
  owner: ActivityOwner;
}

export const QUICK_PICK_TYPE_KEYS = ['csm', 'architect', 'specialist', 'advisory', 'enablement', 'event'] as const;

// Salesforce brand-aligned color palette optimized for white text accessibility
export const SALESFORCE_COLOR_PALETTE = [
  '#0176D3',  // Blue 50
  '#0D9DDA',  // Cloud Blue 60
  '#066AFE',  // Electric Blue 50
  '#5867E8',  // Indigo 50
  '#AD7BEE',  // Purple 60
  '#BA01FF',  // Violet 50
  '#FF538A',  // Pink 60
  '#F38303',  // Orange 65
  '#AA3001',  // Hot Orange 40
  '#E4A201',  // Yellow 70
  '#45C65A',  // Green 70
  '#2E844A',  // Green 50
  '#06A59A',  // Teal 60
  '#056764',  // Teal 40
  '#2F2CB7',  // Indigo 30
  '#7526E3'   // Purple 40
];

export const DEFAULT_ACTIVITY_TYPES: ActivityTypeMetadata[] = [
  {
    key: 'csm',
    label: 'CSM',
    color: '#45C65A',
    owner: 'salesforce'
  },
  {
    key: 'architect',
    label: 'Success Architect',
    color: '#0D9DDA',
    owner: 'salesforce'
  },
  {
    key: 'specialist',
    label: 'Success Specialist',
    color: '#5867E8',
    owner: 'salesforce'
  },
  {
    key: 'advisory',
    label: 'Product Advisory',
    color: '#7526E3',
    owner: 'salesforce'
  },
  {
    key: 'enablement',
    label: 'Enablement',
    color: '#06A59A',
    owner: 'salesforce'
  },
  {
    key: 'event',
    label: 'Event',
    color: '#FF538A',
    owner: 'salesforce'
  }
];

export function getTypeMetadata(
  key: string,
  customTypes: ActivityTypeMetadata[] = []
): ActivityTypeMetadata | undefined {
  const customType = customTypes.find(t => t.key === key);
  if (customType) return customType;

  return DEFAULT_ACTIVITY_TYPES.find(t => t.key === key);
}

export function getAllTypeMetadata(
  customTypes: ActivityTypeMetadata[] = []
): ActivityTypeMetadata[] {
  const customKeys = new Set(customTypes.map(t => t.key));
  const defaults = DEFAULT_ACTIVITY_TYPES.filter(t => !customKeys.has(t.key));

  return [...customTypes, ...defaults];
}

export function getTypesByOwner(
  owner: ActivityOwner,
  customTypes: ActivityTypeMetadata[] = []
): ActivityTypeMetadata[] {
  return getAllTypeMetadata(customTypes).filter(t => t.owner === owner);
}

export function getQuickPickTypes(
  customTypes: ActivityTypeMetadata[] = []
): ActivityTypeMetadata[] {
  const allTypes = getAllTypeMetadata(customTypes);
  const quickPickSet = new Set(QUICK_PICK_TYPE_KEYS);

  return allTypes.filter(t =>
    quickPickSet.has(t.key as any) && t.owner === 'salesforce'
  );
}

export function getNextAvailableColor(
  customTypes: ActivityTypeMetadata[] = [],
  typeColors: Record<string, string> = {}
): string {
  // Collect all currently used colors
  const usedColors = new Set<string>();

  // Add colors from default types
  DEFAULT_ACTIVITY_TYPES.forEach(t => usedColors.add(t.color.toUpperCase()));

  // Add colors from custom types
  customTypes.forEach(t => usedColors.add(t.color.toUpperCase()));

  // Add colors from legacy typeColors
  Object.values(typeColors).forEach(c => usedColors.add(c.toUpperCase()));

  // Find first unused color from palette
  for (const color of SALESFORCE_COLOR_PALETTE) {
    if (!usedColors.has(color.toUpperCase())) {
      return color;
    }
  }

  // If all colors are used, cycle from the start
  const allTypes = getAllTypeMetadata(customTypes);
  const index = allTypes.length % SALESFORCE_COLOR_PALETTE.length;
  return SALESFORCE_COLOR_PALETTE[index];
}
