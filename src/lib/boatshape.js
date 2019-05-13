const sailOffset = -6;
const boatPath = new Path2D('M -3 11 C -5 7,-6 -1,0 -13 C 6 -1,5 7,3 11 Z');
const sailPath = new Path2D('M 0 0 C -3 5,-3 12,0 17');
const sailTwa0Path = new Path2D('M 0 0 L 0 17');

export function drawBoat(ctx, course, twa) {
  const sangle = sailAngle(twa);

  ctx.rotate(course);
  ctx.stroke(boatPath);
  ctx.translate(0, sailOffset);
  ctx.rotate(sangle);
  if (twa < 0) {
    ctx.scale(-1, 1);
  }
  if (twa === 0) {
    ctx.stroke(sailTwa0Path);
  } else {
    ctx.stroke(sailPath);
  }
  if (sangle < 0) {
    ctx.scale(-1, 1);
  }
  ctx.rotate(-sangle);
  ctx.translate(0, -sailOffset);
  ctx.rotate(-course);
}

/* FIXME:
 * perhaps some AWA based calculation could result in a better angle
 * maxvmg angle should be consider especially for headwind
 */
export function sailAngle (twa) {
  return twa / (180 / 75);
}
