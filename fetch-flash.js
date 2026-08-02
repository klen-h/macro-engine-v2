/**
 * 快讯实时监控 - 五层因子并行诊断引擎
 */

import axios from 'axios';
import { CONFIG } from './config.js';
import { fetchSinaMacro } from './macro-layer.js';
import { loadState, saveState, saveRawData, saveAnalysis, savePrediction } from './storage.js';
import {
  refreshMacroCache,
  loadMacroCache,
} from './macro-cache.js';
import {
  refreshL5Cache,
  loadL5Cache,
} from './l5-liquidity-cache.js';
import { formatTime } from './utils/marketStatus.js';
import {
  getNewItems,
  preFilter,
  deduplicateByEvent,
  isMajorUpdate,
} from './services/flashProcessor.js';
import { fetchJin10 } from './services/flashService.js';
import {
  analyzeWithLLM,
  postFilterCompliance
} from './services/llmService.js';
import { getMarketData } from './data-layer.js';
import { pushWechat, pushWechatComparison, updateStateAfterPush } from './services/notificationService.js';

async function main() {
  console.log(`\n[${formatTime()}] 🚀 金十快讯监控启动 [五层因子并行诊断模式]`);

  // ===== 每日开盘前刷新宏观缓存 =====
  const bjNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const bjHour = bjNow.getHours();
  const isPreMarket = bjHour >= 8 && bjHour <= 9;

  if (isPreMarket || !loadMacroCache()) await refreshMacroCache();
  if (isPreMarket || !loadL5Cache()) await refreshL5Cache();   // ← 新增
  // ===================================

  const items = await fetchJin10();
  if (items.length === 0) {
    console.log('❌ 未获取到数据');
    return;
  }

  const newItems = getNewItems(items);
  if (newItems.length === 0) {
    console.log('⏭️ 无新增快讯');
    return;
  }
  console.log(`📥 新增 ${newItems.length} 条`);

  const filtered = preFilter(newItems);
  console.log(`🔍 硬过滤后: ${filtered.length} 条`);

  const clustered = deduplicateByEvent(filtered);
  console.log(`📦 聚合为 ${clustered.length} 个事件簇`);
  clustered.forEach(c => {
    // Removed hasUrgentTime(c.content) check as it will be moved
    console.log(`   ${c._clusterHot === '爆' ? '🔴' : '🔵'} ${c._cluster} (${c._clusterSize}条)`);
  });

  console.log('📈 拉取宏观与ETF行情数据...');
  let marketData = null;
  let holdingsData = [];
  try {
    marketData = await getMarketData();
    holdingsData = marketData?.holdings || [];
    console.log(`   获取到 ${holdingsData.length} 个ETF行情`);
  } catch (e) {
    console.log('⚠️ ETF数据获取失败');
  }

  const state = loadState();
  const toAnalyze = [];
  const toUpdate = [];

  for (const cluster of clustered) {
    const existing = state.pushedClusters?.find(p => p.cluster === cluster._cluster);

    if (!existing) {
      toAnalyze.push(cluster);
      console.log(`   🆕 新事件: ${cluster._cluster}`);
    } else if (cluster.hot === '爆' && existing.pushCount === 0) {
      console.log(`   🔥 ${cluster._cluster} 升级为"爆"，补推`);
      toAnalyze.push(cluster);
    } else if (isMajorUpdate(cluster, existing)) {
      console.log(`   ⏰ ${cluster._cluster} 重大更新，重新推送`);
      toAnalyze.push(cluster);
    } else {
      toUpdate.push({ cluster: cluster._cluster, lastId: cluster.id });
    }
  }

  let macro = null;
  if (toAnalyze.length > 0) {
    macro = await fetchSinaMacro();
    console.log(`🧠 送审 LLM: ${toAnalyze.length} 个事件簇`);
    const analysis = await analyzeWithLLM(toAnalyze, macro, holdingsData);
    const filteredAnalysis = postFilterCompliance(analysis);
    await pushWechat(filteredAnalysis, toAnalyze, macro, holdingsData);
    savePrediction(filteredAnalysis, holdingsData);
    updateStateAfterPush(state, toAnalyze);
  } else {
    console.log('📭 无新事件需分析，静默');
  }

  for (const update of toUpdate) {
    const existing = state.pushedClusters?.find(p => p.cluster === update.cluster);
    if (existing) {
      existing.lastUpdateId = update.lastId;
      existing.lastUpdateTime = new Date().toISOString();
    }
  }

  saveState(state);
  saveRawData(items, newItems);
  if (toAnalyze.length > 0) {
    saveAnalysis(toAnalyze);
  }

  console.log(`[${formatTime()}] ✅ 完成\n`);
}

main().catch(err => {
  console.error('脚本异常:', err);
  process.exit(1);
});