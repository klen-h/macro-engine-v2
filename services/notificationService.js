import axios from 'axios';
import { CONFIG } from '../config.js';
import { hasUrgentTime } from '../utils/marketStatus.js';

export async function pushWechat(analysis, rawItems, macro, holdingsData, webhookOverride = null) {
  const targetWebhook = webhookOverride || CONFIG.WECHAT_WEBHOOK;
  if (!targetWebhook) {
    console.log('⚠️ 未配置 WECHAT_WEBHOOK');
    return;
  }

  const modelTag = analysis._model ? ` [${analysis._model.split('/').pop()}]` : '';

  const sendMsg = async (content, label) => {
    if (!content || content.trim() === '') return;
    try {
      const res = await axios.post(targetWebhook, { msgtype: 'markdown', markdown: { content } }, { timeout: 30000 });
      if (res.data.errcode === 0) {
        console.log(`📲 [${label}${modelTag}] 推送成功`);
      } else {
        console.error(`❌ [${label}${modelTag}] 推送失败:`, res.data.errmsg);
      }
    } catch (error) {
      console.error(`❌ [${label}${modelTag}] 网络失败:`, error.message);
    }
  };

  const diag = analysis.diagnostic_status || {};
  const layers = analysis.factor_layers || [];
  const events = analysis.top_events || [];
  const scenarios = analysis.scenarios || [];
  const narrative = analysis.dominant_narrative || {};
  const strategy = analysis.daily_strategy || {};
  const compliance = analysis.d_state_compliance || {};
  const cross = analysis.cross_validation || {};

  const moodColor = analysis.uncertainty_level === '高' ? 'warning' : (analysis.uncertainty_level === '低' ? 'info' : 'comment');
  const pressureColor = cross.pressure_count >= 3 ? 'warning' : (cross.pressure_count >= 2 ? 'comment' : 'info');

  let p1 = `## 🎯 五层因子诊断${modelTag}\n> 数据质量：**${diag.data_quality || '未知'}** (置信度:${diag.overall_confidence || '低'})\n> 市场阶段：<font color="${pressureColor}">${cross.market_phase || '未知'}</font> [${cross.pressure_count || 0}层施压]\n> 核心矛盾：${cross.dominant_conflict || '未明'}\n> 不确定性：<font color="${moodColor}">${analysis.uncertainty_level || '中'}</font>\n---\n### 📊 五层因子状态\n`;
  for (const layer of layers) {
    const pColor = layer.pressure?.includes('收紧') || layer.pressure?.includes('紧张') || layer.pressure?.includes('危机') || layer.pressure?.includes('高') ? 'warning' : 'info';
    p1 += `- **${layer.layer}**: <font color="${pColor}">${layer.pressure}</font> (置信度:${layer.confidence}) | ${layer.key_signal?.slice(0, 30)}...\n`;
  }

  if (scenarios.length > 0) {
    p1 += `\n### 🎭 情景推演\n`;
    for (const s of scenarios) {
      p1 += `> **${s.scenario_name}** (${s.probability_qualitative})\n> 触发: <font color="comment">${s.trigger_to_watch}</font>\n\n`;
    }
  }
  await sendMsg(p1, '五层因子诊断');

  if (events.length > 0) {
    let p2 = `### 🔍 重点事件分析\n`;
    for (const event of events.slice(0, 3)) {
      const scoreColor = event.value_score >= 8 ? 'warning' : (event.value_score >= 6 ? 'comment' : 'info');
      const urgentTag = event.time_sensitive ? '<font color="warning">[紧急]</font>' : '';
      const targetColor = event.target === '空仓/现金' ? 'warning' : 'info';

      p2 += `#### ${urgentTag} <font color="${targetColor}">${event.action} ${event.target}</font>\n**事件：** ${event.cluster_name} (${event.value_score}分)\n**逻辑：** ${event.why}\n**链条：** ${event.transmission_chain}\n**验证：** ${event.market_validation || '未验证'}\n\n`;
    }
    await sendMsg(p2, '事件分析');
  }

  let p3 = `### 📅 交易策略 [${strategy.max_position_confidence || '低'}置信度]\n> **总仓位：${strategy.overall_position || '观望'}**\n> **核心逻辑：** ${strategy.core_logic || '无'}\n> **禁入标的：** <font color="comment">${strategy.do_not_touch?.join(' | ') || '无'}</font>\n> **开盘清单：** ${strategy.pre_market_checklist?.join(' | ') || '无'}\n---\n**D状态合规：** ${compliance.compliance_note || '已通过逻辑检查'}\n**数据缺失：** <font color="comment">${diag.missing_items?.join(' | ') || '无'}</font>`;
  await sendMsg(p3, '每日策略');
}

