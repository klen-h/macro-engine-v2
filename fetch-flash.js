/**
 * 快讯实时监控 - 五层因子并行诊断引擎
 */

import axios from 'axios';
import { CONFIG } from './config.js';
import { fetchSinaMacro } from './macro-layer.js';
import { loadState, saveState, saveRawData, saveAnalysis, savePrediction, saveMacroSnapshot, loadMacroSnapshot, saveHoldingsSnapshot, loadHoldingsSnapshot } from './storage.js';
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
    if (holdingsData.length > 0) {
      saveHoldingsSnapshot(holdingsData);
      console.log(`   获取到 ${holdingsData.length} 个ETF行情（已缓存快照）`);
    } else {
      const cachedHoldings = loadHoldingsSnapshot(4 * 60 * 60 * 1000);
      if (cachedHoldings && cachedHoldings.length > 0) {
        holdingsData = cachedHoldings;
        console.log(`   ⚠️ ETF实时数据为空，使用缓存快照（${holdingsData.length}条）`);
      } else {
        console.log(`   获取到 0 个ETF行情`);
      }
    }
  } catch (e) {
    console.log('⚠️ ETF数据获取失败:', e.message);
    const cachedHoldings = loadHoldingsSnapshot(4 * 60 * 60 * 1000);
    if (cachedHoldings && cachedHoldings.length > 0) {
      holdingsData = cachedHoldings;
      console.log(`   ⚠️ 回退到ETF缓存快照（${holdingsData.length}条）`);
    }
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
    try {
      macro = await fetchSinaMacro();
      const hasValidPrice = macro && (
        (macro.crude && macro.crude.price > 0) ||
        (macro.dxy && macro.dxy.price > 0) ||
        (macro.us10yt && macro.us10yt.price > 0)
      );
      if (hasValidPrice) {
        saveMacroSnapshot(macro);
        console.log('   ✅ 宏观数据获取成功（已缓存快照）');
      } else {
        console.log('   ⚠️ 宏观数据接口返回值异常，尝试使用缓存快照');
        const cached = loadMacroSnapshot(6 * 60 * 60 * 1000);
        if (cached) {
          macro = cached;
          console.log('   ✅ 已回退到宏观缓存快照');
        } else {
          console.log('   ❌ 无有效缓存可用，将使用零值默认数据继续');
        }
      }
    } catch (err) {
      console.error('   ❌ fetchSinaMacro 异常:', err.message);
      const cached = loadMacroSnapshot(6 * 60 * 60 * 1000);
      if (cached) {
        macro = cached;
        console.log('   ✅ 异常已捕获，已回退到宏观缓存快照');
      } else {
        console.log('   ❌ 无缓存可用，将使用零值默认数据继续');
      }
    }
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