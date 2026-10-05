// scripts/setup-detector.js
// كشف Setups (SHORT + LONG) — v1 (الاستراتيجية المجمّدة)

import { findOrderBlock, findFVG, detectSweep } from './indicators.js';

/**
 * كشف Setups على البيانات
 * @param {Array} df - مصفوفة الشموع
 * @param {Array} swingHighs 
 * @param {Array} swingLows 
 * @param {Array} equalHighs 
 * @param {Array} equalLows 
 * @returns {Array} - قائمة Setups
 */
export function detectSetups(df, swingHighs, swingLows, equalHighs, equalLows) {
  const setups = [];

  // ===== SHORT =====
  for (const eq of equalHighs) {
    const levelIdx = eq.idx2;
    const levelPrice = eq.price;

    // 1. Sweep
    const sweepIdx = detectSweep(df, levelIdx, levelPrice, 'high', 50);
    if (sweepIdx === null) continue;

    // 2. BOS (بعد Sweep)
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

    // 3. OB (قبل BOS)
    const ob = findOrderBlock(df, bosIdx, 'bearish');
    if (!ob) continue;

    // 4. FVG (بعد BOS)
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

    // 5. TP (أقرب قاع أدنى من FVG)
    let target = null;
    for (const s of swingLows) {
      if (s.idx > fvg.idx && s.price < fvg.bottom) {
        target = s;
        break;
      }
    }
    if (!target) continue;

    setups.push({
      type: 'SHORT',
      eq_idx: levelIdx,
      sweep_idx: sweepIdx,
      bos_idx: bosIdx,
      ob_idx: ob.idx,
      fvg_idx: fvg.idx,
      fvg_top: fvg.top,
      fvg_bottom: fvg.bottom,
      entry_zone_top: ob.top,
      entry_zone_bottom: ob.bottom,
      stop_loss: Math.max(fvg.top, ob.top),
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

    // 3. OB
    const ob = findOrderBlock(df, bosIdx, 'bullish');
    if (!ob) continue;

    // 4. FVG
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

    // 5. TP
    let target = null;
    for (const s of swingHighs) {
      if (s.idx > fvg.idx && s.price > fvg.top) {
        target = s;
        break;
      }
    }
    if (!target) continue;

    setups.push({
      type: 'LONG',
      eq_idx: levelIdx,
      sweep_idx: sweepIdx,
      bos_idx: bosIdx,
      ob_idx: ob.idx,
      fvg_idx: fvg.idx,
      fvg_top: fvg.top,
      fvg_bottom: fvg.bottom,
      entry_zone_top: ob.top,
      entry_zone_bottom: ob.bottom,
      stop_loss: Math.min(fvg.bottom, ob.bottom),
      target: target.price,
      target_idx: target.idx,
    });
  }

  // ترتيب حسب fvg_idx
  setups.sort((a, b) => a.fvg_idx - b.fvg_idx);
  return setups;
}
