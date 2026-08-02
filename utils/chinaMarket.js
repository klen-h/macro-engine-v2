import { loadJsonFile } from './cacheManager.js';
import path from 'path';

// ========== A股交易状态判断 (动态节假日版，北京时间) ==========
/**
 * 获取A股市场当前交易状态
 * @returns {Object} { isOpen: boolean, reason: string }
 */
export function getChinaMarketStatus() {
  // ===== 强制使用北京时间 (UTC+8) =====
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  
  const year = beijingTime.getFullYear();
  const month = beijingTime.getMonth() + 1;
  const date = beijingTime.getDate();
  const day = beijingTime.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const hour = beijingTime.getHours();
  const minute = beijingTime.getMinutes();
  const time = hour * 100 + minute;
  
  // ===== 1. 节假日休市判断 (优先于周末) =====
  const holidaysFile = path.join(process.cwd(), 'config', 'holidays.json');
  const holidays = loadJsonFile(holidaysFile, {});
  const yearHolidays = holidays[year.toString()] || [];

  for (const holiday of yearHolidays) {
    const [startMonth, startDate] = holiday.start.split('-').map(Number);
    const [endMonth, endDate] = holiday.end.split('-').map(Number);
    
    // Simple check assuming holidays don't cross years in this format
    if (
      (month > startMonth || (month === startMonth && date >= startDate)) &&
      (month < endMonth || (month === endMonth && date <= endDate))
    ) {
      return { isOpen: false, reason: holiday.name };
    }
  }
  
  // ===== 2. 周末休市判断 =====
  if (day === 0 || day === 6) {
    return { isOpen: false, reason: '周末休市' };
  }
  
  // ===== 3. 交易时段判断 =====
  // A股交易时间规则：
  // - 开盘集合竞价：9:15-9:25
  // - 上午连续竞价：9:30-11:30
  // - 午间休市：11:30-13:00
  // - 下午连续竞价：13:00-14:57
  // - 收盘集合竞价：14:57-15:00 (深市/创业板/科创板)
  
  if (time < 915) {
    return { isOpen: false, reason: '未开盘 (9:15前)' };
  }
  
  if (time >= 915 && time < 925) {
    return { isOpen: true, reason: '开盘集合竞价中 (9:15-9:25)' };
  }
  
  if (time >= 925 && time <= 1130) {
    return { isOpen: true, reason: '上午交易中 (9:25-11:30)' };
  }
  
  if (time > 1130 && time < 1300) {
    return { isOpen: false, reason: '午间休市 (11:30-13:00)' };
  }
  
  if (time >= 1300 && time < 1457) {
    return { isOpen: true, reason: '下午交易中 (13:00-14:57)' };
  }
  
  if (time >= 1457 && time <= 1500) {
    return { isOpen: true, reason: '收盘集合竞价中 (14:57-15:00)' };
  }
  
  if (time > 1500) {
    return { isOpen: false, reason: '已收盘 (15:00后)' };
  }
  
  return { isOpen: false, reason: '未知状态' };
}