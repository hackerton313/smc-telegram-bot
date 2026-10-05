// scripts/indicators.js
// المؤشرات: Swings, Equal Levels, FVG, BOS, OB, Sweep

/**
 * كشف القمم والقيعان (Swings)
 * @param {Array} df - مصفوفة الشموع
 * @param {number} lookback - عدد الشموع قبل/بعد
 * @returns {Object} - { swingHighs, swingLows }
 */
export function findSwings(df, lookback = 5) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < df.length - lookback; i++) {
    const high = df[i].high;
    const low = df[i].low;

    // فحص القمة
    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && df[j].high > high) {
        isHigh = false;
        break;
      }
    }

    // فحص القاع
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && df[j].low < low) {
        isLow = false;
        break;
      }
    }

    if (isHigh) swingHighs.push({ idx: i, price: high });
    if (isLow) swingLows.push({ idx: i, price: low });
  }

  return { swingHighs, swingLows };
}

/**
 * كشف المستويات المتساوية (Equal Highs/Lows)
 */
export function findEqualLevels(swingHighs, swingLows, tolerance = 0.003, minGap = 50, maxGap = 1000) {
  const equalHighs = [];
  const equalLows = [];

  for (let i = 0; i < swingHighs.length; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const s1 = swingHighs[i];
      const s2 = swingHighs[j];
      const gap = s2.idx - s1.idx;
      const diff = Math.abs(s2.price - s1.price) / s1.price;

      if (diff < tolerance && gap >= minGap && gap <= maxGap) {
        equalHighs.push({
          idx1: s1.idx,
          idx2: s2.idx,
          price: Math.max(s1.price, s2.price),
        });
      }
    }
  }

  for (let i = 0; i < swingLows.length; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const s1 = swingLows[i];
      const s2 = swingLows[j];
      const gap = s2.idx - s1.idx;
      const diff = Math.abs(s2.price - s1.price) / s1.price;

      if (diff < tolerance && gap >= minGap && gap <= maxGap) {
        equalLows.push({
          idx1: s1.idx,
          idx2: s2.idx,
          price: Math.min(s1.price, s2.price),
        });
      }
    }
  }

  return { equalHighs, equalLows };
}

/**
 * كشف FVG (Fair Value Gap)
 */
export function findFVG(df, idx) {
  if (idx < 2) return null;

  const c1 = df[idx - 2];
  const c2 = df[idx - 1];
  const c3 = df[idx];

  // FVG صاعدة
  if (c3.low > c1.high) {
    return {
      type: 'bullish',
      idx: idx,
      top: c3.low,
      bottom: c1.high,
    };
  }

  // FVG هابطة
  if (c3.high < c1.low) {
    return {
      type: 'bearish',
      idx: idx,
      top: c1.low,
      bottom: c3.high,
    };
  }

  return null;
}

/**
 * كشف BOS (Break of Structure)
 */
export function findBOS(df, swingHighs, swingLows) {
  const bosEvents = [];

  for (let i = 1; i < df.length; i++) {
    const high = df[i].high;
    const low = df[i].low;

    const prevHighs = swingHighs.filter(s => s.idx < i);
    const prevLows = swingLows.filter(s => s.idx < i);

    if (prevHighs.length > 0) {
      const lastHigh = prevHighs[prevHighs.length - 1];
      if (high > lastHigh.price) {
        bosEvents.push({ idx: i, type: 'bullish', brokenLevel: lastHigh.price });
      }
    }

    if (prevLows.length > 0) {
      const lastLow = prevLows[prevLows.length - 1];
      if (low < lastLow.price) {
        bosEvents.push({ idx: i, type: 'bearish', brokenLevel: lastLow.price });
      }
    }
  }

  return bosEvents;
}

/**
 * كشف Order Block
 */
export function findOrderBlock(df, breakIdx, direction) {
  const start = Math.max(0, breakIdx - 10);

  for (let i = breakIdx - 1; i >= start; i--) {
    if (direction === 'bearish') {
      if (df[i].close > df[i].open) {
        return { idx: i, top: df[i].high, bottom: df[i].low };
      }
    } else {
      if (df[i].close < df[i].open) {
        return { idx: i, top: df[i].high, bottom: df[i].low };
      }
    }
  }

  return null;
}

/**
 * كشف Sweep (اجتياح السيولة)
 */
export function detectSweep(df, levelIdx, levelPrice, direction, lookahead = 50) {
  const end = Math.min(levelIdx + lookahead, df.length);

  for (let i = levelIdx + 1; i < end; i++) {
    if (direction === 'high') {
      if (df[i].high > levelPrice * 1.001) {
        if (i + 1 < df.length && df[i + 1].close < levelPrice) {
          return i;
        }
      }
    } else {
      if (df[i].low < levelPrice * 0.999) {
        if (i + 1 < df.length && df[i + 1].close > levelPrice) {
          return i;
        }
      }
    }
  }

  return null;
}
