// scripts/zigzag.js
// ZigZag + Fibonacci للمناطق Mean Reversion

/**
 * يحسب ZigZag بنسبة %
 * @param {Array} df - الشموع
 * @param {number} pct - النسبة (مثل 0.075 لـ 7.5%)
 * @returns {Array} - [{idx, type, price}]
 */
export function calculateZigZag(df, pct = 0.075) {
  const n = df.length;
  if (n < 3) return [];

  const pivots = [];
  let lastIdx = 0;
  let lastPrice = df[0].high;
  let direction = null;

  // تحديد الاتجاه الأولي
  for (let i = 1; i < n; i++) {
    const upChange = (df[i].high - df[lastIdx].low) / df[lastIdx].low;
    const dnChange = (df[lastIdx].high - df[i].low) / df[lastIdx].high;

    if (upChange >= pct) {
      pivots.push({ idx: lastIdx, type: 'L', price: df[lastIdx].low });
      lastIdx = i;
      lastPrice = df[i].high;
      direction = 'up';
      break;
    } else if (dnChange >= pct) {
      pivots.push({ idx: lastIdx, type: 'H', price: df[lastIdx].high });
      lastIdx = i;
      lastPrice = df[i].low;
      direction = 'down';
      break;
    }
  }

  if (direction === null) return [];

  // تتبع الاتجاه
  for (let i = lastIdx + 1; i < n; i++) {
    if (direction === 'up') {
      if (df[i].high > lastPrice) {
        lastPrice = df[i].high;
        lastIdx = i;
      } else if ((lastPrice - df[i].low) / lastPrice >= pct) {
        pivots.push({ idx: lastIdx, type: 'H', price: lastPrice });
        lastIdx = i;
        lastPrice = df[i].low;
        direction = 'down';
      }
    } else {
      if (df[i].low < lastPrice) {
        lastPrice = df[i].low;
        lastIdx = i;
      } else if ((df[i].high - lastPrice) / lastPrice >= pct) {
        pivots.push({ idx: lastIdx, type: 'L', price: lastPrice });
        lastIdx = i;
        lastPrice = df[i].high;
        direction = 'up';
      }
    }
  }

  return pivots;
}

/**
 * يبني النطاقات من ZigZag
 * @param {Array} pivots - نقاط ZigZag
 * @param {number} minBars - أقل عدد شموع بين النقاط
 * @returns {Array} - النطاقات مع مستويات فيبوناتشي
 */
export function buildRanges(pivots, minBars = 20) {
  const ranges = [];
  const used = new Set();

  for (let a = 0; a < pivots.length - 1; a++) {
    const p1 = pivots[a];
    const p2 = pivots[a + 1];

    if (used.has(p1.idx) || used.has(p2.idx)) continue;
    if (p1.type === p2.type) continue;
    if (p2.idx - p1.idx < minBars) continue;

    let top, bottom, rangeType;

    if (p1.type === 'H' && p2.type === 'L') {
      top = p1.price;
      bottom = p2.price;
      rangeType = 'down';
    } else if (p1.type === 'L' && p2.type === 'H') {
      top = p2.price;
      bottom = p1.price;
      rangeType = 'up';
    } else {
      continue;
    }

    if (top <= bottom) continue;

    const size = top - bottom;

    ranges.push({
      start_idx: p1.idx,
      end_idx: p2.idx,
      top: top,
      bottom: bottom,
      range_type: rangeType,
      p1: top,
      p75: bottom + 0.75 * size,
      p50: bottom + 0.50 * size,
      p25: bottom + 0.25 * size,
      p0: bottom,
      size: size,
    });

    used.add(p1.idx);
    used.add(p2.idx);
  }

  return ranges;
}
