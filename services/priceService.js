exports.calculatePrice = (w, h, l, kg) => {
  const volumetric = (w * h * l) / 5000;
  const billable = Math.max(volumetric, kg);
  return (billable * 2.5).toFixed(2);
};
