// scripts/setup-detector.js
// كشف Setups — بدون OB
// الترتيب: Equal Levels → Sweep → BOS → FVG

import { findFVG, detectSweep } from './indicators.js';

export function detectSetups(df, swingHighs, swingLows, equalHighs, equalLows) {
  const setups = [];

  // ===== SHORT =====
  for (const eq of equalHighs) {
    const levelIdx = eq.idx2;
    const levelPrice = eq.price;

    // 1. Sweep
    const sweepIdx = detectSweep(df, levelIdx, levelPrice, 'high', 50);
    if (sweepIdx === null) continue;

    // 2. BOS
    let bosIdx = null;
    const bosEnd = Math.min(sweepIdx + 100, df.length);
    for (let i = sweepIdx + 1; i < bosEnd; i++) {
      const prevLows = swingLows.filter(s => s.idx < i);
      if (prevLows.length > 0 && df[i].low < prevLows[prevLows.length - 1].price) {
        bosIdx = i;
        break;
      }
    }
    if (bosIdx === null) continue;

    // 3. FVG (بعد BOS)
    let fvg = null;
    const fvgEnd = Math.min(bosIdx + 50, df.length);
    for (let i = bosIdx + 1; i < fvgEnd; i++) {
      const f = findFVG(df, i);
      if (f && f.type === 'bearish') {
        fvg = f;
        break;
      }
    }
    if (!fvg) continue;

    // 4. TP (أقرب قاع أدنى من FVG)
    let target = null;
    for (const s of swingLows) {
      if (s.idx > fvg.idx && s.price < fvg.bottom) {
        target = s;
        break;
      }
    }
    if (!target) continue;

    // 5. SL (قمة Sweep)
    const sweepHigh = df[sweepIdx].high;

    setups.push({
      type: 'SHORT',
      eq_idx: levelIdx,
      sweep_idx: sweepIdx,
      bos_idx: bosIdx,
      fvg_idx: fvg.idx,
      fvg_top: fvg.top,
      fvg_bottom: fvg.bottom,
      entry_price: fvg.bottom,        // ← SHORT: دخول عند fvg_bottom
      stop_loss: sweepHigh,
      target: target.price,
      target_idx: target.idx,
    });
  }

  // ===== LONG =====
  for (const eq of equalLows) {
    const levelIdx = eq.idx2;
    const levelPrice = eq.price;

    // 1. Sweep
    const sweepIdx = detectSweep(df, levelIdx, levelPrice, 'low', 50);
    if (sweepIdx === null) continue;

    // 2. BOS
    let bosIdx = null;
    const bosEnd = Math.min(sweepIdx + 100, df.length);
    for (let i = sweepIdx + 1; i < bosEnd; i++) {
      const prevHighs = swingHighs.filter(s => s.idx < i);
      if (prevHighs.length > 0 && df[i].high > prevHighs[prevHighs.length - 1].price) {
        bosIdx = i;
        break;
      }
    }
    if (bosIdx === null) continue;

    // 3. FVG (بعد BOS)
    let fvg = null;
    const fvgEnd = Math.min(bosIdx + 50, df.length);
    for (let i = bosIdx + 1; i < fvgEnd; i++) {
      const f = findFVG(df, i);
      if (f && f.type === 'bullish') {
        fvg = f;
        break;
      }
    }
    if (!fvg) continue;

    // 4. TP (أقرب قمة أعلى من FVG)
    let target = null;
    for (const s of swingHighs) {
      if (s.idx > fvg.idx && s.price > fvg.top) {
        target = s;
        break;
      }
    }
    if (!target) continue;

    // 5. SL (قاع Sweep)
    const sweepLow = df[sweepIdx].low;

    setups.push({
      type: 'LONG',
      eq_idx: levelIdx,
      sweep_idx: sweepIdx,
      bos_idx: bosIdx,
      fvg_idx: fvg.idx,
      fvg_top: fvg.top,
      fvg_bottom: fvg.bottom,
      entry_price: fvg.top,           // ← LONG: دخول عند fvg_top
      stop_loss: sweepLow,
      target: target.price,
      target_idx: target.idx,
    });
  }

  setups.sort((a, b) => a.fvg_idx - b.fvg_idx);
  return setups;
}
