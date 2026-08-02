/**
 * L5 A股流动性因子 - 数据缓存与注入模块
 * 职责：从金十 52037 类别提取融资余额、成交额、南向资金等核心流动性指标
 * 原则：只接结构化数值，图片/新闻类数据 = 噪音，不进入缓存
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { CONFIG } from './config.js';
import { loadJsonFile, saveJsonFile } from './utils/cacheManager.js';
import { formatValueWithUnit as fmt, calculateAverage as avg, analyzeTrend } from './utils/formatter.js';

import {
  fetchIPOCalendar,
  parseIPOData,
  generateIPOSnapshot,
  matchIPOKeyword
} from './api/fetch-ipo-calendar.js';

const CACHE_FILE = path.join(process.cwd(), 'data', 'l5-cache.json');

// L5 核心指标映射（52037 类别下）
const INDICATOR_MAP = CONFIG.L5_INDICATOR_MAP;

// 快讯关键词 → 触发 L5 指标
const FLASH_KEYWORDS = CONFIG.L5_FLASH_KEYWORDS;

/**
 * 直接从 52037 接口拉取并构建缓存
 */
export async function refreshL5Cache() {
  console.log('[l5-cache] 正在刷新 A股流动性数据...');
  try {
    const { data } = await axios.get(
      CONFIG.API_ENDPOINTS.JIN10_L5_LIQUIDITY,
      {
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
      }
    );

    if (!Array.isArray(data.data)) {
      console.error('[l5-cache] 返回格式异常');
      return loadL5Cache();
    }

    return buildL5Cache(data.data);
  } catch (e) {
    console.error('[l5-cache] 接口拉取失败:', e.message);
    return loadL5Cache();
  }
}

/**
 * 从 levelData 数组构建 L5 缓存
 */
export async function buildL5Cache(levelData) {
  const cache = {
    updatedAt: new Date().toISOString(),
    indicators: {},
    ipo: null,
    snapshotText: '',
  };

  for (const item of levelData) {
    const meta = INDICATOR_MAP[item.type_id];
    if (!meta) continue;

    const d = item.data;

    if (item.type_id === 550105 || item.type_id === 550059) {
      // 融资融券 / 成交额：有 value + chart_data + table_data
      const history = d.chart_data || [];
      const table = d.table_data || [];
      const latest = table[0] || {};
      const prev = table[1] || {};

      cache.indicators[meta.key] = {
        name: meta.name,
        unit: meta.unit,
        category: meta.category,
        value: d.value,
        date: d.date,
        history: history.slice(0, 15),
        latest: { sh: latest.sh, sz: latest.sz, value: latest.value, date: latest.date },
        previous: { sh: prev.sh, sz: prev.sz, value: prev.value, date: prev.date },
      };
    } else if (item.type_id === 550097) {
      // 南向资金：sh + sz 直接给出
      cache.indicators[meta.key] = {
        name: meta.name,
        unit: meta.unit,
        category: meta.category,
        sh: d.sh,
        sz: d.sz,
        total: (d.sh || 0) + (d.sz || 0),
        date: d.date,
      };
    }
  }

    // ===== 新增：拉取IPO日历 =====
  try {
    const ipoRaw = await fetchIPOCalendar();
    if (ipoRaw.length > 0) {
      cache.ipo = parseIPOData(ipoRaw);
      console.log(`[l5-cache] IPO数据已接入，未来7日已知募资${cache.ipo.totalKnownNext7d}亿`);
    }
  } catch (e) {
    console.log('[l5-cache] IPO日历拉取失败，跳过');
  }
  // =============================

  cache.snapshotText = generateL5Snapshot(cache.indicators, cache.ipo);

  saveJsonFile(CACHE_FILE, cache);

  console.log(`[l5-cache] 已生成，${Object.keys(cache.indicators).length} 项指标`);
  return cache;
}

export function loadL5Cache() {
  return loadJsonFile(CACHE_FILE, null);
}

/**
 * 生成 L5 流动性快照文本
 */
