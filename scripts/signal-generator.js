// scripts/signal-generator.js
// توليد الإشارات — ترسل عند تكوّن FVG

import { findSwings, findEqualLevels } from './indicators.js';
import { detectSetups } from './setup-detector.js';

const CONFIG = {
  lookback: 5,
  tolerance: 0.003,
  minGap: 50,
  maxGap: 1000,
  minFvgPct: 0.003,
  minSlPct: 0.003,
  maxSlPct: 0.05,
  minRr: 1.5,
  maxRr: 10.0,
  minTpPct: 0.005,
  maxAgeBars: 3,   // عمر FVG (آخر 3 شموع)
};

/**
 * توليد إشارة حية من البيانات
 * @param {Array} df - مصفوفة الشموع
 * @param {number} currentBar - فهرس آخر شمعة
 * @returns {Object|null}
 */
export function generateSignal(df, currentBar) {
  if (df.length < 100) return null;

  // 1. Swings
  const { swingHighs, swingLows } = findSwings(df, CONFIG.lookback);
  if (swingHighs.length < 2 || swingLows.length < 2) return null;

  // 2. Equal Levels
  const { equalHighs, equalLows } = findEqualLevels(
    swingHighs, swingLows,
    CONFIG.tolerance, CONFIG.minGap, CONFIG.maxGap
  );

  if (equalHighs.length === 0 && equalLows.length === 0) return null;

  // 3. Setups
  const setups = detectSetups(df, swingHighs, swingLows, equalHighs, equalLows);
  if (setups.length === 0) return null;

  // 4. فلترة
  const validSetups = [];

  for (const setup of setups) {
    // 4أ. عمر FVG
    const age = currentBar - setup.fvg_idx;
    if (age > CONFIG.maxAgeBars) continue;
    if (age < 0) continue;

    // 4ب. حجم FVG
    const fvgSize = (setup.fvg_top - setup.fvg_bottom) / setup.fvg_bottom;
    if (fvgSize < CONFIG.minFvgPct) continue;

    // 4ج. Entry/SL/TP
    const entry = setup.entry_price;
    const sl = setup.stop_loss;
    const tp = setup.target;

    const slPct = Math.abs(entry - sl) / entry;
    const tpPct = Math.abs(tp - entry) / entry;

    // 4د. فحص SL/TP
    if (slPct < CONFIG.minSlPct || slPct > CONFIG.maxSlPct) continue;
    if (tpPct < CONFIG.minTpPct) continue;

    // 4هـ. RR
    const rr = tpPct / slPct;
    if (rr < CONFIG.minRr || rr > CONFIG.maxRr) continue;

    // 4و. فحص اتجاه صحيح
    if (setup.type === 'LONG' && (sl >= entry || tp <= entry)) continue;
    if (setup.type === 'SHORT' && (sl <= entry || tp >= entry)) continue;

    validSetups.push({
      ...setup,
      sl_pct: slPct * 100,
      tp_pct: tpPct * 100,
      rr: rr,
      age: age,
    });
  }

  if (validSetups.length === 0) return null;

  // 5. اختر الأحدث
  validSetups.sort((a, b) => a.age - b.age);
  return validSetups[0];
}

export function getConfig() {
  return { ...CONFIG };
}
