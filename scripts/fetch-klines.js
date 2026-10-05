// scripts/fetch-klines.js
// يجلب بيانات الشموع من Binance US

import axios from 'axios';

const BINANCE_URL = process.env.BINANCE_API_URL || 'https://api.binance.us';

/**
 * يجلب آخر N شمعة من Binance
 * @param {string} symbol - مثل BTCUSDT
 * @param {string} interval - مثل 1h
 * @param {number} limit - عدد الشموع (الحد الأقصى 1000)
 * @returns {Promise<Array>} - مصفوفة الشموع
 */
export async function fetchKlines(symbol, interval, limit = 500) {
  const url = `${BINANCE_URL}/api/v3/klines`;
  const params = {
    symbol: symbol,
    interval: interval,
    limit: limit,
  };

  try {
    const response = await axios.get(url, { params, timeout: 30000 });
    
    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`لا توجد بيانات لـ ${symbol}`);
    }

    return response.data;
  } catch (error) {
    console.error(`❌ فشل جلب ${symbol}: ${error.message}`);
    return null;
  }
}

/**
 * يحوّل بيانات الشموع إلى كائنات
 * @param {Array} klines - بيانات Binance
 * @returns {Array} - مصفوفة كائنات
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
 * يجلب البيانات ككائن DataFrame (مع دوال مساعدة)
 * @param {string} symbol 
 * @param {string} interval 
 * @param {number} limit 
 * @returns {Promise<Object|null>}
 */
export async function fetchDataFrame(symbol, interval, limit = 500) {
  const klines = await fetchKlines(symbol, interval, limit);
  if (!klines) return null;

  const data = klinesToArray(klines);
  return new DataFrame(data);
}

/**
 * فئة DataFrame - تحاكي pandas
 */
export class DataFrame {
  constructor(data) {
    this.data = data;
    this.length = data.length;
  }

  // الوصول للعناصر
  at(index) {
    return this.data[index];
  }

  // الوصول لعمود
  col(name) {
    return this.data.map(row => row[name]);
  }

  // قيمة في صف/عمود
  get(index, name) {
    if (index < 0 || index >= this.length) return null;
    return this.data[index][name];
  }

  // شريحة
  slice(start, end) {
    return new DataFrame(this.data.slice(start, end));
  }
}
