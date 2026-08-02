/**
 * A股IPO日历 - 独立接口模块
 * 职责：拉取打新日历，计算当日/近期IPO募资规模，评估流动性抽血压力
 * 触发条件：单日IPO募资>100亿 → L5流动性紧张信号
 */
import axios from 'axios';
import { CONFIG } from '../config.js';

const IPO_API_URL = 'https://mp-api.jin10.com/api/dynamic-data/child?tb_name=_vir_158&order=date%2Cdesc&limit=100';

/**
 * 拉取IPO日历数据
 */
export async function fetchIPOCalendar() {
  try {
    const { data } = await axios.get(IPO_API_URL, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'origin': 'https://www.jin10.com',
        'referer': 'https://www.jin10.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-app-id': 'fiXF2nOnDycGutVA',
        'x-version': '1.0',
        'cookie': CONFIG.FLASH_COOKIE
      },
      timeout: 30000
    });

    if (!Array.isArray(data.data)) {
      console.error('[ipo-calendar] 返回格式异常:', typeof data.data);
      return [];
    }
    return data.data;
  } catch (e) {
    console.error('[ipo-calendar] 拉取失败:', e.message);
    return [];
  }
}

/**
 * 解析原始IPO数据，按日期聚合，计算募资规模
 * @param {Array} rawData - fetchIPOCalendar 返回的原始数组
 */
export function parseIPOData(rawData) {
  const result = {
    updatedAt: new Date().toISOString(),
    today: {},           // 今日IPO
    next7Days: [],       // 未来7天
    next30Days: [],      // 未来30天
    warningLevel: 'green', // green/yellow/red
    totalKnownNext7d: 0,
    totalUnknownNext7d: 0,
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayBJ = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
    .toISOString().slice(0, 10);

  // date_type 映射
  const typeMap = { 1: '申购', 2: '缴款', 3: '上市', 4: '询价', 5: '其他' };

  // 按日期分组
  const byDate = new Map();
  for (const item of rawData) {
    const date = item.date;
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push(item);
  }

  // 分析每一天
  for (const [date, items] of byDate) {
    // 只关注申购(1)和上市(3)，这两个是真正抽血的日子
    const bloodDays = items.filter(i => i.date_type === 1 || i.date_type === 3);
    if (bloodDays.length === 0) continue;

    let knownSize = 0;
    let unknownCount = 0;
    const stocks = [];

    for (const item of bloodDays) {
      const extra = item.extra || {};
      const size = extra.ipo_size;
      const type = typeMap[item.date_type] || '未知';
      
      stocks.push({
        code: item.code,
        name: item.name,
        type,
        size,
        price: extra.issue_price,
        qty: extra.issue_qty,
        instPart: extra.inst_part, // 机构配售比例
      });

      if (size) {
        knownSize += size;
      } else {
        unknownCount++;
      }
    }

    const dayInfo = {
      date,
      knownSize: parseFloat(knownSize.toFixed(2)),
      unknownCount,
      stockCount: stocks.length,
      stocks,
    };

    // 分类
    if (date === todayBJ) {
      result.today = dayInfo;
    }

    const d = new Date(date);
    const now = new Date(todayBJ);
    const diffDays = (d - now) / (1000 * 60 * 60 * 24);

    if (diffDays >= 0 && diffDays <= 7) {
      result.next7Days.push(dayInfo);
      result.totalKnownNext7d += knownSize;
      result.totalUnknownNext7d += unknownCount;
    }
    if (diffDays >= 0 && diffDays <= 30) {
      result.next30Days.push(dayInfo);
    }
  }

  // 预警级别判断
  if (result.totalKnownNext7d >= 100) {
    result.warningLevel = 'red';
  } else if (result.totalKnownNext7d >= 50 || result.totalUnknownNext7d >= 3) {
    // 待定3只以上可能隐藏大IPO，升黄灯
    result.warningLevel = 'yellow';
  }

  // 按日期排序
  result.next7Days.sort((a, b) => a.date.localeCompare(b.date));
  result.next30Days.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * 生成L5可用的IPO快照文本
 */
export function generateIPOSnapshot(parsed) {
  const lines = ['【IPO日历 & 流动性抽血预警】'];

  // 今日
  if (parsed.today?.stockCount > 0) {
    const t = parsed.today;
    const flag = t.knownSize >= 100 ? '🔴' : (t.knownSize >= 50 ? '🟡' : '🟢');
    lines.push(`- 今日${flag}: ${t.stockCount}只IPO，已知募资${t.knownSize}亿元`);
    for (const s of t.stocks) {
      lines.push(`  · ${s.name}(${s.code}): ${s.type}${s.size ? ',' + s.size + '亿' : ',规模待定'}`);
    }
  } else {
    lines.push('- 今日: 无申购/上市');
  }

  // 未来7天预警
  if (parsed.next7Days.length > 0) {
    const hasBig = parsed.next7Days.some(d => d.knownSize >= 50);
    if (hasBig || parsed.warningLevel !== 'green') {
      lines.push(`- 未来7日预警级别: ${parsed.warningLevel === 'red' ? '🔴高' : '🟡中'} (合计已知${parsed.totalKnownNext7d}亿)`);
      for (const d of parsed.next7Days) {
        if (d.date === parsed.today?.date) continue; // 跳过今日（已显示）
        if (d.knownSize >= 50 || d.unknownCount > 0) {
          const flag = d.knownSize >= 100 ? '🔴' : (d.knownSize >= 50 ? '🟡' : '');
          lines.push(`  · ${d.date}${flag}: ${d.stockCount}只，已知${d.knownSize}亿${d.unknownCount > 0 ? ',待定' + d.unknownCount + '只' : ''}`);
        }
      }
    } else {
      lines.push(`- 未来7日: 🟢无大额IPO (合计已知${parsed.totalKnownNext7d}亿)`);
    }
  }

  // 触发条件判断
  const todaySize = parsed.today?.knownSize || 0;
  if (todaySize >= 100) {
    lines.push(`⚠️ 触发L5紧张条件：今日IPO募资${todaySize}亿 > 100亿警戒线`);
  } else if (parsed.totalKnownNext7d >= 100) {
    lines.push(`⚠️ 触发L5预警：未来7日IPO合计${parsed.totalKnownNext7d}亿 > 100亿`);
  }

  return lines.join('\n');
}

/**
 * 快讯关键词匹配IPO
 */
export function matchIPOKeyword(flashContent) {
  if (!flashContent) return false;
  const keywords = ['IPO', '新股发行', '打新', '申购', '上市', '募资', '解禁', '新股'];
  return keywords.some(kw => flashContent.includes(kw));
}