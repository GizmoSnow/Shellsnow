import PptxGenJS from 'pptxgenjs';
import { RoadmapData, Activity } from './supabase';
import { getAllRoadmapMonths, getRoadmapQuarters, FiscalYearConfig } from './fiscal-year';

const SALESFORCE_LOGO_BASE64 = 'data:image/png;base64,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';

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

  function addHeader(slide: any) {
    const LOGO_GAP = 0.2;
    const LOGO_Y = 0.15;
    let currentLogoX = SLIDE_W - 0.3;

    currentLogoX -= 1.1;

    if (!customerLogoBase64) {
      slide.addImage({
        x: currentLogoX,
        y: LOGO_Y,
        w: 0.9,
        h: 0.45,
        data: SALESFORCE_LOGO_BASE64,
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
        fontSize: 11,
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
    const ACCOUNT_ROW_H = Math.max(0.5, accountSpanning.length * 0.25 + 0.30);
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
      const pillY = currentY + 0.15 + spIdx * 0.25;
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
      const fs = sp.name.length > 35 && pillW < 3 ? 6 : pillW < 1.5 ? 6 : 7;
      currentSlide.addText(sp.name, {
        x: pillX,
        y: pillY,
        w: pillW,
        h: pillH,
        fontSize: fs,
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
        const rowH = Math.max(0.5, spanningActivities.length * 0.25 + 0.30);
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
            y: currentY + 0.20,
            w: LEFT_COL - 0.1,
            h: 0.2,
            fontSize: 9,
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
          const pillY = currentY + 0.15 + spIdx * 0.25;
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
          const fs = sp.name.length > 35 && pillW < 3 ? 6 : pillW < 1.5 ? 6 : 7;
          currentSlide.addText(sp.name, {
            x: pillX,
            y: pillY,
            w: pillW,
            h: pillH,
            fontSize: fs,
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
        const rowH = Math.max(0.5, numRows * 0.25 + 0.30);

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
            y: currentY + 0.20,
            w: LEFT_COL - 0.1,
            h: 0.2,
            fontSize: 9,
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
              const pillY = currentY + 0.15 + row * 0.25;

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
              const fs = act.name.length > 35 && pillW < 3 ? 6 : pillW < 1.5 ? 6 : 7;
              currentSlide.addText(act.name, {
                x: pillX,
                y: pillY,
                w: pillW,
                h: pillH,
                fontSize: fs,
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
