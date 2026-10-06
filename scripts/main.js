// scripts/main.js
// السكريبت الرئيسي: يجلب البيانات → يحلل → ينشر

import fs from 'fs';
import { fetchDataFrame } from './fetch-klines.js';
import { generateSignal, getConfig } from './signal-generator.js';
import { generateChartForCoin } from './generate-chart.js';
import { sendPhoto, buildSignalMessage } from './send-telegram.js';

const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'DOGE'];
const TIMEFRAME = '1h';
const POSTED_FILE = './posted_setups.json';
const MAX_POSTS_PER_RUN = 3; // الحد الأقصى للرسائل في كل تشغيل

/**
 * تحميل Setups المُرسلة سابقاً
 */
function loadPostedSetups() {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      return JSON.parse(fs.readFileSync(POSTED_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('⚠️ فشل قراءة posted_setups.json');
  }
  return { setups: [] };
}

/**
 * حفظ Setups المُرسلة
 */
function savePostedSetups(data) {
  try {
    fs.writeFileSync(POSTED_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('⚠️ فشل حفظ posted_setups.json');
  }
}

/**
 * فحص: هل تم إرسال هذا Setup سابقاً؟
 */
function isAlreadyPosted(postedData, coin, fvgIdx) {
  return postedData.setups.some(s => 
    s.coin === coin && s.fvg_idx === fvgIdx
  );
}

/**
 * حفظ Setup كمُرسل
 */
function markAsPosted(postedData, coin, fvgIdx, entryIdx) {
  postedData.setups.push({
    coin: coin,
    fvg_idx: fvgIdx,
    entry_idx: entryIdx,
    sent_at: new Date().toISOString(),
  });

  // احتفظ بآخر 100 فقط
  if (postedData.setups.length > 100) {
    postedData.setups = postedData.setups.slice(-100);
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log('🚀 بدء التشغيل...');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`📊 العملات: ${COINS.join(', ')}`);
  console.log(`📈 الفريم: ${TIMEFRAME}`);
  console.log('='.repeat(60));

  const config = getConfig();
  console.log('⚙️ الإعدادات:', JSON.stringify(config, null, 2));
  console.log('='.repeat(60));

  const postedData = loadPostedSetups();
  console.log(`📋 Setups مُرسلة سابقاً: ${postedData.setups.length}`);

  const signals = [];

  // 1. البحث عن إشارات في كل عملة
  for (const coin of COINS) {
    console.log(`\n🔍 فحص ${coin}...`);

    try {
      const symbol = `${coin}USDT`;
      const df = await fetchDataFrame(symbol, TIMEFRAME, 500);

      if (!df || df.length < 100) {
        console.log(`  ⚠️ بيانات غير كافية`);
        continue;
      }

      console.log(`  📊 ${df.length} شمعة`);

      const currentBar = df.length - 1;
      const signal = generateSignal(df.data, currentBar);

      if (!signal) {
        console.log(`  ⏭️ لا توجد إشارة`);
        continue;
      }

      // فحص: هل أُرسل سابقاً؟
      if (isAlreadyPosted(postedData, coin, signal.fvg_idx)) {
        console.log(`  ⏭️ تم إرسالها سابقاً (fvg_idx=${signal.fvg_idx})`);
        continue;
      }

      console.log(`  ✅ إشارة ${signal.type} | Entry: $${signal.entry_price.toFixed(4)} | RR: ${signal.rr.toFixed(2)}`);

      signals.push({
        coin: coin,
        signal: signal,
      });

    } catch (error) {
      console.error(`  ❌ خطأ في ${coin}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 إجمالي الإشارات الجديدة: ${signals.length}`);

  if (signals.length === 0) {
    console.log('⏭️ لا توجد إشارات جديدة، إنهاء');
    return;
  }

  // 2. ترتيب حسب الأحدث
  signals.sort((a, b) => a.signal.entry_age - b.signal.entry_age);

  // 3. نشر الإشارات (بحد أقصى)
  let publishedCount = 0;

  for (const { coin, signal } of signals) {
    if (publishedCount >= MAX_POSTS_PER_RUN) {
      console.log(`\n⚠️ وصلنا للحد الأقصى (${MAX_POSTS_PER_RUN})`);
      break;
    }

    console.log(`\n📤 نشر ${coin}...`);

    try {
      // 3أ. توليد الشارت
      const chartPath = await generateChartForCoin(coin, TIMEFRAME);
      if (!chartPath) {
        console.log(`  ❌ فشل توليد الشارت`);
        continue;
      }

      // 3ب. بناء النص
      const message = buildSignalMessage(signal, coin, TIMEFRAME);

      // 3ج. إرسال الصورة مع النص
      const success = await sendPhoto(chartPath, message);

      if (success) {
        console.log(`  ✅ تم النشر`);
        markAsPosted(postedData, coin, signal.fvg_idx, signal.entry_idx);
        publishedCount++;
      } else {
        console.log(`  ❌ فشل الإرسال`);
      }

      // انتظار بين الرسائل
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.error(`  ❌ خطأ: ${error.message}`);
    }
  }

  // 4. حفظ Setups المُرسلة
  savePostedSetups(postedData);
  console.log(`\n💾 تم حفظ ${postedData.setups.length} Setup`);

  console.log('\n' + '='.repeat(60));
  console.log(`🎉 اكتمل: ${publishedCount} منشور`);
}

// تشغيل
main().catch(error => {
  console.error('❌ خطأ عام:', error);
  process.exit(1);
});
