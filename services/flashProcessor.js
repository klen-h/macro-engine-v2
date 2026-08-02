import { loadState, saveState } from '../storage.js';
import { EXCLUDE_PATTERNS, LOW_VALUE_KEYWORDS, A_STOCK_KEYWORDS, EVENT_CLUSTERS, isSectorMove } from '../rules.js';
import { hasUrgentTime } from '../utils/marketStatus.js';

/**
 * 从原始快讯列表中筛选出新快讯
 * @param {Array<Object>} items - 原始快讯列表
 * @returns {Array<Object>} 新增快讯列表
 */
export function getNewItems(items) {
  const state = loadState();
  const lastId = state.lastId || '';
  const sorted = [...items].sort((a, b) => (a.id > b.id ? -1 : 1));
  let newItems;
  if (!lastId) {
    newItems = sorted.slice(0, 5);
    console.log('🆕 首次运行，取最近5条');
  } else {
    newItems = sorted.filter(i => i.id > lastId);
  }
  if (sorted.length > 0) {
    state.lastId = sorted[0].id;
    saveState(state);
  }
  return newItems.reverse();
}

/**
 * 对快讯进行初步过滤，排除低价值信息
 * @param {Array<Object>} items - 待过滤快讯列表
 * @returns {Array<Object>} 过滤后的快讯列表
 */
export function preFilter(items) {
  return items.filter(item => {
    const content = item.content || '';
    if (EXCLUDE_PATTERNS.some(p => p.test(content))) {
      console.log(`   🚫 排除(模式): ${content.slice(0, 40)}...`);
      return false;
    }
    if (LOW_VALUE_KEYWORDS.some(kw => content.includes(kw))) {
      console.log(`   🚫 排除(低价值): ${content.slice(0, 40)}...`);
      return false;
    }
    const isStockReport = /一季度净利润|第一季度净利润|Q1净利润|一季度营收|第一季度营收/.test(content);
    const isSector = isSectorMove(content);
    const hasMacro = A_STOCK_KEYWORDS.some(kw => content.includes(kw));
    if (isStockReport && !isSector && !hasMacro) {
      console.log(`   🚫 排除(纯个股财报): ${content.slice(0, 40)}...`);
      return false;
    }
    return true;
  });
}

/**
 * 根据事件内容进行去重和聚合
 * @param {Array<Object>} items - 待处理快讯列表
 * @returns {Array<Object>} 聚合后的事件簇列表
 */
export function deduplicateByEvent(items) {
  const clusters = [];
  const usedIds = new Set();
  for (const item of items) {
    if (usedIds.has(item.id)) continue;
    const content = item.content || '';
    let matched = false;
    for (const clusterDef of EVENT_CLUSTERS) {
      const isMatch = clusterDef.keywords.some(kw => {
        if (kw.includes('.*')) {
          return new RegExp(kw).test(content);
        }
        return content.includes(kw);
      });
      if (isMatch) {
        const existing = clusters.find(c => c.clusterName === clusterDef.name);
        if (!existing) {
          clusters.push({
            clusterName: clusterDef.name,
            representative: item,
            allItems: [item],
            hotMax: item.hot === '爆' ? 2 : 1,
            earliestTime: item.time,
          });
        } else {
          existing.allItems.push(item);
          if (item.hot === '爆') existing.hotMax = 2;
          if ((item.source_link || '').length > (existing.representative.source_link || '').length) {
            existing.representative = item;
          }
        }
        usedIds.add(item.id);
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({
        clusterName: '其他',
        representative: item,
        allItems: [item],
        hotMax: item.hot === '爆' ? 2 : 1,
        earliestTime: item.time,
      });
      usedIds.add(item.id);
    }
  }
  return clusters.map(c => ({
    ...c.representative,
    _cluster: c.clusterName,
    _clusterSize: c.allItems.length,
    _clusterHot: c.hotMax === 2 ? '爆' : '沸',
    _clusterTime: c.earliestTime,
    _allItems: c.allItems,
  }));
}

/**
 * 判断事件簇是否为重大更新
 * @param {Object} cluster - 当前事件簇
 * @param {Object} existing - 已存在的事件簇状态
 * @returns {boolean} 是否为重大更新
 */
export function isMajorUpdate(cluster, existing) {
  const content = cluster.content || '';
  if (hasUrgentTime(content)) return true;
  const rules = [
    { key: 'hasMilitary', kw: '军事行动' },
    { key: 'hasStrike', kw: '打击方案' },
    { key: 'hasAction', kw: '行动开始' },
    { key: 'hasDeployment', kw: ['15000名', '导弹驱逐舰', '航母', '军机'] },
    { key: 'wasRejected', kw: '不可接受' },
    { key: 'wasBroken', kw: '违反停火' }
  ];
  for (const rule of rules) {
    const kws = Array.isArray(rule.kw) ? rule.kw : [rule.kw];
    if (kws.some(kw => content.includes(kw)) && !existing[rule.key]) return true;
  }
  if (content.includes('重启空袭') || content.includes('恢复打击')) return true;
  return false;
}