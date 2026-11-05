export const MAX_CALLOUTS_PER_SIDE = 6;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function wrapIllustrationLabel(value, maximumCharacters = 24) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  for (const word of words) {
    if (word.length > maximumCharacters) {
      for (let index = 0; index < word.length; index += maximumCharacters) {
        lines.push(word.slice(index, index + maximumCharacters));
      }
      continue;
    }
    const current = lines[lines.length - 1] || '';
    if (!current) lines[lines.length ? lines.length - 1 : 0] = word;
    else if (`${current} ${word}`.length <= maximumCharacters) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  }
  return (lines.length ? lines : ['']).slice(0, 3);
}

/**
 * Internal text is reserved for compact notation. Descriptive words are safer
 * as external callouts because they otherwise cover the structure being taught.
 */
export function isInternalSymbolLabel(value) {
  const label = String(value || '').trim();
  if (!label || label.length > 12 || /\s/.test(label)) return false;
  if (/^[epn][⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/i.test(label)) return true;
  if (/^[A-Za-z]$/.test(label)) return true;
  if (/^(?:[A-Z][a-z]?\d{0,3}[+-]?|pH)$/.test(label)) return true;
  if (/^\d+(?:\.\d+)?(?:°[CFK]?|%|[A-Za-z]{0,2})?$/.test(label)) return true;
  return /^[+\-−=<>×÷/%°]+$/.test(label);
}

function descriptivePriority(element, originalIndex) {
  const label = String(element.label || '').trim();
  const wordBonus = /\s/.test(label) ? 100 : 0;
  return wordBonus + label.length - originalIndex / 1000;
}

/**
 * Promote descriptive free text to external labels. The original text
 * coordinate becomes the feature target, so cached illustrations improve
 * without another AI request.
 */
export function prepareIllustrationLabels(calloutElements, textElements, options = {}) {
  const width = Number(options.width) || 960;
  const maxPerSide = Number(options.maxPerSide) || MAX_CALLOUTS_PER_SIDE;
  const callouts = calloutElements.map(element => ({ ...element }));
  const internalTexts = [];
  const descriptive = [];

  textElements.forEach((element, originalIndex) => {
    if (isInternalSymbolLabel(element.label)) internalTexts.push(element);
    else descriptive.push({ element, originalIndex, priority: descriptivePriority(element, originalIndex) });
  });

  const available = Math.max(0, maxPerSide * 2 - callouts.length);
  const promotedIndexes = new Set(
    descriptive
      .slice()
      .sort((first, second) => second.priority - first.priority)
      .slice(0, available)
      .map(item => item.originalIndex),
  );

  for (const item of descriptive) {
    if (!promotedIndexes.has(item.originalIndex)) {
      internalTexts.push(item.element);
      continue;
    }
    callouts.push({
      ...item.element,
      kind: 'callout',
      x2: item.element.x < width / 2 ? 170 : width - 170,
      y2: item.element.y,
      fill: '#ffffff',
      stroke: item.element.stroke === 'none' ? '#475569' : item.element.stroke,
    });
  }

  const records = callouts.map((element, originalIndex) => ({
    element,
    originalIndex,
    side: element.x < width / 2 ? 'left' : 'right',
  }));
  const count = side => records.filter(record => record.side === side).length;

  for (const overloadedSide of ['left', 'right']) {
    const otherSide = overloadedSide === 'left' ? 'right' : 'left';
    while (count(overloadedSide) > maxPerSide && count(otherSide) < maxPerSide) {
      const candidate = records
        .filter(record => record.side === overloadedSide)
        .sort((first, second) => {
          const firstDistance = Math.abs(first.element.x - width / 2);
          const secondDistance = Math.abs(second.element.x - width / 2);
          return firstDistance - secondDistance || first.originalIndex - second.originalIndex;
        })[0];
      if (!candidate) break;
      candidate.side = otherSide;
    }
  }

  return {
    callouts: records.map(record => ({
      ...record.element,
      x2: record.side === 'left' ? 170 : width - 170,
      y2: record.element.y,
    })),
    internalTexts,
  };
}

export function positionIllustrationCallouts(elements, options = {}) {
  const width = Number(options.width) || 960;
  const height = Number(options.height) || 600;
  const boxWidth = Number(options.boxWidth) || 206;
  const topLimit = 12;
  const bottomLimit = height - 12;
  const normalGap = 10;

  const place = side => {
    const selected = elements
      .filter(element => (element.x2 < width / 2 ? 'left' : 'right') === side)
      .map((element, originalIndex) => ({
        element,
        originalIndex,
        lines: wrapIllustrationLabel(element.label, 24),
      }))
      .sort((first, second) => first.element.y - second.element.y || first.originalIndex - second.originalIndex);

    const layouts = selected.map(item => ({
      ...item,
      side,
      boxX: side === 'left' ? 10 : width - boxWidth - 10,
      boxY: 0,
      boxWidth,
      boxHeight: Math.max(40, item.lines.length * 16 + 18),
    }));
    if (!layouts.length) return layouts;

    const totalHeight = layouts.reduce((sum, layout) => sum + layout.boxHeight, 0);
    const availableHeight = bottomLimit - topLimit;
    const gap = layouts.length > 1
      ? Math.max(2, Math.min(normalGap, (availableHeight - totalHeight) / (layouts.length - 1)))
      : 0;

    let cursor = topLimit;
    for (const layout of layouts) {
      const wanted = clamp(layout.element.y - layout.boxHeight / 2, topLimit, bottomLimit - layout.boxHeight);
      layout.boxY = Math.max(cursor, wanted);
      cursor = layout.boxY + layout.boxHeight + gap;
    }

    let reverseCursor = bottomLimit;
    for (let index = layouts.length - 1; index >= 0; index -= 1) {
      const layout = layouts[index];
      layout.boxY = Math.min(layout.boxY, reverseCursor - layout.boxHeight);
      reverseCursor = layout.boxY - gap;
    }

    cursor = topLimit;
    for (const layout of layouts) {
      layout.boxY = Math.max(cursor, layout.boxY);
      cursor = layout.boxY + layout.boxHeight + gap;
    }
    return layouts;
  };

  return [...place('left'), ...place('right')];
}

/** A leader is deliberately represented by exactly two endpoints. */
export function straightLeaderCoordinates(layout) {
  const targetX = Number(layout.element.x) || 0;
  const targetY = Number(layout.element.y) || 0;
  const anchorX = layout.side === 'left' ? layout.boxX + layout.boxWidth : layout.boxX;
  const anchorY = clamp(targetY, layout.boxY + 11, layout.boxY + layout.boxHeight - 11);
  return { anchorX, anchorY, targetX, targetY };
}
