function median(arr) {
  if (!arr || arr.length === 0) return null;
  const s = Array.from(arr).sort((a,b) => a-b);
  const mid = Math.floor(s.length/2);
  if (s.length % 2 === 0) return (s[mid-1] + s[mid]) / 2;
  return s[mid];
}

function mean(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a,b) => a+b, 0) / arr.length;
}

module.exports = { median, mean };