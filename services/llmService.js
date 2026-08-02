import axios from 'axios';
import { CONFIG } from '../config.js';
import { HOLDINGSTEXT } from '../const/index.js';
import { evaluateDataQuality } from '../rules.js';
import { buildDiagnosisPrompt } from '../prompts/diagnosis-prompt.js';
import { getDomesticSnapshotForPrompt, getTriggeredComparison } from '../macro-cache.js';
import { getL5SnapshotForPrompt } from '../l5-liquidity-cache.js';
import { hasUrgentTime } from '../utils/marketStatus.js';

function formatHoldingsForLLM(holdings) {
  if (!holdings || holdings.length === 0) {
    return '当前为非交易时段，无ETF实时盘面数据。"盘面交叉验证"改为"逻辑自洽性检验"（新闻之间是否矛盾？）。';
  }
  let output = '';
  for (const [cat, names] of Object.entries(HOLDINGSTEXT)) {
    const matched = holdings.filter(h => names.includes(h.name));
    if (matched.length > 0) {
      output += `\n【${cat}】\n`;
      output += matched.sort((a, b) => b.change - a.change).map(h => {
        const arrow = h.change > 0 ? '🔺' : (h.change < 0 ? '🔻' : '➖');
        const volTag = h.volumeRatio > 1.5 ? '🔥放量' : (h.volumeRatio < 0.8 ? '💤缩量' : '');
        return `${arrow} ${h.name}: ${h.change > 0 ? '+' : ''}${h.changeStr}% ${volTag}`;
      }).join(' | ');
      output += '\n';
    }
  }
  return output;
}

export async function analyzeWithLLM(clusteredItems, macro, holdingsData, modelOverride = null) {
  const dataQuality = evaluateDataQuality(macro, holdingsData);
  const holdingsStatusText = formatHoldingsForLLM(holdingsData);

  // ===== L3 国内基本面注入 =====
  const bjNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const bjHour = bjNow.getHours();
  const bjMinute = bjNow.getMinutes();
  const isPreMarket = (bjHour === 8) || (bjHour === 9 && bjMinute <= 30);

  const domesticSnapshot = getDomesticSnapshotForPrompt(clusteredItems, isPreMarket);
  const triggeredComparison = getTriggeredComparison(clusteredItems);
  // ==============================

  // ===== 新增：L5 A股流动性注入 =====
  const l5Snapshot = getL5SnapshotForPrompt(clusteredItems, isPreMarket);
  // =================================

  // 市场时段描述（原 prompt 内的三元表达式移至此）
  const clockDesc = dataQuality.market_clock.is_a_stock_trading
    ? 'A股/港股盘中，ETF实时数据可用，可进行盘面交叉验证'
    : (dataQuality.market_clock.is_us_trading
      ? '美股活跃时段，ETF已收盘，仅能进行逻辑自洽检验'
      : '亚盘已收盘，所有ETF无实时数据，盘面验证自动降级为逻辑自洽检验');

  const hstechStatus = (dataQuality.market_clock.is_a_stock_trading || dataQuality.market_clock.is_hstech_extended)
    ? '盘中实时'
    : '已收盘静态数据（仅作宏观参考）';

  // 快讯文本组装
  const flashText = clusteredItems.map(i => {
    const sizeTag = i._clusterSize > 1 ? ` [本簇共${i._clusterSize}条]` : '';
    const urgentTag = hasUrgentTime(i.content) ? ' [时间敏感]' : '';
    const contents = i._allItems
      ? Array.from(new Set(i._allItems.map(item => item.content.trim())))
      : [i.content.trim()];
    const aggregatedContent = contents.map((c, idx) => contents.length > 1 ? `${idx + 1}. ${c}` : c).join('\n');
    return `[${i._clusterHot}]${sizeTag}${urgentTag} ${i._cluster}\n时间: ${i.time}\n内容:\n${aggregatedContent}`;
  }).join('\n\n---\n\n');

  // 组装 Prompt（核心：一行调用替代 200 行模板）
  const prompt = buildDiagnosisPrompt({
    dataQuality,
    clockDesc,
    hstechStatus,
    macro,
    holdingsStatusText,
    domesticSnapshot,
    triggeredComparison,
    flashText,
    holdingsText: HOLDINGSTEXT,
    l5Snapshot
  });

  console.log('📝 生成的 Prompt:', prompt);
  // return // Don't return, actually call LLM

  const targetModel = modelOverride || CONFIG.LLM.MODEL;
  console.log(`🤖 正在使用模型: ${targetModel}`);

  try {
    const { API_KEY, BASE_URL } = CONFIG.LLM;
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: targetModel,
        messages: [
          { role: "system", content: "你是冷酷的宏观交易员。当前以五层因子并行诊断为核心。对无价值信息要毫不留情。必须输出合法JSON。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      },
      {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 1200000
      }
    );

    const parsed = JSON.parse(response.data.choices[0].message.content);
    console.log(`✅ LLM [${targetModel}] 分析完成`);
    parsed._model = targetModel;
    return parsed;
  } catch (error) {
    console.error(`❌ LLM [${targetModel}] 失败:`, error.message?.slice(0, 200));
    return { market_mood: '未知', uncertainty_level: '高', top_events: [], _model: targetModel };
  }
}

export function postFilterCompliance(analysis) {
  if (!analysis) return analysis;
  const topEvents = analysis.top_events || [];
  let complianceNote = analysis.d_state_compliance?.compliance_note || '';

  if (analysis.d_state_compliance?.gold_short_recommended) {
    console.error('🚫 LLM违规推荐做空黄金，已强制剔除');
    analysis.top_events = topEvents.filter(
      e => !(e.target?.includes('黄金ETF') && e.action === '减仓')
    );
    complianceNote += ' | 已剔除违规做空黄金建议';
  }

  if (analysis.d_state_compliance?.oil_bottom_fishing_recommended) {
    console.error('🚫 LLM违规推荐抄底油气，已强制剔除');
    analysis.top_events = topEvents.filter(
      e => !(e.target?.includes('标普油气ETF') && (e.action === '加仓' || e.action === '埋伏'))
    );
    complianceNote += ' | 已剔除违规抄底油气建议';
  }

  const isD2 = analysis.d_state_compliance?.is_d_state
    && analysis.d_state_compliance?.d_state_type === 'D2衰退驱动';
  if (isD2) {
    const techTargets = ['半导体ETF', '人工智能ETF', '纳斯达克ETF', '科创板50ETF', '恒生科技ETF'];
    const badTech = topEvents.filter(
      e => techTargets.includes(e.target) && (e.action === '加仓' || e.action === '埋伏')
    );
    if (badTech.length > 0) {
      console.error('🚫 D2衰退状态下违规推荐科技ETF，已强制剔除:', badTech.map(e => e.target).join(', '));
      analysis.top_events = topEvents.filter(
        e => !(techTargets.includes(e.target) && (e.action === '加仓' || e.action === '埋伏'))
      );
      complianceNote += ' | D2状态下已剔除科技ETF加仓建议';
    }
  }

  const pressureCount = analysis.cross_validation?.pressure_count || 0;
  const marketPhase = analysis.cross_validation?.market_phase || '';
  if ((pressureCount >= 3 || marketPhase === '系统性风险') && !analysis.top_events?.some(e => e.target === '空仓/现金')) {
    console.warn('⚠️ 系统性风险下未推荐空仓，追加风险提示');
  }

  if (analysis.d_state_compliance) {
    analysis.d_state_compliance.compliance_note = complianceNote;
  }

  return analysis;
}