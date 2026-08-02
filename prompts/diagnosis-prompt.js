/**
 * 五层因子并行诊断引擎 - Prompt 模板模块
 * 职责：将巨大的 prompt 模板从业务逻辑中剥离，便于维护和版本管理
 */

// 辅助函数：格式化涨跌幅（原 analyzeWithLLM 内的逻辑移至此）
export function formatChange(val) {
  if (val === undefined || val === null) return 'N/A';
  return val > 0 ? `+${val}%` : `${val}%`;
}

// 构建【全球流动性锚】等宏观数据段落
function buildMacroSection(macro) {
  if (!macro) return '【宏观数据暂缺】\n';

  return `【全球流动性锚】
- 美10年期债收益率: ${macro.us10yt?.price ?? 'N/A'}% (昨收:${macro.us10yt?.prevClose ?? 'N/A'}% ${formatChange(macro.us10yt?.change)})
- 中国10年期债收益率: ${macro.cn10yt?.price ?? 'N/A'}% (昨收:${macro.cn10yt?.prevClose ?? 'N/A'}% ${formatChange(macro.cn10yt?.change)})
- 中美利差: ${macro.spread ?? 'N/A'}%
- 美元指数(DXY): ${macro.dxy?.price ?? 'N/A'} (昨收:${macro.dxy?.prevClose ?? 'N/A'} ${formatChange(macro.dxy?.change)})
- 离岸人民币(CNH): ${macro.usdcnh?.price ?? 'N/A'} (昨收:${macro.usdcnh?.prevClose ?? 'N/A'} ${formatChange(macro.usdcnh?.change)})
- VIX恐慌指数: ${macro.vix?.price ?? 'N/A'} (昨收:${macro.vix?.prevClose ?? 'N/A'} ${formatChange(macro.vix?.change)})

【核心能源与避险】
- 布伦特原油: $${macro.brent?.price ?? 'N/A'} (昨结:${macro.brent?.prevClose ?? 'N/A'} ${formatChange(macro.brent?.change)}) [日内高:${macro.brent?.high ?? 'N/A'} 低:${macro.brent?.low ?? 'N/A'}]
- 纽约原油: $${macro.crude?.price ?? 'N/A'} (昨结:${macro.crude?.prevClose ?? 'N/A'} ${formatChange(macro.crude?.change)}) [日内高:${macro.crude?.high ?? 'N/A'} 低:${macro.crude?.low ?? 'N/A'}]
- 黄金(COMEX): $${macro.gold?.price ?? 'N/A'} (昨结:${macro.gold?.prevClose ?? 'N/A'} ${formatChange(macro.gold?.change)})
- 黄金现货: $${macro.goldSpot?.price ?? 'N/A'}

【工业需求与交叉验证】
- 白银(COMEX): $${macro.silver?.price ?? 'N/A'} (昨结:${macro.silver?.prevClose ?? 'N/A'} ${formatChange(macro.silver?.change)})
- 铜(COMEX): $${macro.copper?.price ?? 'N/A'} (昨结:${macro.copper?.prevClose ?? 'N/A'} ${formatChange(macro.copper?.change)})
- 金银比: ${macro.goldSilverRatio ?? 'N/A'} (当前环境>80不代表恐慌，需结合VIX判断)
- 铜金比: ${macro.copperGoldRatio ?? 'N/A'} (经济动能/避险)

【全球风险资产】
- 纳指期货(NQ): ${macro.nasdaq?.price ?? 'N/A'} (昨结:${macro.nasdaq?.prevClose ?? 'N/A'} ${formatChange(macro.nasdaq?.change)})
- 日经225期货: ${macro.nke?.price ?? 'N/A'} (昨结:${macro.nke?.prevClose ?? 'N/A'} ${formatChange(macro.nke?.change)})
- 恒科指数(HSTECH): ${macro.hstech?.price ?? 'N/A'} (昨收:${macro.hstech?.prevClose ?? 'N/A'} ${formatChange(macro.hstech?.change)})

【A股流动性】
- 今日IPO规模: ${macro.todayIPO ?? '未知'}
- 近期大额解禁: ${macro.unlock ?? '未知'}`;
}

