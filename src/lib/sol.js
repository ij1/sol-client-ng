import L from 'leaflet';
import { atan2Bearing } from './nav.js';

export const MS_TO_KNT = 3600 / 1852;
export const EARTH_R = 6378137;
export const PROJECTION = L.CRS.EPSG3857;

export const validCountries = {
  ad: true, ae: true, af: true, ag: true, ai: true, al: true, am: true,
  an: true, ao: true, ar: true, as: true, at: true, au: true, aw: true,
  ax: true, az: true,
  ba: true, bb: true, bd: true, be: true, bf: true, bg: true, bh: true,
  bi: true, bj: true, bm: true, bn: true, bo: true, br: true, bs: true,
  bt: true, bv: true, bw: true, by: true, bz: true,
  ca: true, cc: true, cd: true, cf: true, cg: true, ch: true, ci: true,
  ck: true, cl: true, cm: true, cn: true, co: true, cr: true, cs: true,
  cu: true, cv: true, cx: true, cy: true, cz: true,
  de: true, dj: true, dk: true, dm: true, do: true, dz: true,
  ec: true, ee: true, eg: true, eh: true, er: true, es: true, et: true,
  fi: true, fj: true, fk: true, fm: true, fo: true, fr: true,
  ga: true, gb: true, gd: true, ge: true, gf: true, gh: true, gi: true,
  gl: true, gm: true, gn: true, gp: true, gq: true, gr: true, gs: true,
  gt: true, gu: true, gw: true, gy: true,
  hk: true, hm: true, hn: true, hr: true, ht: true, hu: true,
  id: true, ie: true, il: true, in: true, io: true, iq: true, ir: true,
  is: true, it: true,
  jm: true, jo: true, jp: true,
  ke: true, kg: true, kh: true, ki: true, km: true, kn: true, kp: true,
  kr: true, kw: true, ky: true, kz: true,
  la: true, lb: true, lc: true, li: true, lk: true, lr: true, ls: true,
  lt: true, lu: true, lv: true, ly: true,
  ma: true, mc: true, md: true, me: true, mg: true, mh: true, mk: true,
  ml: true, mm: true, mn: true, mo: true, mp: true, mq: true, mr: true,
  ms: true, mt: true, mu: true, mv: true, mw: true, mx: true, my: true,
  mz: true,
  na: true, nc: true, ne: true, nf: true, ng: true, ni: true, nl: true,
  no: true, np: true, nr: true, nu: true, nz: true,
  om: true,
  pa: true, pe: true, pf: true, pg: true, ph: true, pk: true, pl: true,
  pm: true, pn: true, pr: true, pt: true, pw: true, py: true,
  qa: true,
  re: true, ro: true, rs: true, ru: true, rw: true,
  sa: true, sb: true, sc: true, sd: true, se: true, sg: true, sh: true,
  si: true, sj: true, sk: true, sl: true, sm: true, sn: true, so: true,
  sr: true, st: true, sv: true, sy: true, sz: true,
  tc: true, td: true, tf: true, tg: true, th: true, tj: true, tk: true,
  tl: true, tm: true, tn: true, to: true, tr: true, tt: true, tv: true,
  tw: true, tz: true,
  ua: true, ug: true, um: true, us: true, uy: true, uz: true,
  va: true, vc: true, ve: true, vg: true, vi: true, vn: true, vu: true,
  wf: true, ws: true,
  ye: true, yt: true,
  za: true, zm: true, zw: true,
};

export function UVToWind(uv) {
  /* u,v are negated because u,v points "to", whereas TWD is wind "from" */
  let twd = atan2Bearing(-uv[0], uv[1]);
  const tws = Math.hypot(uv[0], uv[1]);
  
  return {
    twd: twd,
    knots: tws * MS_TO_KNT,
    ms: tws,
  };
}

function colorGradient (knots, min, max) {
  return Math.min(Math.max((knots - min) / (max - min), 0), 1);
}

export function windToColor(knots) {
  const r1 = colorGradient(knots, 10, 15) * 102 +
             colorGradient(knots, 15, 20) * (255 - 102);
  const g1 = colorGradient(knots, 0, 9) * 183 +
             colorGradient(knots, 9, 12) * (255 - 183);
  const b1 = (1 - colorGradient(knots, 7.5, 20)) * 255;
  const r2 = (1 - colorGradient(knots, 30, 70)) * 255;
  const g2 = (1 - colorGradient(knots, 17.5, 30)) * 255;
  const b2 = colorGradient(knots, 30, 50) * 255;
  let r = Math.max(r1 + r2 - 255, 0);
  let g = Math.max(g1 + g2 - 255, 0);
  let b = b1 + b2;
  if (knots > 60) {
    const v = (1 - colorGradient(knots, 60, 90)) * 255;
    b = v;
  }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
