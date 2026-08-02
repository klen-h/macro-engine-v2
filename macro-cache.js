/**
 * L3 国内基本面数据缓存与注入模块
 * 职责：从金十 fetchLevelData 接口提取 8+2 项核心指标，生成缓存，供 LLM Prompt 注入
 */
import path from 'path';
import { CONFIG } from './config.js';
import { fetchLevelData } from './api/fetchLevelData.js'; // 根据实际路径调整
import { loadJsonFile, saveJsonFile } from './utils/cacheManager.js';

const CACHE_FILE = path.join(process.cwd(), 'data', 'macro-cache.json');

// 8项核心 + 2项辅助的指标定义
const INDICATOR_MAP = CONFIG.MACRO_INDICATOR_MAP;

// 快讯关键词 → 触发指标key
const FLASH_KEYWORDS = CONFIG.MACRO_FLASH_KEYWORDS;

/**
 * 从 levelData 数组构建缓存
 */
export function buildMacroCache(levelData) {
  const cache = {
    updatedAt: new Date().toISOString(),
    indicators: {},
    snapshotText: '',
  };

  for (const item of levelData) {
    const meta = INDICATOR_MAP[item.type_id];
    if (!meta) continue;

    const d = item.data;
    const latest = d.latest_data || {};

    cache.indicators[meta.key] = {
      name: meta.name,
      unit: meta.unit,
      category: meta.category,
      actual: latest.actual,
      previous: latest.previous,
      consensus: latest.consensus,
      displayTime: item.display_time,
      nextPubTime: d.next_pub_time,
      history: d.chart_data?.slice(0, 12) || [],
    };
  }

  cache.snapshotText = generateSnapshotText(cache.indicators);
  
  saveJsonFile(CACHE_FILE, cache);
  
  console.log(`[macro-cache] 已生成缓存，共 ${Object.keys(cache.indicators).length} 项指标`);
  return cache;
}

/**
 * 直接从接口刷新缓存（推荐入口）
 */
export async function refreshMacroCache() {
  console.log('[macro-cache] 正在从接口刷新宏观数据...');
  const levelData = await fetchLevelData(CONFIG.JIN10_MACRO_CATEGORY_ID);
  
  if (levelData.length === 0) {
    console.error('[macro-cache] 接口拉取失败，尝试使用旧缓存');
    return loadMacroCache();
  }
  
  return buildMacroCache(levelData);
}

/**
 * 加载本地缓存
 */
export function loadMacroCache() {
  return loadJsonFile(CACHE_FILE, null);
}

/**
 * 生成完整的国内基本面快照文本
 */
function generateSnapshotText(indicators) {
  const lines = ['【国内基本面快照（最新公布）】'];
  const i = indicators;

  const fmt = (val, unit) => val !== null && val !== undefined ? `${val}${unit}` : '待公布';
  const cmp = (actual, consensus) => {
    if (actual == null || consensus == null) return '';
    const a = parseFloat(actual);
    const c = parseFloat(consensus);
    if (a > c) return '→ 好于预期';
    if (a < c) return '→ 低于预期';
    return '→ 符合预期';
  };
  const trend = (actual, previous) => {
    if (actual == null || previous == null) return '';
    const a = parseFloat(actual);
    const p = parseFloat(previous);
    if (a > p) return '，环比改善';
    if (a < p) return '，环比走弱';
    return '';
  };

  if (i.official_manufacturing_pmi) {
    const d = i.official_manufacturing_pmi;
    const comment = parseFloat(d.actual) < 50 ? '，落入收缩区间' : '';
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}${trend(d.actual, d.previous)}${comment}`);
  }
  if (i.non_manufacturing_pmi) {
    const d = i.non_manufacturing_pmi;
    const comment = parseFloat(d.actual) < 50 ? '，服务业同步降温' : '';
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}${trend(d.actual, d.previous)}${comment}`);
  }
  if (i.cpi_yoy) {
    const d = i.cpi_yoy;
    const comment = parseFloat(d.actual) < 1 ? '，通缩压力加大' : '';
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}${trend(d.actual, d.previous)}${comment}`);
  }
  if (i.ppi_mom) {
    const d = i.ppi_mom;
    const comment = parseFloat(d.actual) < 0 ? '，工业品价格环比转跌' : '';
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (前值${fmt(d.previous, d.unit)}) ${trend(d.actual, d.previous)}${comment}`);
  }
  if (i.m2_yoy) {
    const d = i.m2_yoy;
    const comment = parseFloat(d.actual) < parseFloat(d.previous) ? '，货币增速放缓' : '';
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}${trend(d.actual, d.previous)}${comment}`);
  }
  if (i.aggregate_financing) {
    const d = i.aggregate_financing;
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}`);
  }
  if (i.new_yuan_loans) {
    const d = i.new_yuan_loans;
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}`);
  }
  if (i.lpr_1y && i.lpr_5y) {
    const d1 = i.lpr_1y, d5 = i.lpr_5y;
    const unchanged = d1.actual === d1.previous && d5.actual === d5.previous;
    const comment = unchanged ? '货币政策按兵不动' : 'LPR出现调整';
    lines.push(`- LPR: 1年${fmt(d1.actual, d1.unit)}/5年${fmt(d5.actual, d5.unit)} (${comment})`);
  }
  if (i.gdp_yoy) {
    const d = i.gdp_yoy;
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}`);
  }
  if (i.industrial_added_value_yoy) {
    const d = i.industrial_added_value_yoy;
    lines.push(`- ${d.name}: ${fmt(d.actual, d.unit)} (预期${fmt(d.consensus, d.unit)}, 前值${fmt(d.previous, d.unit)}) ${cmp(d.actual, d.consensus)}`);
  }

  return lines.join('\n');
}