function generateL5Snapshot(indicators, ipoData = null) {
  const lines = ['【A股流动性快照（L5）】'];
  const i = indicators;

  // 1. 融资余额
  if (i.margin_trading) {
    const d = i.margin_trading;
    const change = d.latest.value && d.previous.value
      ? d.latest.value - d.previous.value
      : null;
    const changePct = change !== null
      ? (change / d.previous.value * 100).toFixed(2)
      : null;
    const trend = analyzeTrend(d.history);
    const signal = change !== null && change < -100
      ? '⚠️杠杆资金撤退'
      : (change !== null && change > 100 ? '杠杆加仓' : '平稳');

    lines.push(`- ${d.name}: ${fmt(d.latest.value, d.unit)} (前日${fmt(d.previous.value, d.unit)})`);
    lines.push(`  日变化: ${fmt(change, d.unit, true)} (${fmt(changePct, '%', true)}) | ${trend} | ${signal}`);
  }

  // 2. 成交额
  if (i.turnover) {
    const d = i.turnover;
    const change = d.latest.value && d.previous.value
      ? d.latest.value - d.previous.value
      : null;
    const changePct = change !== null
      ? (change / d.previous.value * 100).toFixed(2)
      : null;
    const hist = d.history.filter(v => v !== undefined && v !== null);
    const ma5 = hist.length >= 5 ? avg(hist.slice(-5)) : null;
    const vsMa5 = ma5 && d.latest.value
      ? ((d.latest.value - ma5) / ma5 * 100).toFixed(1)
      : null;
    const lowThreshold = 20000; // 2万亿地量线
    const isLow = d.latest.value && d.latest.value < lowThreshold;

    lines.push(`- ${d.name}: ${fmt(d.latest.value, d.unit)} (前日${fmt(d.previous.value, d.unit)})`);
    lines.push(`  日变化: ${fmt(change, d.unit, true)} (${fmt(changePct, '%', true)}) | 5日均量${fmt(ma5, d.unit)} ${vsMa5 ? (vsMa5 > 0 ? '+' : '') + vsMa5 + '%' : ''}`);
    if (isLow) lines.push(`  ⚠️低于2万亿地量线，流动性偏紧`);
  }

  // 3. 南向资金
  if (i.southbound) {
    const d = i.southbound;
    const signal = d.total < -10 ? '⚠️大幅净流出' : (d.total < 0 ? '小幅净流出' : '净流入');
    lines.push(`- ${d.name}: ${fmt(d.total, d.unit, true)} (沪股通${fmt(d.sh, d.unit, true)} + 深股通${fmt(d.sz, d.unit, true)}) | ${signal}`);
  }

  // ===== 新增：IPO日历 =====
  if (ipoData) {
    lines.push('');
    lines.push(generateIPOSnapshot(ipoData));
  } else {
    lines.push('- IPO/解禁: 数据未获取');
  }

  return lines.join('\n');
}

/**
 * 事件触发：检测快讯是否涉及 L5 流动性指标
 */
export function matchL5Indicator(flashContent) {
  if (!flashContent) return [];
  const matchedKeys = new Set();
  for (const [kw, keys] of Object.entries(FLASH_KEYWORDS)) {
    if (flashContent.includes(kw)) keys.forEach(k => matchedKeys.add(k));
  }

  const cache = loadL5Cache();
  if (!cache) return [];

  const results = [];
  for (const key of matchedKeys) {
    const ind = cache.indicators[key];
    if (ind) {
      results.push({
        key,
        name: ind.name,
        value: ind.latest?.value ?? ind.total ?? ind.value,
        unit: ind.unit,
      });
    }
  }
  return results;
}

/**
 * 获取注入 Prompt 的 L5 段落
 */
export function getL5SnapshotForPrompt(clusteredItems = [], forceFull = false) {
  const cache = loadL5Cache();
  if (!cache) return '【A股流动性快照】L5缓存未初始化。';

  if (forceFull) return cache.snapshotText;

  // 事件触发检查（原有L5指标 + 新增IPO）
  const matched = new Map();
  let hasIPO = false;
  for (const item of clusteredItems) {
    const contents = item._allItems ? item._allItems.map(i => i.content) : [item.content];
    for (const c of contents) {
      matchL5Indicator(c).forEach(m => matched.set(m.key, m));
      if (matchIPOKeyword(c)) hasIPO = true;
    }
  }

  if (matched.size === 0 && !hasIPO) return cache.snapshotText;

  // 有触发，追加对比
  const lines = [cache.snapshotText, ''];
  if (matched.size > 0) {
    lines.push('【本次事件涉及L5指标】');
    for (const m of matched.values()) {
      lines.push(`- ${m.name}: ${m.value}${m.unit}`);
    }
  }
  if (hasIPO && cache.ipo) {
    lines.push('【本次事件涉及IPO】');
    lines.push(generateIPOSnapshot(cache.ipo));
  }
  return lines.join('\n');
}

// ===== 辅助函数 =====已移除，使用utils/formatter.js