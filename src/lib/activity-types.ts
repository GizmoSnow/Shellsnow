export type ActivityOwner = 'salesforce' | 'partner' | 'customer';

export interface ActivityTypeMetadata {
  key: string;
  label: string;
  color: string;
  owner: ActivityOwner;
}

export const DEFAULT_ACTIVITY_TYPES: ActivityTypeMetadata[] = [
  {
    key: 'csm',
    label: 'CSM-led',
    color: '#04e1cb',
    owner: 'salesforce'
  },
  {
    key: 'architect',
    label: 'Success Architect',
    color: '#08abed',
    owner: 'salesforce'
  },
  {
    key: 'specialist',
    label: 'Success Specialist',
    color: '#022ac0',
    owner: 'salesforce'
  },
  {
    key: 'review',
    label: 'Success Review',
    color: '#aacbff',
    owner: 'salesforce'
  },
  {
    key: 'event',
    label: 'Event',
    color: '#ff538a',
    owner: 'salesforce'
  },
  {
    key: 'partner',
    label: 'Partner',
    color: '#fcc003',
    owner: 'partner'
  },
  {
    key: 'trailhead',
    label: 'Trailhead',
    color: '#d17dfe',
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
