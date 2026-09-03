export const parseMoeda = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).replace(/[^\d.,-]/g, '');
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  }
  else if (str.includes(',')) str = str.replace(',', '.');
  return parseFloat(str) || 0;
};
