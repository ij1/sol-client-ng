/* In HTML5 canvas, the origo is at pixel edge rather than in the center
 * of it. Thus half-pixel translate is needed (at least with Firefox) to
 * draw aligned to pixels.
 */
export function canvasAlignToPixelCenter(ctx) {
  ctx.translate(0.5, 0.5);
}
