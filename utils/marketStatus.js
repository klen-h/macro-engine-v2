import { getChinaMarketStatus } from './chinaMarket.js';

export const URGENT_TIME_KEYWORDS = [
  '几小时内', '即将', '马上', '立刻', '立即',
  '倒计时', '最后期限', '最后通牒',
  '周一早上', '周二', '明天', '今晚',
  '行动开始', '行动将在', '启动.*行动',
  '几小时', '数小时内', '接下来',
];

export function formatTime() {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

export function hasUrgentTime(content) {
  return URGENT_TIME_KEYWORDS.some(kw => {
    if (kw.includes('.*')) return new RegExp(kw).test(content);
    return content.includes(kw);
  });
}

export function getMarketClock() {
  const now = new Date();
  const beijingHour = (now.getUTCHours() + 8) % 24;
  const beijingMinute = now.getUTCMinutes();
  const beijingTime = beijingHour * 60 + beijingMinute;

  const aStockMorning = beijingTime >= 570 && beijingTime < 690;
  const aStockAfternoon = beijingTime >= 780 && beijingTime < 900;
  const isAStockTrading = aStockMorning || aStockAfternoon;

  const isHSTechExtended = beijingTime >= 900 && beijingTime < 990;

  const nkMorning = beijingTime >= 480 && beijingTime < 630;
  const nkAfternoon = beijingTime >= 690 && beijingTime < 840;
  const isNikkeiTrading = nkMorning || nkAfternoon;

  const isUSTrading = beijingTime >= 1290 || beijingTime < 240;

  return {
    beijingTime: `${String(Math.floor(beijingTime / 60)).padStart(2, '0')}:${String(beijingTime % 60).padStart(2, '0')}`,
    isAStockTrading,
    isHSTechExtended,
    isNikkeiTrading,
    isUSTrading,
    isAsiaEquityClosed: !isAStockTrading && !isHSTechExtended && !isNikkeiTrading,
  };
}

// Re-export getChinaMarketStatus to be consistent with previous structure if needed, or update consumers
export { getChinaMarketStatus };