/**
 * 事件触发：检测快讯内容是否涉及国内基本面指标
 */
export function matchDomesticIndicator(flashContent) {
  if (!flashContent) return [];
  const matchedKeys = new Set();
  
  for (const [keyword, keys] of Object.entries(FLASH_KEYWORDS)) {
    if (flashContent.includes(keyword)) {
      keys.forEach(k => matchedKeys.add(k));
    }
  }
  
  const cache = loadMacroCache();
  if (!cache) return [];
  
  const results = [];
  for (const key of matchedKeys) {
    const ind = cache.indicators[key];
    if (ind) {
      results.push({
        key,
        name: ind.name,
        actual: ind.actual,
        consensus: ind.consensus,
        previous: ind.previous,
        unit: ind.unit,
        displayTime: ind.displayTime,
      });
    }
  }
  return results;
}

/**
 * 获取注入 Prompt 的国内基本面段落
 * @param {Array} clusteredItems - 当前待分析的事件簇
 * @param {boolean} forceFull - 是否强制输出完整快照（开盘前模式）
 */
export function getDomesticSnapshotForPrompt(clusteredItems = [], forceFull = false) {
  const cache = loadMacroCache();
  if (!cache) return '【国内基本面快照】数据缓存未初始化。';

  if (forceFull) {
    return cache.snapshotText;
  }

  const matchedIndicators = new Map();
  for (const item of clusteredItems) {
    const contents = item._allItems 
      ? item._allItems.map(i => i.content) 
      : [item.content];
    for (const content of contents) {
      const matches = matchDomesticIndicator(content);
      for (const m of matches) {
        matchedIndicators.set(m.key, m);
      }
    }
  }

  if (matchedIndicators.size === 0) {
    return cache.snapshotText; // 无直接触发也返回背景数据
  }

  const lines = ['【国内基本面快照（事件触发更新）】'];
  for (const ind of matchedIndicators.values()) {
    const actual = ind.actual !== null ? `${ind.actual}${ind.unit}` : '待公布';
    const consensus = ind.consensus !== null ? `${ind.consensus}${ind.unit}` : '无';
    const previous = ind.previous !== null ? `${ind.previous}${ind.unit}` : '无';
    lines.push(`- ${ind.name}: 实际${actual} | 预期${consensus} | 前值${previous}`);
  }
  return lines.join('\n');
}

/**
 * 生成"预期 vs 实际"对比段落（用于快讯触发时的详细注入）
 */
export function getTriggeredComparison(clusteredItems) {
  const matched = new Map();
  for (const item of clusteredItems) {
    const contents = item._allItems ? item._allItems.map(i => i.content) : [item.content];
    for (const content of contents) {
      const matches = matchDomesticIndicator(content);
      for (const m of matches) matched.set(m.key, m);
    }
  }
  
  if (matched.size === 0) return '';
  
  const lines = ['【本次事件涉及指标对比】'];
  for (const m of matched.values()) {
    const a = m.actual !== null ? `${m.actual}${m.unit}` : '?';
    const c = m.consensus !== null ? `${m.consensus}${m.unit}` : '?';
    const p = m.previous !== null ? `${m.previous}${m.unit}` : '?';
    const beat = m.actual !== null && m.consensus !== null 
      ? (parseFloat(m.actual) > parseFloat(m.consensus) ? '✅好于预期' : '❌低于预期')
      : '';
    lines.push(`- ${m.name}: 实际${a} vs 预期${c} vs 前值${p} ${beat}`);
  }
  return '\n' + lines.join('\n');
}