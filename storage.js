import { CONFIG } from './config.js';
import { loadJsonFile, saveJsonFile, ensureDirForFile } from './utils/cacheManager.js';

export function loadState() {
  return loadJsonFile(CONFIG.PATHS.STATE, { lastId: '', pushedClusters: [] });
}

export function saveState(state) {
  saveJsonFile(CONFIG.PATHS.STATE, state);
}

export function saveRawData(allItems, newItems) {
  let history = loadJsonFile(CONFIG.PATHS.RAW, { date: '', items: [] });

  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const existingIds = new Set(history.items.map(i => i.id));
  const uniqueNew = newItems.filter(i => !existingIds.has(i.id));

  history.items = [...uniqueNew, ...history.items].slice(0, 300);
  history.date = today;
  history.lastUpdated = new Date().toISOString();

  saveJsonFile(CONFIG.PATHS.RAW, history);
}

export function saveAnalysis(analyzedItems) {
  let history = loadJsonFile(CONFIG.PATHS.ANALYSIS, { analyses: [] });

  history.analyses.unshift({
    time: new Date().toISOString(),
    clusters: analyzedItems.map(i => ({
      cluster: i._cluster,
      hot: i._clusterHot,
      size: i._clusterSize,
      content: i.content.slice(0, 100),
    }))
  });

  history.analyses = history.analyses.slice(0, 50);
  saveJsonFile(CONFIG.PATHS.ANALYSIS, history);
}

export function saveETFClose(holdings) {
  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const newData = {
    date: today,
    timestamp: new Date().toISOString(),
    holdings: holdings.map(h => ({
      name: h.name,
      code: h.code,
      price: h.price,
      prevClose: h.prevClose,
      change: h.change,
      changeStr: h.changeStr
    }))
  };

  let history = loadJsonFile(CONFIG.PATHS.ETF_CLOSE, []);

  if (Array.isArray(history)) {
    history = history.filter(d => d.date !== today);
  }

  history.unshift(newData);
  history = history.slice(0, 30);
  saveJsonFile(CONFIG.PATHS.ETF_CLOSE, history);
}

export function loadETFClose() {
  const data = loadJsonFile(CONFIG.PATHS.ETF_CLOSE, null);
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data;
}

export function loadETFCloseHistory(days = 7) {
  const data = loadJsonFile(CONFIG.PATHS.ETF_CLOSE, []);
  if (Array.isArray(data)) {
    return data.slice(0, days);
  }
  return data ? [data] : [];
}

// ==================== 预测记录（新增）====================
export function savePrediction(analysis, holdingsData) {
  let predictions = loadJsonFile(CONFIG.PATHS.PREDICTIONS, { predictions: [] });

  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const recommendations = (analysis.top_events || [])
    .filter(e => e.action && e.target && e.target !== '空仓/现金' && e.target !== '无对应持仓')
    .map(e => ({
      action: e.action,
      target: e.target,
      why: e.why?.slice(0, 100),
      value_score: e.value_score,
      transmission_chain: e.transmission_chain?.slice(0, 80),
    }));

  const priceSnapshot = (holdingsData || []).map(h => ({
    name: h.name,
    price: h.price,
    change: h.change,
  }));

  predictions.predictions.unshift({
    date: today,
    timestamp: new Date().toISOString(),
    market_phase: analysis.cross_validation?.market_phase || '未知',
    pressure_count: analysis.cross_validation?.pressure_count || 0,
    recommendations,
    price_snapshot: priceSnapshot,
    market_mood: analysis.market_mood,
    uncertainty_level: analysis.uncertainty_level,
  });

  predictions.predictions = predictions.predictions.slice(0, 90);
  saveJsonFile(CONFIG.PATHS.PREDICTIONS, predictions);
  console.log(`📝 预测已记录: ${recommendations.length} 条推荐`);
}

// ==================== 收盘验证（新增）====================
export function saveVerification(holdingsData) {
  let predictions = loadJsonFile(CONFIG.PATHS.PREDICTIONS, { predictions: [] });

  if (!predictions || !predictions.predictions || predictions.predictions.length === 0) {
    console.log('⚠️ 无预测数据，跳过验证');
    return;
  }

  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const todayPred = predictions.predictions.find(p => p.date === today);

  if (!todayPred || !todayPred.recommendations || todayPred.recommendations.length === 0) {
    console.log('⏭️ 今日无有效推荐，跳过验证');
    return;
  }

  const results = todayPred.recommendations.map(rec => {
    const current = holdingsData.find(h => h.name === rec.target);
    const prev = todayPred.price_snapshot.find(h => h.name === rec.target);

    if (!current || !prev) {
      return { ...rec, actual_return: null, is_correct: null, reason: '价格数据缺失' };
    }

    const actualReturn = parseFloat(current.change);
    const predictedUp = ['加仓', '埋伏'].includes(rec.action);
    const actualUp = actualReturn > 0;

    return {
      ...rec,
      prev_price: prev.price,
      close_price: current.price,
      actual_return: actualReturn,
      predicted_direction: predictedUp ? 'up' : 'down',
      actual_direction: actualUp ? 'up' : 'down',
      is_correct: predictedUp === actualUp,
    };
  });

  const validResults = results.filter(r => r.is_correct !== null);
  const accuracy = validResults.length > 0 
    ? (validResults.filter(r => r.is_correct).length / validResults.length * 100).toFixed(1)
    : 0;
  const avgReturn = validResults.length > 0
    ? (validResults.reduce((a, r) => a + r.actual_return, 0) / validResults.length).toFixed(2)
    : 0;

  let verifications = loadJsonFile(CONFIG.PATHS.VERIFICATIONS, { verifications: [] });

  verifications.verifications.unshift({
    date: today,
    timestamp: new Date().toISOString(),
    results,
    overall_accuracy: parseFloat(accuracy),
    avg_return: parseFloat(avgReturn),
    total_recommendations: validResults.length,
  });

  verifications.verifications = verifications.verifications.slice(0, 90);
  saveJsonFile(CONFIG.PATHS.VERIFICATIONS, verifications);

  console.log(`✅ 收盘验证完成: 准确率 ${accuracy}% | 平均收益 ${avgReturn}% | 样本 ${validResults.length} 条`);
}
