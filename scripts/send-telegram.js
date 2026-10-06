// scripts/send-telegram.js
// إرسال الرسائل والصور إلى Telegram

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * الحصول على Token و Chat ID من البيئة
 */
function getCredentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN غير موجود');
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID غير موجود');

  return { token, chatId };
}

/**
 * إرسال رسالة نصية
 */
export async function sendMessage(text, parseMode = 'HTML') {
  const { token, chatId } = getCredentials();
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }, { timeout: 30000 });

    if (response.data.ok) {
      console.log('✅ تم إرسال الرسالة');
      return true;
    }
    console.error(`❌ فشل: ${response.data.description}`);
    return false;
  } catch (error) {
    console.error(`❌ خطأ: ${error.message}`);
    return false;
  }
}

/**
 * إرسال صورة مع نص
 */
export async function sendPhoto(imagePath, caption = '') {
  const { token, chatId } = getCredentials();
  const url = `${TELEGRAM_API}/bot${token}/sendPhoto`;

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ الصورة غير موجودة: ${imagePath}`);
    return false;
  }

  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', fs.createReadStream(imagePath));
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (response.data.ok) {
      console.log('✅ تم إرسال الصورة');
      return true;
    }
    console.error(`❌ فشل: ${response.data.description}`);
    return false;
  } catch (error) {
    console.error(`❌ خطأ: ${error.message}`);
    return false;
  }
}

/**
 * بناء نص الإشارة
 */
export function buildSignalMessage(signal, coin, timeframe) {
  const { type, entry_price, sl_price, tp_price, sl_pct, tp_pct, rr } = signal;

  const emoji = type === 'LONG' ? '🟢' : '🔴';
  const typeAr = type === 'LONG' ? 'شراء' : 'بيع';
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return `${emoji} <b>إشارة جديدة</b> — <b>${coin}/USDT</b>
━━━━━━━━━━━━━━━━━━━━━
📊 <b>النوع:</b> ${typeAr} (${type})
💰 <b>سعر الدخول:</b> $${entry_price.toFixed(4)}
🛑 <b>وقف الخسارة:</b> $${sl_price.toFixed(4)} (${sl_pct.toFixed(2)}%)
🎯 <b>الهدف:</b> $${tp_price.toFixed(4)} (${tp_pct.toFixed(2)}%)
⚖️ <b>R:R</b> = ${rr.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>التوقيت:</b> ${now} UTC
📈 <b>الفريم:</b> ${timeframe}
🎯 <b>الاستراتيجية:</b> SMC

⚠️ <b>إدارة المخاطر:</b>
• لا تخاطر بأكثر من 1-2% من رأس المال
• استخدم وقف الخسارة دائماً
• هذه ليست نصيحة مالية

#${coin} #Crypto #Trading`;
}
