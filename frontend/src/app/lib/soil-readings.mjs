export function getSoilReadings(readings, sensor) {
  const number = Number(sensor);
  const valid = Number.isInteger(number) && number >= 1 && number <= 12;
  const read = (prefix) => {
    const value = valid ? readings?.[`${prefix}${number}`] : null;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  return { temp: read("T_S"), humidity: read("H_S"), ph: read("PH_S"), conductivity: read("C_S") };
}
