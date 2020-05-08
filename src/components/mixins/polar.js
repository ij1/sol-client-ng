export let polarMixin = {
  methods: {
    polarCoords (twa, speed, gridScale, extraPixels = 0) {
      return {
        x: Math.sin(twa) * (speed * gridScale + extraPixels),
        y: -Math.cos(twa) * (speed * gridScale + extraPixels),
      };
    },
    drawPolarCurve(ctx, curve, gridScale, cutOff = Number.MAX_VALUE) {
      ctx.beginPath();
      let move = true;
      for (let pt of curve.values) {
        if (pt.speed > cutOff) {
          move = true;
        }
        const polarPos = this.polarCoords(pt.twa, pt.speed, gridScale);
        move ? ctx.moveTo(polarPos.x, polarPos.y) : ctx.lineTo(polarPos.x, polarPos.y);
        if (pt.speed < cutOff) {
          move = false;
        }
      }
      ctx.stroke();
    },
  },
}
