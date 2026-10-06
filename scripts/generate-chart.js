// scripts/generate-chart.js
// توليد صورة شارت من TradingView

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './charts';

/**
 * توليد صورة شارت لزوج عملة
 * @param {string} symbol - مثل BINANCE:BTCUSDT
 * @param {string} interval - مثل 60 (1h)
 * @param {string} outputPath - مسار الحفظ
 */
export async function generateChart(symbol, interval, outputPath) {
  // إنشاء المجلد
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { margin: 0; background: #0B0E11; }
      #tv { width: 1200px; height: 800px; }
    </style></head>
    <body>
    <div id="tv"></div>
    <script src="https://s3.tradingview.com/tv.js"></script>
    <script>
    new TradingView.widget({
      "container_id": "tv",
      "symbol": "${symbol}",
      "interval": "${interval}",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "width": 1200,
      "height": 800,
      "studies": [
        "RSI@tv-basicstudies",
        "STD;Supertrend"
      ],
      "hide_top_toolbar": false,
      "save_image": false
    });
    </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(12000);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  await page.screenshot({ path: outputPath });
  await browser.close();

  return outputPath;
}

/**
 * توليد شارت لعملة محددة
 * @param {string} coin - مثل BTC
 * @param {string} timeframe - مثل 1h
 * @returns {Promise<string|null>}
 */
export async function generateChartForCoin(coin, timeframe = '1h') {
  const symbol = `BINANCE:${coin}USDT`;
  const intervalMap = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
  };
  const interval = intervalMap[timeframe] || '60';

  const filename = `${coin.toLowerCase()}-${timeframe}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  try {
    console.log(`📊 توليد شارت ${coin} ${timeframe}...`);
    await generateChart(symbol, interval, outputPath);
    console.log(`  ✅ ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`  ❌ فشل ${coin}: ${error.message}`);
    return null;
  }
}
