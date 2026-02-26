export interface FiscalYearConfig {
  startMonth: number;
  baseYear: number;
  roadmapStartQuarter: number;
}

export interface QuarterInfo {
  fiscalYear: number;
  quarter: number;
  label: string;
  months: MonthInfo[];
}

export interface MonthInfo {
  calendarMonth: number;
  name: string;
  abbrev: string;
  fiscalYear: number;
  quarter: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex];
}

export function getMonthAbbrev(monthIndex: number): string {
  return MONTH_ABBREV[monthIndex];
}

export function calculateFiscalQuarter(calendarMonth: number, fiscalStartMonth: number): number {
  const monthsFromStart = (calendarMonth - fiscalStartMonth + 12) % 12;
  return Math.floor(monthsFromStart / 3) + 1;
}

export function getFiscalYearForMonth(calendarMonth: number, fiscalStartMonth: number, baseYear: number): number {
  if (calendarMonth >= fiscalStartMonth) {
    return baseYear;
  } else {
    return baseYear + 1;
  }
}

export function getQuarterMonths(fiscalStartMonth: number, quarter: number): number[] {
  const startOffset = (quarter - 1) * 3;
  return [
    (fiscalStartMonth + startOffset) % 12,
    (fiscalStartMonth + startOffset + 1) % 12,
    (fiscalStartMonth + startOffset + 2) % 12
  ];
}

export function getRoadmapQuarters(config: FiscalYearConfig): QuarterInfo[] {
  const quarters: QuarterInfo[] = [];

  for (let i = 0; i < 4; i++) {
    const quarterNum = ((config.roadmapStartQuarter - 1 + i) % 4) + 1;
    const quartersFromBase = config.roadmapStartQuarter - 1 + i;
    const fiscalYear = config.baseYear + Math.floor(quartersFromBase / 4);

    const monthIndices = getQuarterMonths(config.startMonth, quarterNum);
    const months: MonthInfo[] = monthIndices.map(monthIdx => ({
      calendarMonth: monthIdx,
      name: MONTH_NAMES[monthIdx],
      abbrev: MONTH_ABBREV[monthIdx],
      fiscalYear,
      quarter: quarterNum
    }));

    const monthRange = `${months[0].abbrev}–${months[2].abbrev}`;

    quarters.push({
      fiscalYear,
      quarter: quarterNum,
      label: `FY${fiscalYear} Q${quarterNum} | ${monthRange}`,
      months
    });
  }

  return quarters;
}

export function getAllRoadmapMonths(config: FiscalYearConfig): MonthInfo[] {
  const quarters = getRoadmapQuarters(config);
  return quarters.flatMap(q => q.months);
}

export function getMonthsInFiscalOrder(config: FiscalYearConfig): MonthInfo[] {
  const months: MonthInfo[] = [];

  for (let i = 0; i < 12; i++) {
    const calendarMonth = (config.startMonth + i) % 12;
    const quarter = Math.floor(i / 3) + 1;
    const fiscalYear = config.baseYear;

    months.push({
      calendarMonth,
      name: MONTH_NAMES[calendarMonth],
      abbrev: MONTH_ABBREV[calendarMonth],
      fiscalYear,
      quarter
    });
  }

  return months;
}

export function validateMonthRange(startMonth: number, endMonth: number, config: FiscalYearConfig): boolean {
  const fiscalMonths = getMonthsInFiscalOrder(config);
  const startIdx = fiscalMonths.findIndex(m => m.calendarMonth === startMonth);
  const endIdx = fiscalMonths.findIndex(m => m.calendarMonth === endMonth);

  if (startIdx === -1 || endIdx === -1) return false;
  return endIdx >= startIdx;
}

export function getQuarterLabel(quarter: number, fiscalYear: number, config: FiscalYearConfig): string {
  const monthIndices = getQuarterMonths(config.startMonth, quarter);
  const months = monthIndices.map(idx => MONTH_ABBREV[idx]);
  return `FY${fiscalYear} Q${quarter} | ${months[0]}–${months[2]}`;
}

export function getRoadmapTitle(config: FiscalYearConfig): string {
  const quarters = getRoadmapQuarters(config);
  const firstFY = quarters[0].fiscalYear;
  const lastFY = quarters[3].fiscalYear;

  if (firstFY === lastFY) {
    return `FY${firstFY}`;
  } else {
    return `FY${firstFY}/${String(lastFY).slice(-2)}`;
  }
}

export function getMonthPosition(calendarMonth: number, config: FiscalYearConfig): { quarterIndex: number; monthIndex: number } | null {
  const roadmapMonths = getAllRoadmapMonths(config);
  const index = roadmapMonths.findIndex(m => m.calendarMonth === calendarMonth);

  if (index === -1) return null;

  return {
    quarterIndex: Math.floor(index / 3),
    monthIndex: index % 3
  };
}
