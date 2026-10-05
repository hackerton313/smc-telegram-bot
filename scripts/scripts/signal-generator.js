// scripts/signal-generator.js
// توليد الإشارات الحية من آخر N شمعة

import { findSwings, findEqualLevels } from './indicators.js';
import { detectSetups } from './setup-detector.js';

// إعدادات الاستراتيجية (v1 - المجمّدة)
const CONFIG = {
  lookback: 5,
  tolerance: 0.003,
  minGap: 50,
  maxGap: 1000,
  minFvgPct: 0.003,        // 0.3%
  minSlPct: 0.003,          // 0.3%
  maxSlPct: 0.05,           // 5%
  minRr: 1.5,
  maxRr: 10.0,
  minTpPct: 0.005,          // 0.5%
  maxAgeBars: 2,            // آخر شمعتين
};

/**
 * توليد إشارة حية من بيانات الشموع
 * @param {Array} df - مصفوفة الشموع
 * @param {number} currentBar - فهرس آخر شمعة
 * @returns {Object|null} - Setup حي أو null
 */
export function generateSignal(df, currentBar) {
  if (df.length < 100) return null;

  // 1. كشف Swings
  const { swingHighs, swingLows } = findSwings(df, CONFIG.lookback);
  if (swingHighs.length < 2 || swingLows.length < 2) return null;

  // 2. كشف Equal Levels
  const { equalHighs, equalLows } = findEqualLevels(
    swingHighs,
    swingLows,
    CONFIG.tolerance,
    CONFIG.minGap,
    CONFIG.maxGap
  );

  if (equalHighs.length === 0 && equalLows.length === 0) return null;

  // 3. كشف Setups
  const setups = detectSetups(df, swingHighs, swingLows, equalHighs, equalLows);
  if (setups.length === 0) return null;

  // 4. فلترة Setups
  const validSetups = [];

  for (const setup of setups) {
    // 4أ. فحص العمر
    const age = currentBar - setup.fvg_idx;
    if (age > CONFIG.maxAgeBars) continue;

    // 4ب. فحص حجم FVG
    const fvgSize = (setup.fvg_top - setup.fvg_bottom) / setup.fvg_bottom;
    if (fvgSize < CONFIG.minFvgPct) continue;

    // 4ج. حساب الدخول المتوقع
    const entry = setup.type === 'LONG' ? setup.fvg_top : setup.fvg_bottom;
    const sl = setup.stop_loss;
    const tp = setup.target;

    // 4د. فحص SL/TP
    const slPct = Math.abs(entry - sl) / entry;
    const tpPct = Math.abs(tp - entry) / entry;

    if (slPct < CONFIG.minSlPct || slPct > CONFIG.maxSlPct) continue;
    if (tpPct < CONFIG.minTpPct) continue;

    // 4هـ. فحص RR
    const rr = tpPct / slPct;
    if (rr < CONFIG.minRr || rr > CONFIG.maxRr) continue;

    // 4و. فحص محاكاة الدخول
    const entrySim = simulateEntry(df, setup);
    if (!entrySim.entered) continue;

    // 4ز. التأكد أن الدخول في آخر شمعة أو الشمعة السابقة
    const entryAge = currentBar - entrySim.entryIdx;
    if (entryAge > 1) continue;

    validSetups.push({
      ...setup,
      entry_price: entrySim.entryPrice,
      entry_idx: entrySim.entryIdx,
      sl_pct: slPct * 100,
      tp_pct: tpPct * 100,
      rr: rr,
      age: age,
      entry_age: entryAge,
    });
  }

  if (validSetups.length === 0) return null;

  // 5. اختر الأحدث
  validSetups.sort((a, b) => a.entry_age - b.entry_age);
  return validSetups[0];
}

/**
 * محاكاة الدخول (نفس منطق backtester)
 */
function simulateEntry(df, setup) {
  const maxBars = 30;
  const start = setup.fvg_idx + 1;
  const end = Math.min(setup.fvg_idx + maxBars, df.length);

  for (let i = start; i < end; i++) {
    if (setup.type === 'LONG') {
      if (df[i].low <= setup.fvg_top) {
        return { entered: true, entryIdx: i, entryPrice: setup.fvg_top };
      }
    } else {
      if (df[i].high >= setup.fvg_bottom) {
        return { entered: true, entryIdx: i, entryPrice: setup.fvg_bottom };
      }
    }
  }

  return { entered: false };
}

/**
 * الحصول على إعدادات الاستراتيجية
 */
export function getConfig() {
  return { ...CONFIG };
}
