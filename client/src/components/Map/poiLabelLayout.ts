export interface LabelCandidate {
  id: string | number;
  name: string;
  x: number;
  y: number;
}

// Rough box of a name tag in screen pixels: the tooltip font is ~12px, so a
// character averages ~6.6px; the rest is padding. Good enough to tell whether
// two names would sit on top of each other without measuring the DOM.
const CHAR_WIDTH = 6.6;
const LABEL_PADDING = 18;
const LABEL_HEIGHT = 26;
const LABEL_RISE = 12;
const PIN_HALF = 15;
const GAP = 4;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Picks which pins may show a permanent name without covering another name or
 * another pin. Pins are taken in the order given, so the first of a crowd keeps
 * its name and the neighbours stay as plain pins until the user zooms in far
 * enough for them to drift apart.
 */
export function pickVisibleLabels(candidates: LabelCandidate[]): Set<string | number> {
  const pinBoxes = candidates.map<Box>((c) => ({
    left: c.x - PIN_HALF,
    right: c.x + PIN_HALF,
    top: c.y - PIN_HALF,
    bottom: c.y + PIN_HALF,
  }));
  const accepted: Box[] = [];
  const visible = new Set<string | number>();
  candidates.forEach((c, i) => {
    const width = c.name.length * CHAR_WIDTH + LABEL_PADDING;
    const box: Box = {
      left: c.x - width / 2 - GAP,
      right: c.x + width / 2 + GAP,
      top: c.y - LABEL_RISE - LABEL_HEIGHT - GAP,
      bottom: c.y - LABEL_RISE + GAP,
    };
    if (accepted.some((a) => overlaps(a, box))) return;
    if (pinBoxes.some((p, j) => j !== i && overlaps(p, box))) return;
    accepted.push(box);
    visible.add(c.id);
  });
  return visible;
}
