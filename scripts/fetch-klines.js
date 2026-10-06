// scripts/fetch-klines.js
// جلب بيانات الشموع من Binance US — يدعم دفعتين

import axios from 'axios';

const BINANCE_URL = process.env.BINANCE_API_URL || 'https://api.binance.us';

/**
 * يجلب دفعة واحدة من Binance
 */
export async function fetchKlinesBatch(symbol, interval, limit = 1000, endTime = null) {
  const url = `${BINANCE_URL}/api/v3/klines`;
  const params = {
    symbol: symbol,
    interval: interval,
    limit: limit,
  };

  if (endTime !== null) {
    params.endTime = endTime;
  }

  try {
    const response = await axios.get(url, { params, timeout: 30000 });

    if (!Array.isArray(response.data) || response.data.length === 0) {
      return [];
    }

    return response.data;
  } catch (error) {
    console.error(`❌ فشل جلب ${symbol}: ${error.message}`);
    return null;
  }
}

/**
 * يحوّل بيانات الشموع إلى كائنات
 */
export function klinesToArray(klines) {
  if (!klines) return [];

  return klines.map(k => ({
    time: new Date(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

/**
 * يجلب 1001 شمعة (دفعتان)
 */
export async function fetchDataFrame(symbol, interval, totalLimit = 1001) {
  console.log(`  📥 جلب ${totalLimit} شمعة لـ ${symbol}...`);

  // الدفعة الأولى: 1000 شمعة (الأحدث)
  const batch1 = await fetchKlinesBatch(symbol, interval, 1000);
  if (!batch1 || batch1.length === 0) {
    console.log(`  ⚠️ لا توجد بيانات`);
    return null;
  }

  console.log(`    ✅ دفعة 1: ${batch1.length} شمعة`);

  let allKlines = [...batch1];

  // إذا احتجنا أكثر من 1000
  if (totalLimit > 1000 && batch1.length === 1000) {
    // الدفعة الثانية: 1001-1000 = 1 شمعة (قبل الدفعة الأولى)
    const endTime = batch1[0][0] - 1;
    const batch2 = await fetchKlinesBatch(symbol, interval, 1, endTime);

    if (batch2 && batch2.length > 0) {
      console.log(`    ✅ دفعة 2: ${batch2.length} شمعة`);
      allKlines = [...batch2, ...batch1];
    }
  }

  // تحويل
  const data = klinesToArray(allKlines);
  console.log(`    📊 الإجمالي: ${data.length} شمعة`);

  return {
    data: data,
    length: data.length,
  };
}
