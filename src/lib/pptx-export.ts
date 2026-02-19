import PptxGenJS from 'pptxgenjs';
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

function getTextColor(bgColor: string): string {
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

export async function exportToPptx(title: string, data: RoadmapData, customerLogoBase64?: string | null) {
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

  const slide = pres.addSlide();
  slide.background = { color: BG };

  const LOGO_H = 0.5;
  const LOGO_GAP = 0.2;
  const LOGO_Y = 0.15;

  let currentLogoX = SLIDE_W - 0.3;

  const SALESFORCE_W = 1.4;
  currentLogoX -= SALESFORCE_W;
  slide.addImage({
    x: currentLogoX,
    y: LOGO_Y,
    w: SALESFORCE_W,
    h: LOGO_H,
    path: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
    sizing: { type: 'contain', w: SALESFORCE_W, h: LOGO_H },
  });

  if (customerLogoBase64) {
    const CUSTOMER_W = 1.4;
    currentLogoX -= (CUSTOMER_W + LOGO_GAP);
    slide.addImage({
      x: currentLogoX,
      y: LOGO_Y,
      w: CUSTOMER_W,
      h: LOGO_H,
      data: customerLogoBase64,
      sizing: { type: 'contain', w: CUSTOMER_W, h: LOGO_H },
    });
  }

  slide.addText(title, {
    x: 0.3,
    y: 0.2,
    w: 9.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEXT_COLOR,
    fontFace: 'Arial',
    margin: 0,
  });

  const LEFT_COL = 1.8;
  const Q_COUNT = 4;
  const MARGIN_L = 0.25;
  const AVAILABLE_W = SLIDE_W - MARGIN_L - LEFT_COL - 0.1;
  const Q_W = AVAILABLE_W / Q_COUNT;
  const HEADER_H = 0.42;
  const SP_H = 0.32;
  const ROW_H = 0.72;
  const START_Y = 0.95;
  const LABEL_X = MARGIN_L;
  const Q_START_X = MARGIN_L + LEFT_COL;

  slide.addShape(pres.ShapeType.rect, {
    x: MARGIN_L,
    y: START_Y,
    w: SLIDE_W - MARGIN_L - 0.1,
    h: HEADER_H,
    fill: { color: HEADER_BG },
    line: { color: HEADER_BG, width: 0 },
  });

  slide.addShape(pres.ShapeType.rect, {
    x: MARGIN_L,
    y: START_Y + HEADER_H - 0.04,
    w: SLIDE_W - MARGIN_L - 0.1,
    h: 0.04,
    fill: { color: PRIMARY },
    line: { color: PRIMARY, width: 0 },
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  quarters.forEach((q, i) => {
    slide.addText(q, {
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
    });
  });

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
  });

  quarters.forEach((q, i) => {
    const label = i === 0 ? 'Success Path' : 'Success Path Review';
    const pillW = Q_W * 0.75;
    const pillX = Q_START_X + i * Q_W + (Q_W - pillW) / 2;
    slide.addShape(pres.ShapeType.roundRect, {
      x: pillX,
      y: SP_Y + 0.05,
      w: pillW,
      h: SP_H - 0.1,
      fill: { color: 'E8194B' },
      line: { color: 'E8194B', width: 0 },
      rectRadius: 0.5,
    });
    slide.addText(label, {
      x: pillX,
      y: SP_Y + 0.05,
      w: pillW,
      h: SP_H - 0.1,
      fontSize: 9,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Arial',
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
  });

  let currentY = SP_Y + SP_H;
  const qkeys = ['q1', 'q2', 'q3', 'q4'] as const;

  data.goals.forEach((goal) => {
    goal.initiatives.forEach((initiative, iIdx) => {
      const isSpanning = !!initiative.spanning;
      const rowH = ROW_H;

      slide.addShape(pres.ShapeType.rect, {
        x: MARGIN_L,
        y: currentY,
        w: SLIDE_W - MARGIN_L - 0.1,
        h: rowH,
        fill: { color: iIdx % 2 === 0 ? SURFACE2 : BG },
        line: { color: BORDER_COLOR, width: 0.5 },
      });

      slide.addShape(pres.ShapeType.rect, {
        x: MARGIN_L,
        y: currentY,
        w: 0.04,
        h: rowH,
        fill: { color: goal.color.replace('#', '') },
        line: { color: goal.color.replace('#', ''), width: 0 },
      });

      if (iIdx === 0) {
        slide.addText(goal.number, {
          x: LABEL_X + 0.07,
          y: currentY + 0.04,
          w: LEFT_COL - 0.1,
          h: 0.18,
          fontSize: 10,
          bold: true,
          color: goal.color.replace('#', ''),
          fontFace: 'Arial',
          margin: 0,
        });
        slide.addText(goal.title, {
          x: LABEL_X + 0.07,
          y: currentY + 0.2,
          w: LEFT_COL - 0.1,
          h: 0.2,
          fontSize: 12,
          bold: true,
          color: TEXT_COLOR,
          fontFace: 'Arial',
          margin: 0,
        });
      }

      const iniLabelY = iIdx === 0 ? currentY + 0.42 : currentY + 0.1;
      slide.addText('Key Initiative', {
        x: LABEL_X + 0.07,
        y: iniLabelY,
        w: LEFT_COL - 0.1,
        h: 0.13,
        fontSize: 7,
        bold: true,
        color: TEXT_MUTED,
        fontFace: 'Arial',
        margin: 0,
      });
      slide.addText(initiative.label, {
        x: LABEL_X + 0.07,
        y: iniLabelY + 0.13,
        w: LEFT_COL - 0.1,
        h: 0.22,
        fontSize: 8,
        color: TEXT_COLOR,
        fontFace: 'Arial',
        margin: 0,
      });

      if (isSpanning && initiative.spanning) {
        const spItems = initiative.spanning;
        spItems.forEach((sp, spIdx) => {
          const bgColor = data.typeColors?.[sp.type] || DEFAULT_TYPE_COLORS[sp.type] || '#E8194B';
          const textColor = getTextColor(bgColor);
          const pillH = 0.22;
          const pillY = currentY + 0.1 + spIdx * (pillH + 0.05);
          slide.addShape(pres.ShapeType.roundRect, {
            x: Q_START_X + 0.05,
            y: pillY,
            w: AVAILABLE_W - 0.1,
            h: pillH,
            fill: { color: bgColor.replace('#', '') },
            line: { color: bgColor.replace('#', ''), width: 0 },
            rectRadius: 0.5,
          });
          slide.addText(sp.name, {
            x: Q_START_X + 0.05,
            y: pillY,
            w: AVAILABLE_W - 0.1,
            h: pillH,
            fontSize: 9,
            bold: true,
            color: textColor,
            fontFace: 'Arial',
            align: 'center',
            valign: 'middle',
            margin: 0,
          });
        });
      } else {
        qkeys.forEach((qk, qi) => {
          const acts = initiative.activities[qk] || [];
          const cellX = Q_START_X + qi * Q_W;
          const pillH = 0.18;
          const pillPad = 0.03;

          acts.forEach((act, aIdx) => {
            const bgColor = data.typeColors?.[act.type] || DEFAULT_TYPE_COLORS[act.type] || '#E8194B';
            const textColor = getTextColor(bgColor);
            const pillY = currentY + 0.06 + aIdx * (pillH + pillPad);
            if (pillY + pillH > currentY + rowH - 0.04) return;
            const pillW = Q_W - 0.1;
            slide.addShape(pres.ShapeType.roundRect, {
              x: cellX + 0.05,
              y: pillY,
              w: pillW,
              h: pillH,
              fill: { color: bgColor.replace('#', '') },
              line: { color: bgColor.replace('#', ''), width: 0 },
              rectRadius: 0.5,
            });
            slide.addText(act.name, {
              x: cellX + 0.05,
              y: pillY,
              w: pillW,
              h: pillH,
              fontSize: 9,
              bold: true,
              color: textColor,
              fontFace: 'Arial',
              align: 'center',
              valign: 'middle',
              margin: 0,
            });
          });
        });
      }

      currentY += rowH;
    });
  });

  const legendY = SLIDE_H - 0.4;
  const legendTypes = Object.keys(DEFAULT_TYPE_COLORS);
  let lx = MARGIN_L;
  legendTypes.forEach((key) => {
    const bgColor = data.typeColors?.[key] || DEFAULT_TYPE_COLORS[key] || '#E8194B';
    slide.addShape(pres.ShapeType.roundRect, {
      x: lx,
      y: legendY,
      w: 0.14,
      h: 0.14,
      fill: { color: bgColor.replace('#', '') },
      line: { color: bgColor.replace('#', ''), width: 0 },
      rectRadius: 0.5,
    });
    const labelText = data.typeLabels?.[key] || TYPE_LABELS[key] || key;
    slide.addText(labelText, {
      x: lx + 0.17,
      y: legendY,
      w: 1.3,
      h: 0.14,
      fontSize: 9,
      bold: true,
      color: TEXT_COLOR,
      fontFace: 'Arial',
      margin: 0,
    });
    lx += 1.6;
  });

  const fileName = title
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
    .replace(/\s+/g, '-') || 'Success-Roadmap';

  await pres.writeFile({ fileName: `${fileName}.pptx` });
}