export async function pushWechatComparison(analysisA, analysisB, rawItems, macro, holdingsData) {
  // Assume formatTime is imported or passed down
  // For now, it's a placeholder, will be moved to utils/marketStatus.js
  const formatTime = () => new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  if (!CONFIG.WECHAT_WEBHOOK) {
    console.log('⚠️ 未配置 WECHAT_WEBHOOK');
    return;
  }
  const sendMsg = async (content, label) => {
    if (!content || content.trim() === '') return;
    try {
      const res = await axios.post(CONFIG.WECHAT_WEBHOOK, { msgtype: 'markdown', markdown: { content } }, { timeout: 30000 });
      if (res.data.errcode === 0) {
        console.log(`📲 [${label}] 推送成功`);
      } else {
        console.error(`❌ [${label}] 推送失败:`, res.data.errmsg);
      }
    } catch (error) {
      console.error(`❌ [${label}] 网络失败:`, error.message);
    }
  };

  const modelA = analysisA._model?.split('/').pop() || 'Model A';
  const modelB = analysisB._model?.split('/').pop() || 'Model B';
  const crossA = analysisA.cross_validation || {};
  const crossB = analysisB.cross_validation || {};

  let content = `## 🤖 LLM 对比分析报告\n> 时间：${formatTime()}\n---\n| 维度 | **${modelA}** | **${modelB}** |\n| :--- | :--- | :--- |\n| **质量/施压层** | ${analysisA.diagnostic_status?.data_quality} / ${crossA.pressure_count}层 | ${analysisB.diagnostic_status?.data_quality} / ${crossB.pressure_count}层 |\n| **市场阶段** | ${crossA.market_phase} | ${crossB.market_phase} |\n| **情绪** | ${analysisA.market_mood} | ${crossB.market_mood} |\n| **不确定性** | ${analysisA.uncertainty_level} | ${crossB.uncertainty_level} |\n\n### 🎯 核心操作建议\n- **${modelA}**: <font color="info">${analysisA.top_events?.[0]?.action || '无'}</font> ${analysisA.top_events?.[0]?.target || ''}\n> 理由: ${analysisA.top_events?.[0]?.why?.slice(0, 50) || '无'}\n- **${modelB}**: <font color="warning">${analysisB.top_events?.[0]?.action || '无'}</font> ${analysisB.top_events?.[0]?.target || ''}\n> 理由: ${analysisB.top_events?.[0]?.why?.slice(0, 50) || '无'}\n\n---\n### 📅 策略对比\n- **${modelA}**: ${analysisA.daily_strategy?.overall_position} | ${analysisA.daily_strategy?.core_logic?.slice(0, 40)}...\n- **${modelB}**: ${analysisB.daily_strategy?.overall_position} | ${analysisB.daily_strategy?.core_logic?.slice(0, 40)}...\n\n---\n*注：本报告由双模型自动对比生成，仅供参考。*`;

  await sendMsg(content, '双模型对比');
}

export function updateStateAfterPush(state, toAnalyze) {
  for (const cluster of toAnalyze) {
    const existingIdx = state.pushedClusters?.findIndex(p => p.cluster === cluster._cluster);
    if (existingIdx >= 0) {
      const existing = state.pushedClusters[existingIdx];
      existing.pushCount++;
      existing.lastUpdateId = cluster.id;
      existing.lastUpdateTime = new Date().toISOString();
      if (hasUrgentTime(cluster.content)) existing.hadUrgent = true;
      if (cluster.content.includes('军事行动')) existing.hasMilitary = true;
    } else {
      state.pushedClusters = state.pushedClusters || [];
      state.pushedClusters.push({
        cluster: cluster._cluster,
        firstId: cluster.id,
        firstTime: new Date().toISOString(),
        lastUpdateId: cluster.id,
        lastUpdateTime: new Date().toISOString(),
        pushCount: 1,
        hotMax: cluster.hot === '爆' ? '爆' : '沸',
        hadUrgent: hasUrgentTime(cluster.content),
        hasMilitary: cluster.content.includes('军事行动'),
      });
    }
  }
}