/**
 * 构建完整的五层因子诊断 Prompt
 * @param {Object} options
 * @param {Object} options.dataQuality - 数据质量评估
 * @param {string} options.clockDesc - 市场时段描述
 * @param {string} options.hstechStatus - 恒科指数实时性状态
 * @param {Object} options.macro - 宏观数据对象
 * @param {string} options.holdingsStatusText - ETF 持仓状态文本
 * @param {string} options.domesticSnapshot - 国内基本面快照（L3 注入）
 * @param {string} options.triggeredComparison - 事件触发的指标对比
 * @param {string} options.flashText - 快讯事件簇文本
 * @param {string} options.holdingsText - 用户持仓列表文本 (HOLDINGSTEXT)
 */
export function buildDiagnosisPrompt({
  dataQuality,
  clockDesc,
  hstechStatus,
  macro,
  holdingsStatusText,
  domesticSnapshot = '',
  triggeredComparison = '',
  flashText,
  holdingsText,
  l5Snapshot = ''
}) {
  const macroSection = buildMacroSection(macro);

  return `【角色定义】
你目前是A股宏观交易信号过滤引擎。你的首要任务不是"给出答案"，而是"诚实地评估数据能支撑什么结论"。
核心原则：宁可不交易，不可用残缺数据做决策。
约束条件：用户只能购买A股及港股ETF（通过A股账户）。

## 第一部分：数据预检（必须优先执行）
### 1.1 当前数据快照
${domesticSnapshot}
${triggeredComparison}
${l5Snapshot}

- 数据质量评估状态: ${JSON.stringify(dataQuality)}
- 当前市场时段: ${dataQuality?.market_clock?.beijing_time ?? '未知'} 北京时间 | ${clockDesc}
- 恒科指数实时性: ${hstechStatus}

${macroSection}

### 1.2 盘面实况 (ETF)
${holdingsStatusText}

## 第二部分：五层因子并行诊断（核心引擎）

你必须对以下五个因子层分别诊断，每层输出"压力方向"和"置信度"。

### L1 全球流动性因子
- 诊断指标：美债收益率方向、美元指数、VIX、FOMC措辞
- 输出：流动性压力 [宽松/中性/收紧/极度收紧]，置信度 [高/中/低]
- A股传导：美元走强+美债收益率上行 → 北向资金流出 → 高估值科技/成长承压

### L2 供给冲击因子
- 诊断指标：原油价格、地缘风险、OPEC动态
- 子模块：原油-黄金相关性（仅当形成D状态时才激活D1/D2细分诊断）
  - D状态定义：原油大跌 + 黄金涨/平/微跌且显著抗跌
  - D1(供给驱动)：地缘缓和/增产。验证：铜价企稳、VIX未飙升
  - D2(衰退驱动)：需求崩塌。验证：铜价暴跌、金银比飙升、VIX走高
- 非D状态时：直接描述"油价因地缘X上涨/下跌"，无需强制分类
- A股传导：油价→通胀预期→货币政策预期→全市场估值

### L3 国内基本面因子
- 诊断指标：PMI、CPI、社融、LPR/MLF、政策表态
- 输出：经济动能 [扩张/企稳/收缩]，政策预期 [宽松/中性/收紧]
- A股传导：基本面弱→顺周期(消费/地产/金融)承压；政策宽松预期→红利/基建受益

### L4 跨市场传染因子
- 诊断指标：KOSPI跌幅、日经225跌幅、美股科技跌幅
- 触发条件：KOSPI单日跌>5% 或 日经跌>3% 且 A股半导体/科技低开
- 验证：A股半导体ETF是否同步放量下跌
- A股传导：韩国杠杆平仓/三星暴跌 → 全球芯片估值锚下移 → A股半导体/AI/光通信承压

### L5 A股流动性因子
- 诊断指标：大规模IPO、解禁潮、融资余额变化、北向资金流向
- 触发条件：单日IPO募资>100亿 或 北向净流出>50亿
- A股传导：流动性抽血 → 小盘股/高估值科技股更敏感

### 2.1 交叉验证矩阵
- 统计"同时施压"的因子层数量：
  - 0-1层施压：结构性机会，可方向性交易
  - 2层施压：谨慎，降低仓位
  - 3层及以上施压：系统性风险，优先空仓/防御

### 2.2 反身性校验
- 若新闻呈利多但盘面放量滞涨/高开低走 → 标注"主力逻辑切换"，fragility="极高"
- 若新闻利空但盘面缩量抗跌/低开高走 → 标注"利空出尽/承接有力"
- 关键：必须给出"归因"（是外部冲击还是逻辑反转？）

### 2.3 D状态专属规则（仅在is_d_state=true时激活）
- ❌ 严禁基于"协议达成"逻辑推荐做空黄金。
- ❌ 严禁基于"油价暴跌"逻辑推荐抄底油气ETF。
- ✅ D1(供给驱动)下允许推荐：科技ETF（成本下降）、黄金ETF（独立支撑）、军工ETF（对冲风险）。
- ❌ D2(衰退驱动)下严禁推荐：科技ETF、宽基ETF（盈利预期恶化）。
- ✅ D2(衰退驱动)下允许推荐：国债ETF、黄金ETF、短融ETF。

### 2.4 事件簇分析
- 1个事件：单线推演
- 2-3个事件：最多2个情景，含冲突检测
- 4个以上：最多3个情景，优先级排序

## 第三部分：持仓映射规则
- 优先从用户持仓中选择：${holdingsText}
- 允许推荐"空仓/现金"（当系统性风险时）
- 允许推荐"调仓"（从A换到B，需说明理由）
- 必须通过传导链检验：事件 → 宏观变量 → 行业/资产 → 对应ETF

## 输入事件簇
${flashText}

请严格按以下 JSON 格式输出：
{
  "diagnostic_status": {
    "data_quality": "string",
    "missing_items": ["string"],
    "activated_layers": ["L1","L2","L3","L4","L5"],
    "aborted_layers": ["string"],
    "overall_confidence": "高/中/低"
  },
  "factor_layers": [
    {
      "layer": "L1全球流动性",
      "pressure": "宽松/中性/收紧/极度收紧",
      "confidence": "高/中/低",
      "key_signal": "string",
      "a_stock_impact": "string"
    },
    {
      "layer": "L2供给冲击",
      "pressure": "缓和/中性/紧张/危机",
      "confidence": "高/中/低",
      "key_signal": "string",
      "a_stock_impact": "string",
      "is_d_state": false,
      "d_state_type": "D1供给驱动/D2衰退驱动/不适用"
    },
    {
      "layer": "L3国内基本面",
      "pressure": "扩张/企稳/收缩",
      "confidence": "高/中/低",
      "key_signal": "string",
      "a_stock_impact": "string"
    },
    {
      "layer": "L4跨市场传染",
      "pressure": "无/低/中/高",
      "confidence": "高/中/低",
      "key_signal": "string",
      "a_stock_impact": "string"
    },
    {
      "layer": "L5 A股流动性",
      "pressure": "充裕/中性/紧张/极度紧张",
      "confidence": "高/中/低",
      "key_signal": "string",
      "a_stock_impact": "string"
    }
  ],
  "cross_validation": {
    "pressure_count": 0,
    "dominant_conflict": "string (当前市场核心矛盾)",
    "market_phase": "结构性机会/谨慎/系统性风险/观望"
  },
  "correlation_diagnosis": {
    "oil_direction": "string",
    "gold_direction": "string",
    "is_d_state": false,
    "d_state_type": "D1供给驱动/D2衰退驱动/不适用"
  },
  "market_mood": "string",
  "uncertainty_level": "高/中/低",
  "dominant_narrative": {
    "narrative": "string",
    "fragility": "string",
    "conflicting_signals": ["string"]
  },
  "scenarios": [
    {
      "scenario_name": "string",
      "probability_qualitative": "string",
      "assumptions": ["string"],
      "affected_etfs": ["string"],
      "action_if_confirmed": "string",
      "trigger_to_watch": "string"
    }
  ],
  "top_events": [
    {
      "cluster_name": "string",
      "time_sensitivity_level": "紧急/中等/背景",
      "time_sensitive": false,
      "value_score": 1,
      "transmission_chain": "string (事件 -> 宏观变量 -> 行业逻辑 -> 具体ETF)",
      "transmission_confidence": "强/中/弱",
      "action": "加仓/减仓/调仓/观望/埋伏/空仓/无法判断",
      "target": "string (必须从持仓选，或填'空仓/现金')",
      "urgency": "即刻/本周/观察/中长期",
      "why": "string",
      "market_validation": "string",
      "risk": "string"
    }
  ],
  "daily_strategy": {
    "overall_position": "string (如：空仓/2成/5成/满仓)",
    "max_position_confidence": "高/中/低/不可操作",
    "core_logic": "string",
    "pre_market_checklist": ["string"],
    "key_risks": ["string"],
    "do_not_touch": ["string"]
  },
  "d_state_compliance": {
    "is_d_state": false,
    "gold_short_recommended": false,
    "oil_bottom_fishing_recommended": false,
    "tech_recommended_in_d2": false,
    "compliance_note": "string"
  }
}`;
}