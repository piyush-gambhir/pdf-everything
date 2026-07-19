export type Position =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export function computeAnchor(
  position: Position,
  pageSize: { width: number; height: number },
  textSize: { width: number; height: number },
  margin: number,
): { x: number; y: number } {
  const { width, height } = pageSize;
  const { width: tw, height: th } = textSize;

  let x = margin;
  let y = margin;

  if (position.endsWith('center')) x = (width - tw) / 2;
  else if (position.endsWith('right')) x = width - tw - margin;

  if (position.startsWith('middle')) y = (height - th) / 2;
  else if (position.startsWith('top')) y = height - th - margin;

  return { x, y };
}
