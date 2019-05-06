export let polarMixin = {
  methods: {
    polarCoords (twa, speed, gridScale, extraPixels = 0) {
      return {
        x: Math.sin(twa) * (speed * gridScale + extraPixels),
        y: -Math.cos(twa) * (speed * gridScale + extraPixels),
      };
    },
    drawPolarCurve(ctx, curve, gridScale) {
      ctx.beginPath();
      let first = true;
      for (let pt of curve.values) {
        const polarPos = this.polarCoords(pt.twa, pt.speed, gridScale);
        first ? ctx.moveTo(polarPos.x, polarPos.y) : ctx.lineTo(polarPos.x, polarPos.y);
        first = false;
      }
      ctx.stroke();
    },
  },
}
