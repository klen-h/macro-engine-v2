/**
 * 通用格式化工具函数
 */

/**
 * 格式化数值，带单位和符号
 * @param {number|string|null|undefined} val - 要格式化的值
 * @param {string} unit - 单位，如 '%'，'亿元'
 * @param {boolean} [signed=false] - 是否强制显示正负号（对于正数显示 '+'）
 * @returns {string} 格式化后的字符串
 */
export function formatValueWithUnit(val, unit, signed = false) {
  if (val === null || val === undefined) return 'N/A';
  
  let formattedNumber = val;
  if (typeof val === 'number') {
    formattedNumber = val.toFixed(2).replace(/\.00$/, '');
  }
  
  const prefix = signed && typeof val === 'number' && val > 0 ? '+' : '';
  return `${prefix}${formattedNumber}${unit}`;
}

/**
 * 计算数组的平均值
 * @param {Array<number>} arr - 数值数组
 * @returns {number|null} 平均值，数组为空时返回 null
 */
export function calculateAverage(arr) {
  if (!arr || arr.length === 0) return null;
  const validArr = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validArr.length === 0) return null;
  return validArr.reduce((a, b) => a + b, 0) / validArr.length;
}

/**
 * 分析数值历史趋势
 * @param {Array<number>} history - 历史数值数组（按时间从早到晚排序）
 * @returns {string} 趋势描述
 */
export function analyzeTrend(history) {
  if (!history || history.length < 5) return '趋势不明';
  const recent = history.slice(-5);
  const up = recent.filter((v, i) => i > 0 && v > recent[i - 1]).length;
  const down = recent.filter((v, i) => i > 0 && v < recent[i - 1]).length;
  
  if (down >= 4) return '连续下降';
  if (up >= 4) return '连续上升';
  if (down > up) return '偏弱';
  if (up > down) return '偏强';
  return '震荡';
}