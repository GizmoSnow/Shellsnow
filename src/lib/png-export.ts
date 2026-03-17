import { RoadmapData, Activity } from './supabase';
import { getTypeMetadata } from './activity-types';
import type { FiscalYearConfig } from './fiscal-year';
import { getAllRoadmapMonths, getMonthPosition } from './fiscal-year';

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
    return '#001e5b';
  }
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export async function exportToPng(title: string, data: RoadmapData, customerLogoBase64?: string | null, fiscalConfig?: FiscalYearConfig, canvasStyle?: 'light' | 'dark'): Promise<void> {
  if (!fiscalConfig) {
    fiscalConfig = { startMonth: 0, baseYear: 26, roadmapStartQuarter: 1 };
  }
  const isDark = canvasStyle === 'dark';
  const BG_COLOR = isDark ? '#0a0e1a' : '#ffffff';
  const CELL_BG = isDark ? '#121621' : '#ffffff';
  const QUARTER_BG = isDark ? '#0f1419' : '#f8fafc';
  const BORDER_COLOR = isDark ? '#1e293b' : '#e2e8f0';
  const TEXT_COLOR = isDark ? '#f8fafc' : '#0f172a';
  const TEXT_MUTED = isDark ? '#94a3b8' : '#64748b';
  const HEADER_BG = data.headerColor || '#066afe';


  const canvas = document.createElement('canvas');
  const scale = 2;
  const width = 1920 * scale;
  const height = 1080 * scale;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, 1920, 1080);

  const MARGIN = 40;
  const LOGO_H = 36;
  const LOGO_GAP = 20;
  let currentLogoX = 1920 - MARGIN;

  const sfLogo = await loadImage('https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg');
  const sfAspectRatio = sfLogo.naturalWidth / sfLogo.naturalHeight;
  const SF_W = LOGO_H * sfAspectRatio;
  currentLogoX -= SF_W;
  ctx.drawImage(sfLogo, currentLogoX, MARGIN, SF_W, LOGO_H);

  if (customerLogoBase64) {
    try {
      const customerLogo = await loadImage(customerLogoBase64);
      const customerAspectRatio = customerLogo.naturalWidth / customerLogo.naturalHeight;
      const CUSTOMER_W = LOGO_H * customerAspectRatio;
      currentLogoX -= (CUSTOMER_W + LOGO_GAP);
      ctx.drawImage(customerLogo, currentLogoX, MARGIN, CUSTOMER_W, LOGO_H);
    } catch (err) {
      console.warn('Failed to load customer logo:', err);
    }
  }

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 32px Arial';
  ctx.fillText(title, MARGIN, MARGIN + 35);

  const HEADER_Y = MARGIN + 100;
  const LEFT_COL = 280;
  const Q_COUNT = 4;
  const AVAILABLE_W = 1920 - MARGIN * 2 - LEFT_COL;
  const Q_W = AVAILABLE_W / Q_COUNT;
  const HEADER_H = 50;
  const SP_H = 40;
  const ROW_H = 100;
  const Q_START_X = MARGIN + LEFT_COL;

  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(MARGIN, HEADER_Y, 1920 - MARGIN * 2, HEADER_H);

  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const getQuarterTitle = (qkey: string) => {
    return data.quarterTitles?.[qkey as keyof typeof data.quarterTitles] || qkey.toUpperCase();
  };

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  qkeys.forEach((qk, i) => {
    const qx = Q_START_X + i * Q_W + Q_W / 2;
    ctx.fillText(getQuarterTitle(qk), qx, HEADER_Y + HEADER_H / 2);
  });

  let currentY = HEADER_Y + HEADER_H;

  ctx.fillStyle = QUARTER_BG;
  ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, SP_H);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, SP_H);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Success Path', MARGIN + 10, currentY + SP_H / 2);

  const successPathColor = '#04e1cb';
  qkeys.forEach((qk, i) => {
    const label = data.successPathLabels?.[qk as keyof typeof data.successPathLabels] || (i === 0 ? 'Success Path' : 'Success Path Review');
    const pillW = Q_W * 0.75;
    const pillX = Q_START_X + i * Q_W + (Q_W - pillW) / 2;
    const pillY = currentY + 5;

    ctx.fillStyle = successPathColor;
    roundRect(ctx, pillX, pillY, pillW, SP_H - 10, 15);
    ctx.fill();

    ctx.fillStyle = getTextColor(successPathColor);
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, pillX + pillW / 2, pillY + (SP_H - 10) / 2);
  });

  currentY += SP_H;

  data.goals.forEach((goal) => {
    goal.initiatives.forEach((initiative, iIdx) => {
      const spanningActivities = initiative.spanning || [];
      const hasRegularActivities = qkeys.some(qk => (initiative.activities[qk] || []).length > 0);

      if (spanningActivities.length > 0) {
        const rowBg = iIdx % 2 === 0 ? CELL_BG : BG_COLOR;
        ctx.fillStyle = rowBg;
        ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);
        ctx.strokeStyle = BORDER_COLOR;
        ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);

        ctx.fillStyle = goal.color;
        ctx.fillRect(MARGIN, currentY, 5, ROW_H);

        if (iIdx === 0) {
          ctx.fillStyle = goal.color;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(goal.number, MARGIN + 12, currentY + 15);

          ctx.fillStyle = TEXT_COLOR;
          ctx.font = 'bold 14px Arial';
          ctx.fillText(goal.title, MARGIN + 12, currentY + 35);
        }

        const iniLabelY = iIdx === 0 ? currentY + 55 : currentY + 15;
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Key Initiative', MARGIN + 12, iniLabelY);

        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '11px Arial';
        ctx.fillText(initiative.label, MARGIN + 12, iniLabelY + 15);

        spanningActivities.forEach((sp, spIdx) => {
          const bgColor = getTypeColor(sp.type, data);
          const textColor = getTextColor(bgColor);
          const sortedQuarters = [...(sp.quarters || [])].sort();
          const qIndexes = sortedQuarters.map(q => qkeys.indexOf(q as any));
          const minIdx = Math.min(...qIndexes);
          const maxIdx = Math.max(...qIndexes);
          const spanWidth = (maxIdx - minIdx + 1) * Q_W;

          const pillH = 28;
          const pillY = currentY + 15 + spIdx * (pillH + 8);
          const pillX = Q_START_X + minIdx * Q_W + 8;

          ctx.fillStyle = bgColor;
          roundRect(ctx, pillX, pillY, spanWidth - 16, pillH, 14);
          ctx.fill();

          if (sp.isCriticalPath) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            roundRect(ctx, pillX, pillY, spanWidth - 16, pillH, 14);
            ctx.stroke();
            ctx.lineWidth = 1;
          }

          ctx.fillStyle = textColor;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          const nameText = sp.isCriticalPath ? `★ ${sp.name}` : sp.name;
          ctx.fillText(nameText, pillX + (spanWidth - 16) / 2, pillY + pillH / 2);
        });

        currentY += ROW_H;
      }

      if (hasRegularActivities) {
        const rowBg = iIdx % 2 === 0 ? CELL_BG : BG_COLOR;
        ctx.fillStyle = rowBg;
        ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);
        ctx.strokeStyle = BORDER_COLOR;
        ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);

        ctx.fillStyle = goal.color;
        ctx.fillRect(MARGIN, currentY, 5, ROW_H);

        if (iIdx === 0 && spanningActivities.length === 0) {
          ctx.fillStyle = goal.color;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(goal.number, MARGIN + 12, currentY + 15);

          ctx.fillStyle = TEXT_COLOR;
          ctx.font = 'bold 14px Arial';
          ctx.fillText(goal.title, MARGIN + 12, currentY + 35);
        }

        const iniLabelY = (iIdx === 0 && spanningActivities.length === 0) ? currentY + 55 : currentY + 15;
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Key Initiative', MARGIN + 12, iniLabelY);

        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '11px Arial';
        ctx.fillText(initiative.label, MARGIN + 12, iniLabelY + 15);

        // Collect all activities from all quarters and deduplicate
        const allActivities: Activity[] = [];
        qkeys.forEach(qk => {
          const acts = initiative.activities[qk] || [];
          acts.forEach(act => {
            if (!allActivities.find(a => a.id === act.id)) {
              allActivities.push(act);
            }
          });
        });

        const allRoadmapMonths = getAllRoadmapMonths(fiscalConfig);
        const activityRows: number[] = allActivities.map(() => 0);

        // Calculate row assignment for each activity to prevent overlaps
        allActivities.forEach((act, actIdx) => {
          const startMonthNum = act.start_month ? Number(act.start_month) : null;
          const endMonthNum = act.end_month ? Number(act.end_month) : null;

          if (startMonthNum !== null && endMonthNum !== null) {
            const startIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === startMonthNum);
            const endIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === endMonthNum);

            if (startIdx !== -1 && endIdx !== -1) {
              const occupied: Set<number>[] = [];

              // Check all previous activities for conflicts
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

              // Find first available row
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

        // Render activities with month-based positioning
        const pillH = 24;
        const pillPad = 5;

        allActivities.forEach((act, actIdx) => {
          const bgColor = getTypeColor(act.type, data);
          const textColor = getTextColor(bgColor);
          const startMonthNum = act.start_month ? Number(act.start_month) : null;
          const endMonthNum = act.end_month ? Number(act.end_month) : null;

          let pillX = 0;
          let pillW = 0;

          if (startMonthNum !== null && endMonthNum !== null) {
            // Month-based positioning
            const startIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === startMonthNum);
            const endIdx = allRoadmapMonths.findIndex(m => m.calendarMonth === endMonthNum);

            if (startIdx !== -1 && endIdx !== -1) {
              const leftPercent = (startIdx / 12) * 100;
              const widthPercent = ((endIdx - startIdx + 1) / 12) * 100;

              pillX = Q_START_X + (AVAILABLE_W * leftPercent / 100) + 8;
              pillW = (AVAILABLE_W * widthPercent / 100) - 16;
            } else {
              // Fallback: use first quarter if month position not found
              pillX = Q_START_X + 8;
              pillW = Q_W - 16;
            }
          } else {
            // Fallback: no month data, render in first quarter
            pillX = Q_START_X + 8;
            pillW = Q_W - 16;
          }

          const row = activityRows[actIdx];
          const pillY = currentY + 10 + row * (pillH + pillPad);

          // Skip if pill would overflow the row
          if (pillY + pillH > currentY + ROW_H - 8) return;

          ctx.fillStyle = bgColor;
          roundRect(ctx, pillX, pillY, pillW, pillH, 12);
          ctx.fill();

          if (act.isCriticalPath) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            roundRect(ctx, pillX, pillY, pillW, pillH, 12);
            ctx.stroke();
            ctx.lineWidth = 1;
          }

          ctx.fillStyle = textColor;
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          const nameText = act.isCriticalPath ? `★ ${act.name}` : act.name;
          ctx.fillText(nameText, pillX + pillW / 2, pillY + pillH / 2);
        });

        currentY += ROW_H;
      }
    });
  });

  const allTypes = new Set<string>();

  data.goals.forEach((goal) => {
    goal.initiatives.forEach((initiative) => {
      qkeys.forEach((qk) => {
        (initiative.activities[qk] || []).forEach((act) => {
          allTypes.add(act.type);
        });
      });

      (initiative.spanning || []).forEach((sp) => {
        allTypes.add(sp.type);
      });
    });
  });

  (data.accountSpanning || []).forEach((sp) => {
    allTypes.add(sp.type);
  });

  const legendY = 1040;
  const legendTypes = Array.from(allTypes).sort();
  let lx = MARGIN;
  ctx.textAlign = 'left';
  legendTypes.forEach((key) => {
    const bgColor = getTypeColor(key, data);
    ctx.fillStyle = bgColor;
    roundRect(ctx, lx, legendY, 16, 16, 4);
    ctx.fill();

    const labelText = getTypeLabel(key, data);
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 11px Arial';
    ctx.fillText(labelText, lx + 22, legendY + 8);
    lx += 180;
  });

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });

  const fileName = title
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
    .replace(/\s+/g, '-') || 'Success-Roadmap';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
