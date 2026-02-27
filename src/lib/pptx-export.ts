import PptxGenJS from 'pptxgenjs';
import { RoadmapData, Activity } from './supabase';
import salesforceLogo from '../assets/69416b267de7ae6888996981_logo.svg';
import { getAllRoadmapMonths, getRoadmapQuarters, FiscalYearConfig } from './fiscal-year';

const DEFAULT_TYPE_COLORS: Record<string, string> = {
  csm: '#04e1cb',
  architect: '#08abed',
  specialist: '#022ac0',
  review: '#aacbff',
  event: '#ff538a',
  partner: '#fcc003',
  trailhead: '#d17dfe',
};

function getTextColor(bgColor: string): string {
  if (bgColor.toLowerCase() === '#fcc003') {
    return '001e5b';
  }
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '000000' : 'FFFFFF';
}

const TYPE_LABELS: Record<string, string> = {
  csm: 'CSM-led',
  architect: 'Success Architect',
  specialist: 'Success Specialist',
  review: 'Success Review',
  event: 'Event',
  partner: 'Partner',
  trailhead: 'Trailhead',
};

function getTodayDateString(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function exportToPptx(
  title: string,
  data: RoadmapData,
  customerLogoBase64?: string | null,
  fiscalConfig?: FiscalYearConfig
) {
  if (!fiscalConfig) {
    fiscalConfig = { startMonth: 0, baseYear: 26, roadmapStartQuarter: 1 };
  }

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  const SLIDE_W = 13.3;
  const SLIDE_H = 7.5;

  const BG = 'FFFFFF';
  const SURFACE = 'F8FBFF';
  const SURFACE2 = 'E8F4FD';
  const BORDER_COLOR = 'D4E9F7';
  const TEXT_COLOR = '032D60';
  const TEXT_MUTED = '0B5CAB';
  const HEADER_BG = '032D60';
  const HEADER_TEXT = 'FFFFFF';
  const PRIMARY = '0176D3';

  const LEFT_COL = 1.8;
  const Q_COUNT = 4;
  const MARGIN_L = 0.25;
  const AVAILABLE_W = SLIDE_W - MARGIN_L - LEFT_COL - 0.1;
  const Q_W = AVAILABLE_W / Q_COUNT;
  const HEADER_H = 0.42;
  const SP_H = 0.32;
  const START_Y = 0.95;
  const LABEL_X = MARGIN_L;
  const Q_START_X = MARGIN_L + LEFT_COL;
  const LEGEND_H = 0.4;
  const MAX_CONTENT_Y = SLIDE_H - LEGEND_H - 0.1;

  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const quarters = getRoadmapQuarters(fiscalConfig);

  const getQuarterTitle = (qkey: string) => {
    const qIndex = qkeys.indexOf(qkey as any);
    if (qIndex !== -1 && quarters[qIndex]) {
      return quarters[qIndex].label;
    }
    const quarterTitle = data.quarterTitles?.[qkey as keyof typeof data.quarterTitles];
    return quarterTitle || qkey.toUpperCase();
  };

  let salesforceBase64: string | null = null;
  try {
    salesforceBase64 = await fetch(salesforceLogo)
      .then(res => res.text())
      .then(svg => `data:image/svg+xml;base64,${btoa(svg)}`);
  } catch (error) {
    console.error('Failed to load Salesforce logo:', error);
  }

  function addHeader(slide: any) {
    const LOGO_GAP = 0.2;
    const LOGO_Y = 0.15;
    let currentLogoX = SLIDE_W - 0.3;

    currentLogoX -= 1.1;

    if (salesforceBase64) {
      slide.addImage({
        x: currentLogoX,
        y: LOGO_Y,
        w: 1.1,
        h: 0.3,
        data: salesforceBase64,
      });
    }

    if (customerLogoBase64) {
      currentLogoX -= (0.8 + LOGO_GAP + 0.1);
      slide.addImage({
        x: currentLogoX,
        y: LOGO_Y,
        w: 0.8,
        h: 0.45,
        data: customerLogoBase64,
      });
    }

    slide.addText(title, {
      x: 0.3,
      y: 0.15,
      w: 9.5,
      h: 0.4,
      fontSize: 28,
      bold: true,
      color: TEXT_COLOR,
      fontFace: 'Arial',
      margin: 0,
      wrap: false,
    });

    slide.addText(`Last updated: ${getTodayDateString()}`, {
      x: 0.3,
      y: 0.58,
      w: 9.5,
      h: 0.25,
      fontSize: 9,
      color: TEXT_MUTED,
      fontFace: 'Arial',
      margin: 0,
      wrap: false,
    });
  }

  function addQuarterHeaders(slide: any) {
    const headerColor = data.headerColor || null;

    if (headerColor) {
      slide.addShape(pres.ShapeType.rect, {
        x: MARGIN_L,
        y: START_Y,
        w: SLIDE_W - MARGIN_L - 0.1,
        h: HEADER_H,
        fill: { color: headerColor.replace('#', '') },
        line: { color: headerColor.replace('#', ''), width: 0 },
      });
    } else {
      slide.addShape(pres.ShapeType.rect, {
        x: MARGIN_L,
        y: START_Y,
        w: SLIDE_W - MARGIN_L - 0.1,
        h: HEADER_H,
        fill: { type: 'solid', color: '0B5CAB', transparency: 0 },
      });

      const gradientStops = [
        { position: 0, color: '0B5CAB' },
        { position: 100, color: '00B3FF' }
      ];

      for (let i = 0; i < 50; i++) {
        const pos = i / 49;
        const color1 = parseInt('0B5CAB', 16);
        const color2 = parseInt('00B3FF', 16);
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;
        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;
        const r = Math.round(r1 + (r2 - r1) * pos);
        const g = Math.round(g1 + (g2 - g1) * pos);
        const b = Math.round(b1 + (b2 - b1) * pos);
        const color = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');

        slide.addShape(pres.ShapeType.rect, {
          x: MARGIN_L + (SLIDE_W - MARGIN_L - 0.1) * pos,
          y: START_Y,
          w: (SLIDE_W - MARGIN_L - 0.1) / 49,
          h: HEADER_H,
          fill: { color },
          line: { width: 0 },
        });
      }
    }

    slide.addShape(pres.ShapeType.rect, {
      x: MARGIN_L,
      y: START_Y + HEADER_H - 0.04,
      w: SLIDE_W - MARGIN_L - 0.1,
      h: 0.04,
      fill: { color: PRIMARY },
      line: { color: PRIMARY, width: 0 },
    });

    qkeys.forEach((qk, i) => {
      slide.addText(getQuarterTitle(qk), {
        x: Q_START_X + i * Q_W,
        y: START_Y,
        w: Q_W,
        h: HEADER_H - 0.04,
        fontSize: 16,
        bold: true,
        color: HEADER_TEXT,
        fontFace: 'Arial',
        align: 'center',
        valign: 'middle',
        margin: 0,
        wrap: false,
      });
    });
  }

  function addSuccessPath(slide: any) {
    const SP_Y = START_Y + HEADER_H;

    slide.addShape(pres.ShapeType.rect, {
      x: MARGIN_L,
      y: SP_Y,
      w: SLIDE_W - MARGIN_L - 0.1,
      h: SP_H,
      fill: { color: SURFACE2 },
      line: { color: BORDER_COLOR, width: 0.5 },
    });

    slide.addText('Success Path', {
      x: LABEL_X + 0.05,
      y: SP_Y,
      w: LEFT_COL - 0.05,
      h: SP_H,
      fontSize: 9,
      bold: true,
      color: TEXT_MUTED,
      fontFace: 'Arial',
      valign: 'middle',
      margin: 0,
      wrap: false,
    });

    const successPathColor = data.typeColors?.csm || DEFAULT_TYPE_COLORS.csm;
    const spTextColor = getTextColor(successPathColor);

    qkeys.forEach((qk, i) => {
      const label = data.successPathLabels?.[qk as keyof typeof data.successPathLabels] || (i === 0 ? 'Success Path' : 'Success Path Review');
      const pillW = Q_W * 0.75;
      const pillX = Q_START_X + i * Q_W + (Q_W - pillW) / 2;
      slide.addShape(pres.ShapeType.roundRect, {
        x: pillX,
        y: SP_Y + 0.05,
        w: pillW,
        h: SP_H - 0.1,
        fill: { color: successPathColor.replace('#', '') },
        line: { color: successPathColor.replace('#', ''), width: 0 },
        rectRadius: 0.5,
        shadow: {
          type: 'outer',
          angle: 90,
          blur: 3,
          color: '000000',
          offset: 1,
          opacity: 0.15,
        },
      });
      slide.addText(label, {
        x: pillX,
        y: SP_Y + 0.05,
        w: pillW,
        h: SP_H - 0.1,
        fontSize: 9,
        bold: true,
        color: spTextColor,
        fontFace: 'Arial',
        align: 'center',
        valign: 'middle',
        margin: 0,
        wrap: false,
      });
    });

    return SP_Y + SP_H;
  }

  function addLegend(slide: any, legendY?: number) {
    const y = legendY || (SLIDE_H - 0.4);
    const legendTypes = Object.keys(DEFAULT_TYPE_COLORS);
    const totalItems = legendTypes.length;
    const availableWidth = SLIDE_W - MARGIN_L * 2;
    const itemWidth = availableWidth / totalItems;

    legendTypes.forEach((key, idx) => {
      const bgColor = data.typeColors?.[key] || DEFAULT_TYPE_COLORS[key] || '#E8194B';
      const lx = MARGIN_L + idx * itemWidth;

      slide.addShape(pres.ShapeType.ellipse, {
        x: lx,
        y: y + 0.03,
        w: 0.08,
        h: 0.08,
        fill: { color: bgColor.replace('#', '') },
        line: { color: bgColor.replace('#', ''), width: 0 },
      });
      const labelText = data.typeLabels?.[key] || TYPE_LABELS[key] || key;
      slide.addText(labelText, {
        x: lx + 0.11,
        y: y,
        w: itemWidth - 0.15,
        h: 0.14,
        fontSize: 9,
        bold: true,
        color: TEXT_COLOR,
        fontFace: 'Arial',
        margin: 0,
        wrap: false,
      });
    });

    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: y + 0.25,
      w: SLIDE_W,
      h: 0.02,
      fill: { color: PRIMARY },
      line: { color: PRIMARY, width: 0 },
    });
  }

  let currentSlide = pres.addSlide();
  currentSlide.background = { color: BG };
  addHeader(currentSlide);
  addQuarterHeaders(currentSlide);
  let currentY = addSuccessPath(currentSlide);

  function checkNewSlide() {
    if (currentY > MAX_CONTENT_Y) {
      addLegend(currentSlide);
      currentSlide = pres.addSlide();
      currentSlide.background = { color: BG };
      addHeader(currentSlide);
      addQuarterHeaders(currentSlide);
      currentY = addSuccessPath(currentSlide);
    }
  }

  const accountSpanning = data.accountSpanning || [];
  if (accountSpanning.length > 0) {
    const ACCOUNT_ROW_H = Math.max(0.5, accountSpanning.length * 0.25 + 0.2);
    checkNewSlide();

    if (currentY + ACCOUNT_ROW_H > MAX_CONTENT_Y) {
      addLegend(currentSlide);
      currentSlide = pres.addSlide();
      currentSlide.background = { color: BG };
      addHeader(currentSlide);
      addQuarterHeaders(currentSlide);
      currentY = addSuccessPath(currentSlide);
    }

    currentSlide.addShape(pres.ShapeType.rect, {
      x: MARGIN_L,
      y: currentY,
      w: SLIDE_W - MARGIN_L - 0.1,
      h: ACCOUNT_ROW_H,
      fill: { color: SURFACE2 },
      line: { color: BORDER_COLOR, width: 0.5 },
    });

    currentSlide.addText('Ongoing Activities', {
      x: LABEL_X + 0.05,
      y: currentY + 0.05,
      w: LEFT_COL - 0.1,
      h: 0.2,
      fontSize: 9,
      bold: true,
      color: TEXT_MUTED,
      fontFace: 'Arial',
      valign: 'top',
      margin: 0,
      wrap: false,
    });

    accountSpanning.forEach((sp, spIdx) => {
      const bgColor = data.typeColors?.[sp.type] || DEFAULT_TYPE_COLORS[sp.type] || '#E8194B';
      const textColor = getTextColor(bgColor);
      const sortedQuarters = [...(sp.quarters || [])].sort();
      const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
      const minIdx = Math.min(...qIndexes);
      const maxIdx = Math.max(...qIndexes);
      const spanWidth = (maxIdx - minIdx + 1) * Q_W;

      const pillH = 0.18;
      const pillY = currentY + 0.1 + spIdx * 0.25;
      const pillX = Q_START_X + minIdx * Q_W + 0.05;
      const pillW = spanWidth - 0.1;

      currentSlide.addShape(pres.ShapeType.roundRect, {
        x: pillX,
        y: pillY,
        w: pillW,
        h: pillH,
        fill: { color: bgColor.replace('#', '') },
        line: { color: bgColor.replace('#', ''), width: 0 },
        rectRadius: 0.5,
        shadow: {
          type: 'outer',
          angle: 90,
          blur: 3,
          color: '000000',
          offset: 1,
          opacity: 0.15,
        },
      });
      currentSlide.addText(sp.name, {
        x: pillX,
        y: pillY,
        w: pillW,
        h: pillH,
        fontSize: pillW < 1.5 ? 7 : 8,
        bold: true,
        color: textColor,
        fontFace: 'Arial',
        align: 'center',
        valign: 'middle',
        margin: 0,
        wrap: false,
        autoFit: false,
      });
    });

    currentY += ACCOUNT_ROW_H;
  }

  const allRoadmapMonths = getAllRoadmapMonths(fiscalConfig);

  data.goals.forEach((goal, goalIdx) => {
    let isFirstInitiativeOfGoal = true;

    goal.initiatives.forEach((initiative, iIdx) => {
      const spanningActivities = initiative.spanning || [];
      const hasRegularActivities = qkeys.some(qk => (initiative.activities[qk] || []).length > 0);

      if (spanningActivities.length > 0) {
        const rowH = Math.max(0.5, spanningActivities.length * 0.25 + 0.2);
        checkNewSlide();

        if (currentY + rowH > MAX_CONTENT_Y) {
          addLegend(currentSlide);
          currentSlide = pres.addSlide();
          currentSlide.background = { color: BG };
          addHeader(currentSlide);
          addQuarterHeaders(currentSlide);
          currentY = addSuccessPath(currentSlide);
          isFirstInitiativeOfGoal = true;
        }

        currentSlide.addShape(pres.ShapeType.rect, {
          x: MARGIN_L,
          y: currentY,
          w: SLIDE_W - MARGIN_L - 0.1,
          h: rowH,
          fill: { color: iIdx % 2 === 0 ? SURFACE2 : BG },
          line: { color: BORDER_COLOR, width: 0.5 },
        });

        currentSlide.addShape(pres.ShapeType.rect, {
          x: MARGIN_L,
          y: currentY,
          w: 0.04,
          h: rowH,
          fill: { color: goal.color.replace('#', '') },
          line: { color: goal.color.replace('#', ''), width: 0 },
        });

        if (goalIdx > 0 && isFirstInitiativeOfGoal) {
          currentSlide.addShape(pres.ShapeType.rect, {
            x: MARGIN_L,
            y: currentY - 0.01,
            w: SLIDE_W - MARGIN_L - 0.1,
            h: 0.01,
            fill: { color: goal.color.replace('#', '') },
            line: { color: goal.color.replace('#', ''), width: 0 },
          });
        }

        if (isFirstInitiativeOfGoal) {
          currentSlide.addText(goal.number, {
            x: LABEL_X + 0.07,
            y: currentY + 0.04,
            w: LEFT_COL - 0.1,
            h: 0.18,
            fontSize: 10,
            bold: true,
            color: goal.color.replace('#', ''),
            fontFace: 'Arial',
            margin: 0,
            wrap: false,
          });
          currentSlide.addText(goal.title, {
            x: LABEL_X + 0.07,
            y: currentY + 0.22,
            w: LEFT_COL - 0.1,
            h: 0.2,
            fontSize: 11,
            bold: true,
            color: TEXT_COLOR,
            fontFace: 'Arial',
            margin: 0,
            wrap: false,
          });
        }

        const iniLabelY = isFirstInitiativeOfGoal ? currentY + 0.46 : currentY + 0.04;
        currentSlide.addText('Key Initiative', {
          x: LABEL_X + 0.07,
          y: iniLabelY,
          w: LEFT_COL - 0.1,
          h: 0.12,
          fontSize: 7,
          bold: true,
          color: TEXT_MUTED,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });
        currentSlide.addText(initiative.label, {
          x: LABEL_X + 0.07,
          y: iniLabelY + 0.14,
          w: LEFT_COL - 0.1,
          h: 0.22,
          fontSize: 8,
          color: TEXT_COLOR,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });

        spanningActivities.forEach((sp, spIdx) => {
          const bgColor = data.typeColors?.[sp.type] || DEFAULT_TYPE_COLORS[sp.type] || '#E8194B';
          const textColor = getTextColor(bgColor);
          const sortedQuarters = [...(sp.quarters || [])].sort();
          const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
          const minIdx = Math.min(...qIndexes);
          const maxIdx = Math.max(...qIndexes);
          const spanWidth = (maxIdx - minIdx + 1) * Q_W;

          const pillH = 0.18;
          const pillY = currentY + 0.1 + spIdx * 0.25;
          const pillX = Q_START_X + minIdx * Q_W + 0.05;
          const pillW = spanWidth - 0.1;

          currentSlide.addShape(pres.ShapeType.roundRect, {
            x: pillX,
            y: pillY,
            w: pillW,
            h: pillH,
            fill: { color: bgColor.replace('#', '') },
            line: { color: bgColor.replace('#', ''), width: 0 },
            rectRadius: 0.5,
            shadow: {
              type: 'outer',
              angle: 90,
              blur: 3,
              color: '000000',
              offset: 1,
              opacity: 0.15,
            },
          });
          currentSlide.addText(sp.name, {
            x: pillX,
            y: pillY,
            w: pillW,
            h: pillH,
            fontSize: pillW < 1.5 ? 7 : 8,
            bold: true,
            color: textColor,
            fontFace: 'Arial',
            align: 'center',
            valign: 'middle',
            margin: 0,
            wrap: false,
            autoFit: false,
          });
        });

        currentY += rowH;
        isFirstInitiativeOfGoal = false;
      }

      if (hasRegularActivities) {
        const allActivities: Activity[] = [];
        qkeys.forEach(qk => {
          const acts = initiative.activities[qk] || [];
          acts.forEach(act => {
            if (!allActivities.find(a => a.id === act.id)) {
              allActivities.push(act);
            }
          });
        });

        const activityRows: number[] = allActivities.map(() => 0);

        allActivities.forEach((act, actIdx) => {
          const startMonthNum = act.start_month ? Number(act.start_month) : null;
          const endMonthNum = act.end_month ? Number(act.end_month) : null;

          if (startMonthNum !== null && endMonthNum !== null) {
            const startIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === startMonthNum);
            const endIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === endMonthNum);

            if (startIdx !== -1 && endIdx !== -1) {
              const occupied: Set<number>[] = [];

              allActivities.forEach((otherAct, otherIdx) => {
                if (otherIdx >= actIdx) return;
                const otherStart = otherAct.start_month ? Number(otherAct.start_month) : null;
                const otherEnd = otherAct.end_month ? Number(otherAct.end_month) : null;

                if (otherStart !== null && otherEnd !== null) {
                  const otherStartIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === otherStart);
                  const otherEndIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === otherEnd);

                  if (otherStartIdx !== -1 && otherEndIdx !== -1) {
                    const otherRow = activityRows[otherIdx];
                    if (!occupied[otherRow]) occupied[otherRow] = new Set();
                    for (let i = otherStartIdx; i <= otherEndIdx; i++) {
                      occupied[otherRow].add(i);
                    }
                  }
                }
              });

              let row = 0;
              while (true) {
                if (!occupied[row]) {
                  activityRows[actIdx] = row;
                  break;
                }
                let hasConflict = false;
                for (let i = startIdx; i <= endIdx; i++) {
                  if (occupied[row].has(i)) {
                    hasConflict = true;
                    break;
                  }
                }
                if (!hasConflict) {
                  activityRows[actIdx] = row;
                  break;
                }
                row++;
              }
            }
          }
        });

        const maxRow = activityRows.length > 0 ? Math.max(...activityRows) : 0;
        const numRows = maxRow + 1;
        const pillH = 0.18;
        const pillPad = 0.02;
        const rowH = Math.max(0.5, numRows * 0.25 + 0.2);

        checkNewSlide();

        if (currentY + rowH > MAX_CONTENT_Y) {
          addLegend(currentSlide);
          currentSlide = pres.addSlide();
          currentSlide.background = { color: BG };
          addHeader(currentSlide);
          addQuarterHeaders(currentSlide);
          currentY = addSuccessPath(currentSlide);
          isFirstInitiativeOfGoal = true;
        }

        currentSlide.addShape(pres.ShapeType.rect, {
          x: MARGIN_L,
          y: currentY,
          w: SLIDE_W - MARGIN_L - 0.1,
          h: rowH,
          fill: { color: iIdx % 2 === 0 ? SURFACE2 : BG },
          line: { color: BORDER_COLOR, width: 0.5 },
        });

        currentSlide.addShape(pres.ShapeType.rect, {
          x: MARGIN_L,
          y: currentY,
          w: 0.04,
          h: rowH,
          fill: { color: goal.color.replace('#', '') },
          line: { color: goal.color.replace('#', ''), width: 0 },
        });

        if (goalIdx > 0 && isFirstInitiativeOfGoal) {
          currentSlide.addShape(pres.ShapeType.rect, {
            x: MARGIN_L,
            y: currentY - 0.01,
            w: SLIDE_W - MARGIN_L - 0.1,
            h: 0.01,
            fill: { color: goal.color.replace('#', '') },
            line: { color: goal.color.replace('#', ''), width: 0 },
          });
        }

        if (isFirstInitiativeOfGoal) {
          currentSlide.addText(goal.number, {
            x: LABEL_X + 0.07,
            y: currentY + 0.04,
            w: LEFT_COL - 0.1,
            h: 0.18,
            fontSize: 10,
            bold: true,
            color: goal.color.replace('#', ''),
            fontFace: 'Arial',
            margin: 0,
            wrap: false,
          });
          currentSlide.addText(goal.title, {
            x: LABEL_X + 0.07,
            y: currentY + 0.22,
            w: LEFT_COL - 0.1,
            h: 0.2,
            fontSize: 11,
            bold: true,
            color: TEXT_COLOR,
            fontFace: 'Arial',
            margin: 0,
            wrap: false,
          });
        }

        const iniLabelY = isFirstInitiativeOfGoal ? currentY + 0.46 : currentY + 0.04;
        currentSlide.addText('Key Initiative', {
          x: LABEL_X + 0.07,
          y: iniLabelY,
          w: LEFT_COL - 0.1,
          h: 0.12,
          fontSize: 7,
          bold: true,
          color: TEXT_MUTED,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });
        currentSlide.addText(initiative.label, {
          x: LABEL_X + 0.07,
          y: iniLabelY + 0.14,
          w: LEFT_COL - 0.1,
          h: 0.22,
          fontSize: 8,
          color: TEXT_COLOR,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });

        allActivities.forEach((act, actIdx) => {
          const bgColor = data.typeColors?.[act.type] || DEFAULT_TYPE_COLORS[act.type] || '#E8194B';
          const textColor = getTextColor(bgColor);
          const startMonthNum = act.start_month ? Number(act.start_month) : null;
          const endMonthNum = act.end_month ? Number(act.end_month) : null;

          if (startMonthNum !== null && endMonthNum !== null) {
            const startIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === startMonthNum);
            const endIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === endMonthNum);

            if (startIdx !== -1 && endIdx !== -1) {
              const leftPercent = (startIdx / 12) * 100;
              const widthPercent = ((endIdx - startIdx + 1) / 12) * 100;

              const pillX = Q_START_X + (AVAILABLE_W * leftPercent / 100);
              const pillW = AVAILABLE_W * widthPercent / 100;
              const row = activityRows[actIdx];
              const pillY = currentY + 0.1 + row * 0.25;

              currentSlide.addShape(pres.ShapeType.roundRect, {
                x: pillX,
                y: pillY,
                w: pillW,
                h: pillH,
                fill: { color: bgColor.replace('#', '') },
                line: { color: bgColor.replace('#', ''), width: 0 },
                rectRadius: 0.5,
                shadow: {
                  type: 'outer',
                  angle: 90,
                  blur: 3,
                  color: '000000',
                  offset: 1,
                  opacity: 0.15,
                },
              });
              currentSlide.addText(act.name, {
                x: pillX,
                y: pillY,
                w: pillW,
                h: pillH,
                fontSize: pillW < 1.5 ? 7 : 8,
                bold: true,
                color: textColor,
                fontFace: 'Arial',
                align: 'center',
                valign: 'middle',
                margin: 0,
                wrap: false,
                autoFit: false,
              });
            }
          }
        });

        currentY += rowH;
        isFirstInitiativeOfGoal = false;
      }
    });
  });

  addLegend(currentSlide, currentY + 0.3);

  const fileName = title
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
    .replace(/\s+/g, '-') || 'Success-Roadmap';

  await pres.writeFile({ fileName: `${fileName}.pptx` });
}
