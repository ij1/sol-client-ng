import L from 'leaflet';

export const eventMap = {
  mousedown: {
    move: 'mousemove',
    end: 'mouseup',
  },
  touchstart: {
    move: 'touchmove',
    end: 'touchend',
  },
};

export function touchPositionOnElement(ev, element) {
  const tmpPt = L.DomEvent.getMousePosition(ev, element);

  const pt = L.point(Math.floor(tmpPt.x), Math.floor(tmpPt.y));
  if (isNaN(pt.x) || isNaN(pt.y)) {
    return null;
  }
  return pt;
}
