import PptxGenJS from 'pptxgenjs';
import { RoadmapData, Activity } from './supabase';
import { getAllRoadmapMonths, getRoadmapQuarters, FiscalYearConfig } from './fiscal-year';
import { isDarkBackground } from './color-utils';
import { getTypeMetadata, getAllTypeMetadata, DEFAULT_ACTIVITY_TYPES } from './activity-types';

const SALESFORCE_LOGO_BASE64 = 'data:image/png;base64,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';

function getTypeColor(typeKey: string, data: RoadmapData): string {
  if (data.typeColors?.[typeKey]) {
    return data.typeColors[typeKey];
  }

  const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
  return metadata?.color || '#6c63ff';
}

function getTypeLabel(typeKey: string, data: RoadmapData): string {
  if (data.typeLabels?.[typeKey]) {
    return data.typeLabels[typeKey];
  }

  const metadata = getTypeMetadata(typeKey, data.customActivityTypes);
  return metadata?.label || typeKey;
}

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

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} (${res.status})`);

  const blob = await res.blob();

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

  return dataUrl;
}

function normalizePptxImageData(input: string): string {
  const s = (input || "").trim();

  if (/^image\/(png|jpeg|jpg|gif);base64,/i.test(s)) return s;

  const m = s.match(/^data:(image\/(png|jpeg|jpg|gif));base64,(.*)$/i);
  if (m) return `${m[1]};base64,${m[3]}`;

  if (/^[A-Za-z0-9+/=\s]+$/.test(s)) {
    return `image/png;base64,${s.replace(/\s+/g, "")}`;
  }

  return s;
}

async function getImageSize(url: string): Promise<{ w: number; h: number; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const aspect = w / h;
      resolve({ w, h, aspect });
    };
    img.src = url;
  });
}


function getTodayDateString(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function exportToPptx(
  title: string,
  data: RoadmapData,
  customerLogoBase64?: string | null,
  fiscalConfig?: FiscalYearConfig,
  canvasStyle?: 'light' | 'dark'
) {
  try {
    if (!fiscalConfig) {
      fiscalConfig = { startMonth: 0, baseYear: 26, roadmapStartQuarter: 1 };
    }

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';

    const sfLogoDataUrl = await fetchAsDataUrl("/salesforce-logo.png");
  const sfLogoPptxData = normalizePptxImageData(sfLogoDataUrl);
  const sfLogoSize = await getImageSize(sfLogoDataUrl);

  const customerLogoData = customerLogoBase64 ? normalizePptxImageData(customerLogoBase64) : null;
  const customerLogoSize = customerLogoData ? await getImageSize(customerLogoBase64!) : null;

  const SLIDE_W = 13.3;
  const SLIDE_H = 7.5;

  const isDark = canvasStyle === 'dark';
  const BG = isDark ? '0A0E1A' : 'FFFFFF';
  const SURFACE = isDark ? '121621' : 'FFFFFF';
  const SURFACE2 = isDark ? '0F1419' : 'F8FAFC';
  const BORDER_COLOR = isDark ? '1E293B' : 'E2E8F0';
  const BORDER_SUBTLE = isDark ? '151B28' : 'F1F5F9';
  const TEXT_COLOR = isDark ? 'F8FAFC' : '0F172A';
  const TEXT_MUTED = isDark ? '94A3B8' : '64748B';
  const HEADER_BG = data.headerColor ? data.headerColor.replace('#', '') : '066AFE';
  const HEADER_TEXT = 'FFFFFF';
  const PRIMARY = '066AFE';

  const LEFT_COL = 1.8;
  const Q_COUNT = 4;
  const MARGIN_L = 0.25;
  const AVAILABLE_W = SLIDE_W - MARGIN_L - LEFT_COL - 0.1;
  const Q_W = AVAILABLE_W / Q_COUNT;
  const HEADER_H = 0.50;
  const SP_H = 0.36;
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
    const LOGO_GAP = 0.24;
    const LOGO_Y = 0.15;
    const LOGO_H = 0.45;

    if (customerLogoData && customerLogoSize) {
      const customerH = LOGO_H;
      const customerW = customerH * customerLogoSize.aspect;

      const sfH = LOGO_H;
      const sfW = sfH * sfLogoSize.aspect;

      let currentLogoX = SLIDE_W - 0.2;

      currentLogoX -= sfW;
      slide.addImage({
        x: currentLogoX,
        y: LOGO_Y,
        w: sfW,
        h: sfH,
        data: sfLogoPptxData,
        sizing: { type: 'contain' }
      });

      currentLogoX -= (LOGO_GAP + customerW);
      slide.addImage({
        x: currentLogoX,
        y: LOGO_Y,
        w: customerW,
        h: customerH,
        data: customerLogoData,
        sizing: { type: 'contain' }
      });
    } else {
      const sfH = LOGO_H;
      const sfW = sfH * sfLogoSize.aspect;

      const sfX = SLIDE_W - 0.2 - sfW;

      slide.addImage({
        x: sfX,
        y: LOGO_Y,
        w: sfW,
        h: sfH,
        data: sfLogoPptxData,
        sizing: { type: 'contain' }
      });
    }

    slide.addText(title, {
      x: 0.3,
      y: 0.15,
      w: 10.0,
      h: 0.4,
      fontSize: 32,
      bold: true,
      color: TEXT_COLOR,
      fontFace: 'Arial',
      margin: 0,
      wrap: false,
    });

    slide.addText(`Last updated: ${getTodayDateString()}`, {
      x: 0.3,
      y: 0.64,
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
    const headerColor = data.headerColor || '066afe';

    slide.addShape(pres.ShapeType.rect, {
      x: MARGIN_L,
      y: START_Y,
      w: SLIDE_W - MARGIN_L - 0.1,
      h: HEADER_H,
      fill: { color: headerColor.replace('#', '') },
      line: { color: headerColor.replace('#', ''), width: 0 },
    });

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
        fontSize: 13,
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

    const csmMeta = getTypeMetadata('csm', data.customActivityTypes);
    const successPathColor = data.typeColors?.csm || csmMeta?.color || '#45C65A';
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
        x: pillX + 0.04,
        y: SP_Y + 0.05,
        w: pillW - 0.08,
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

    // Get all types with stable ordering
    const allMetadata = getAllTypeMetadata(data.customActivityTypes);

    // Separate default and custom types
    const defaultKeys = DEFAULT_ACTIVITY_TYPES.map(t => t.key);
    const defaultTypes = allMetadata.filter(t => defaultKeys.includes(t.key));
    const customTypes = allMetadata.filter(t => !defaultKeys.includes(t.key));

    // Sort custom types alphabetically
    customTypes.sort((a, b) => a.label.localeCompare(b.label));

    // Combine: defaults first, then custom (sorted)
    const orderedTypes = [...defaultTypes, ...customTypes];

    const totalItems = orderedTypes.length;
    const availableWidth = SLIDE_W - MARGIN_L * 2;
    const itemWidth = availableWidth / totalItems;

    orderedTypes.forEach((typeInfo, idx) => {
      const bgColor = getTypeColor(typeInfo.key, data);
      const lx = MARGIN_L + idx * itemWidth;

      slide.addShape(pres.ShapeType.ellipse, {
        x: lx,
        y: y + 0.03,
        w: 0.08,
        h: 0.08,
        fill: { color: bgColor.replace('#', '') },
        line: { color: bgColor.replace('#', ''), width: 0 },
      });
      const labelText = getTypeLabel(typeInfo.key, data);
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
    const ACCOUNT_ROW_H = Math.max(0.54, accountSpanning.length * 0.30 + 0.34);
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
      const bgColor = getTypeColor(sp.type, data);
      const textColor = getTextColor(bgColor);
      const sortedQuarters = [...(sp.quarters || [])].sort();
      const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
      const minIdx = Math.min(...qIndexes);
      const maxIdx = Math.max(...qIndexes);
      const spanWidth = (maxIdx - minIdx + 1) * Q_W;

      const pillH = 0.20;
      const pillY = currentY + 0.15 + spIdx * 0.27;
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
      const fs = sp.name.length > 35 && pillW < 3 ? 7 : pillW < 1.5 ? 7 : 8;
      const nameText = sp.isCriticalPath ? `★ ${sp.name}` : sp.name;
      currentSlide.addText(nameText, {
        x: pillX + 0.04,
        y: pillY,
        w: pillW - 0.08,
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

    currentY += ACCOUNT_ROW_H + 0.08;
  }

  const allRoadmapMonths = getAllRoadmapMonths(fiscalConfig);

  data.goals.forEach((goal, goalIdx) => {
    let isFirstInitiativeOfGoal = true;

    goal.initiatives.forEach((initiative, iIdx) => {
      const spanningActivities = initiative.spanning || [];
      const hasRegularActivities = qkeys.some(qk => (initiative.activities[qk] || []).length > 0);

      if (spanningActivities.length > 0) {
        const activityBlockHeight = spanningActivities.length * 0.27 + 0.15;
        const minLabelBlockHeight = isFirstInitiativeOfGoal ? 0.84 : 0.42;
        const rowH = Math.max(minLabelBlockHeight, activityBlockHeight);
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
            h: 0.16,
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
            h: 0.30,
            fontSize: 9,
            bold: true,
            color: TEXT_COLOR,
            fontFace: 'Arial',
            margin: 0,
            wrap: true,
          });
        }

        const iniLabelY = isFirstInitiativeOfGoal ? currentY + 0.54 : currentY + 0.04;
        currentSlide.addText('Key Initiative', {
          x: LABEL_X + 0.07,
          y: iniLabelY,
          w: LEFT_COL - 0.1,
          h: 0.10,
          fontSize: 7,
          bold: true,
          color: TEXT_MUTED,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });
        currentSlide.addText(initiative.label, {
          x: LABEL_X + 0.07,
          y: iniLabelY + 0.12,
          w: LEFT_COL - 0.1,
          h: 0.28,
          fontSize: 8,
          color: TEXT_COLOR,
          fontFace: 'Arial',
          margin: 0,
          wrap: true,
        });

        spanningActivities.forEach((sp, spIdx) => {
          const bgColor = getTypeColor(sp.type, data);
          const textColor = getTextColor(bgColor);
          const sortedQuarters = [...(sp.quarters || [])].sort();
          const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
          const minIdx = Math.min(...qIndexes);
          const maxIdx = Math.max(...qIndexes);
          const spanWidth = (maxIdx - minIdx + 1) * Q_W;

          const pillH = 0.20;
          const pillY = currentY + 0.15 + spIdx * 0.27;
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
          const fs = sp.name.length > 35 && pillW < 3 ? 7 : pillW < 1.5 ? 7 : 8;
          const nameText = sp.isCriticalPath ? `★ ${sp.name}` : sp.name;
          currentSlide.addText(nameText, {
            x: pillX + 0.04,
            y: pillY,
            w: pillW - 0.08,
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

        currentY += rowH + 0.06;
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
        const pillH = 0.20;
        const pillPad = 0.02;
        const activityBlockHeight = numRows * 0.27 + 0.15;
        const minLabelBlockHeight = isFirstInitiativeOfGoal ? 0.84 : 0.42;
        const rowH = Math.max(minLabelBlockHeight, activityBlockHeight);

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
            h: 0.16,
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
            h: 0.30,
            fontSize: 9,
            bold: true,
            color: TEXT_COLOR,
            fontFace: 'Arial',
            margin: 0,
            wrap: true,
          });
        }

        const iniLabelY = isFirstInitiativeOfGoal ? currentY + 0.54 : currentY + 0.04;
        currentSlide.addText('Key Initiative', {
          x: LABEL_X + 0.07,
          y: iniLabelY,
          w: LEFT_COL - 0.1,
          h: 0.10,
          fontSize: 7,
          bold: true,
          color: TEXT_MUTED,
          fontFace: 'Arial',
          margin: 0,
          wrap: false,
        });
        currentSlide.addText(initiative.label, {
          x: LABEL_X + 0.07,
          y: iniLabelY + 0.12,
          w: LEFT_COL - 0.1,
          h: 0.28,
          fontSize: 8,
          color: TEXT_COLOR,
          fontFace: 'Arial',
          margin: 0,
          wrap: true,
        });

        allActivities.forEach((act, actIdx) => {
          const bgColor = getTypeColor(act.type, data);
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
              const pillY = currentY + 0.15 + row * 0.27;

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
              const fs = act.name.length > 35 && pillW < 3 ? 7 : pillW < 1.5 ? 7 : 8;
              const nameText = act.isCriticalPath ? `★ ${act.name}` : act.name;
              currentSlide.addText(nameText, {
                x: pillX + 0.04,
                y: pillY,
                w: pillW - 0.08,
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

        currentY += rowH + 0.06;
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
  } catch (error) {
    console.error('PowerPoint export error:', error);
    throw error;
  }
}
