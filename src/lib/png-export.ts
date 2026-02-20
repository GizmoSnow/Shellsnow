import { RoadmapData } from './supabase';

const DEFAULT_TYPE_COLORS: Record<string, string> = {
  csm: '#E8194B',
  architect: '#00B4D8',
  specialist: '#1A1D3E',
  review: '#7B82A8',
  event: '#F77F00',
  partner: '#F4A261',
  trailhead: '#9B5DE5',
};

const TYPE_LABELS: Record<string, string> = {
  csm: 'CSM-led',
  architect: 'Success Architect',
  specialist: 'Success Specialist',
  review: 'Success Review',
  event: 'Event',
  partner: 'Partner',
  trailhead: 'Trailhead',
};

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export async function exportToPng(title: string, data: RoadmapData, customerLogoBase64?: string | null): Promise<void> {
  const canvas = document.createElement('canvas');
  const scale = 2;
  const width = 1920 * scale;
  const height = 1080 * scale;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1920, 1080);

  const MARGIN = 40;
  const LOGO_H = 50;
  const LOGO_GAP = 20;
  let currentLogoX = 1920 - MARGIN;

  const sfLogo = await loadImage('https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg');
  const SF_W = 140;
  currentLogoX -= SF_W;
  ctx.drawImage(sfLogo, currentLogoX, MARGIN, SF_W, LOGO_H);

  if (customerLogoBase64) {
    try {
      const customerLogo = await loadImage(customerLogoBase64);
      const CUSTOMER_W = 140;
      currentLogoX -= (CUSTOMER_W + LOGO_GAP);
      ctx.drawImage(customerLogo, currentLogoX, MARGIN, CUSTOMER_W, LOGO_H);
    } catch (err) {
      console.warn('Failed to load customer logo:', err);
    }
  }

  ctx.fillStyle = '#032D60';
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

  ctx.fillStyle = '#032D60';
  ctx.fillRect(MARGIN, HEADER_Y, 1920 - MARGIN * 2, HEADER_H);

  ctx.fillStyle = '#0176D3';
  ctx.fillRect(MARGIN, HEADER_Y + HEADER_H - 5, 1920 - MARGIN * 2, 5);

  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;
  const getQuarterTitle = (qkey: string) => {
    return data.quarterTitles?.[qkey as keyof typeof data.quarterTitles] || qkey.toUpperCase();
  };

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  qkeys.forEach((qk, i) => {
    const qx = Q_START_X + i * Q_W + Q_W / 2;
    ctx.fillText(getQuarterTitle(qk), qx, HEADER_Y + HEADER_H / 2);
  });

  let currentY = HEADER_Y + HEADER_H;

  ctx.fillStyle = '#E8F4FD';
  ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, SP_H);
  ctx.strokeStyle = '#D4E9F7';
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, SP_H);

  ctx.fillStyle = '#0B5CAB';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Success Path', MARGIN + 10, currentY + SP_H / 2);

  const csmColor = data.typeColors?.['csm'] || DEFAULT_TYPE_COLORS['csm'];
  qkeys.forEach((qk, i) => {
    const label = data.successPathLabels?.[qk as keyof typeof data.successPathLabels] || (i === 0 ? 'Success Path' : 'Success Path Review');
    const pillW = Q_W * 0.75;
    const pillX = Q_START_X + i * Q_W + (Q_W - pillW) / 2;
    const pillY = currentY + 5;

    ctx.fillStyle = csmColor;
    roundRect(ctx, pillX, pillY, pillW, SP_H - 10, 15);
    ctx.fill();

    ctx.fillStyle = getTextColor(csmColor);
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
        const rowBg = iIdx % 2 === 0 ? '#E8F4FD' : '#FFFFFF';
        ctx.fillStyle = rowBg;
        ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);
        ctx.strokeStyle = '#D4E9F7';
        ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);

        ctx.fillStyle = goal.color;
        ctx.fillRect(MARGIN, currentY, 5, ROW_H);

        if (iIdx === 0) {
          ctx.fillStyle = goal.color;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(goal.number, MARGIN + 12, currentY + 15);

          ctx.fillStyle = '#032D60';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(goal.title, MARGIN + 12, currentY + 35);
        }

        const iniLabelY = iIdx === 0 ? currentY + 55 : currentY + 15;
        ctx.fillStyle = '#0B5CAB';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Key Initiative', MARGIN + 12, iniLabelY);

        ctx.fillStyle = '#032D60';
        ctx.font = '11px Arial';
        ctx.fillText(initiative.label, MARGIN + 12, iniLabelY + 15);

        spanningActivities.forEach((sp, spIdx) => {
          const bgColor = data.typeColors?.[sp.type] || DEFAULT_TYPE_COLORS[sp.type] || '#E8194B';
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

          ctx.fillStyle = textColor;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(sp.name, pillX + (spanWidth - 16) / 2, pillY + pillH / 2);
        });

        currentY += ROW_H;
      }

      if (hasRegularActivities) {
        const rowBg = iIdx % 2 === 0 ? '#E8F4FD' : '#FFFFFF';
        ctx.fillStyle = rowBg;
        ctx.fillRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);
        ctx.strokeStyle = '#D4E9F7';
        ctx.strokeRect(MARGIN, currentY, 1920 - MARGIN * 2, ROW_H);

        ctx.fillStyle = goal.color;
        ctx.fillRect(MARGIN, currentY, 5, ROW_H);

        if (iIdx === 0 && spanningActivities.length === 0) {
          ctx.fillStyle = goal.color;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(goal.number, MARGIN + 12, currentY + 15);

          ctx.fillStyle = '#032D60';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(goal.title, MARGIN + 12, currentY + 35);
        }

        const iniLabelY = (iIdx === 0 && spanningActivities.length === 0) ? currentY + 55 : currentY + 15;
        ctx.fillStyle = '#0B5CAB';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Key Initiative', MARGIN + 12, iniLabelY);

        ctx.fillStyle = '#032D60';
        ctx.font = '11px Arial';
        ctx.fillText(initiative.label, MARGIN + 12, iniLabelY + 15);

        qkeys.forEach((qk, qi) => {
          const acts = initiative.activities[qk] || [];
          const cellX = Q_START_X + qi * Q_W;
          const pillH = 24;
          const pillPad = 5;

          acts.forEach((act, aIdx) => {
            const bgColor = data.typeColors?.[act.type] || DEFAULT_TYPE_COLORS[act.type] || '#E8194B';
            const textColor = getTextColor(bgColor);
            const pillY = currentY + 10 + aIdx * (pillH + pillPad);
            if (pillY + pillH > currentY + ROW_H - 8) return;
            const pillW = Q_W - 16;

            ctx.fillStyle = bgColor;
            roundRect(ctx, cellX + 8, pillY, pillW, pillH, 12);
            ctx.fill();

            ctx.fillStyle = textColor;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(act.name, cellX + 8 + pillW / 2, pillY + pillH / 2);
          });
        });

        currentY += ROW_H;
      }
    });
  });

  const legendY = 1040;
  const legendTypes = Object.keys(DEFAULT_TYPE_COLORS);
  let lx = MARGIN;
  ctx.textAlign = 'left';
  legendTypes.forEach((key) => {
    const bgColor = data.typeColors?.[key] || DEFAULT_TYPE_COLORS[key] || '#E8194B';
    ctx.fillStyle = bgColor;
    roundRect(ctx, lx, legendY, 16, 16, 4);
    ctx.fill();

    const labelText = data.typeLabels?.[key] || TYPE_LABELS[key] || key;
    ctx.fillStyle = '#032D60';
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
