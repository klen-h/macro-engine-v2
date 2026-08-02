// ==================== 核心技能 - 宏观状态诊断引擎（2026年8月重构版） ====================

export function getCoreSkill() {
  return `# 任务
**在完成以下所有任务时，必须遵守这些核心约束：**

### 0. 动态价格锚点规则（2026年8月版）
所有关键价位采用动态百分比偏离，禁止引用过时的固定绝对价格：
- 阻力位 = 当前价格 × (1 + 阈值)，阈值按波动率分级：低波动(3%/6%/9%)、中波动(5%/10%/15%)、高波动(8%/15%/25%)
- 支撑位 = 当前价格 × (1 - 阈值)
- 日内振幅 > 5% 标记为"极端波动"，触发策略审慎性约束
- 日内振幅 3%-5% 标记为"高波动"
- 日内振幅 1%-3% 标记为"正常波动"
- 日内振幅 < 1% 标记为"低波动"

### 1. 原油-黄金相关性诊断（第一层：基础状态）

**基础状态强制核对表**（必须逐项对应，禁止自创状态名称）：
- 原油涨 + 黄金涨 = 正相关 → 通胀/滞胀交易（需求过热或供给冲击）
- 原油涨 + 黄金跌 = 负相关 → 紧缩/实际利率飙升（通胀预期倒逼加息，压制金价）
- 原油跌 + 黄金跌 = 正相关 → 衰退或流动性危机
- 原油跌 + 黄金涨/平 = 负相关 → **D状态**

**D状态策略规则（2026年修正版）**：
D状态仅在【原油跌 + 黄金涨/平】时激活，但需叠加利率环境判断：

**D状态 + 美债收益率 < 4.0% 且美联储无加息预期**：
- ❌ 严禁推荐做空黄金
- ❌ 严禁推荐抄底油气ETF
- ✅ 允许推荐科技ETF（成本下降逻辑成立）
- ✅ 允许推荐黄金ETF（独立支撑）
- ✅ 允许推荐军工ETF（对冲风险）

**D状态 + 美债收益率 ≥ 4.5% 或美联储存在加息 dissent（反对票）**：
- ❌ 严禁推荐做空黄金
- ❌ 严禁推荐抄底油气ETF
- ❌ **严禁推荐科技ETF**（利率上行杀估值，成本下降逻辑被覆盖）
- ✅ 允许推荐黄金ETF（独立支撑）
- ✅ 允许推荐高股息/红利ETF（防御替代）
- ✅ 允许推荐军工ETF（对冲风险）
- ⚠️ 允许推荐短债ETF（利率高位锁定收益）

**注意**：D状态专属规则仅在诊断为D状态时激活。非D状态下，该规则不适用。

### 2. 扩展诊断维度（第二层：利率与工业金属）

**利率环境矩阵**（美债收益率数据可用时强制执行）：
- 负相关（原油涨+黄金跌）+ 美债收益率↑ → 真紧缩成立（实际利率驱动）
- 负相关（原油涨+黄金跌）+ 美债收益率↓ → 供给冲击假象（原油独涨，利率未跟随）
- 正相关（原油涨+黄金涨）+ 美债收益率↑ → 滞胀强化（通胀预期失控，央行被迫紧缩）
- 正相关（原油涨+黄金涨）+ 美债收益率↓ → 通胀交易（通胀暂时，央行不会过度反应）
- 正相关（原油跌+黄金跌）+ 美债收益率↓ → 衰退恐慌（避险资产同步抛售，流动性危机）
- 正相关（原油跌+黄金跌）+ 美债收益率↑ → 紧缩衰退（央行过度紧缩扼杀需求）

**铜需求验证**（铜数据可用时强制执行）：
- 铜价涨 + 油价涨 → 需求扩张+供给偏紧，滞胀叙事强化
- 铜价跌 + 油价涨 → 供给冲击正在消耗需求韧性，警惕衰退风险上升
- 铜价涨 + 油价跌 → **AI算力/能源转型结构性需求**与周期衰退博弈（2026年新增状态）
- 铜价跌 + 油价跌 → 全球需求收缩确认
- **铜油比**趋势方向作为情景概率更新的辅助锚定
- **金银比**：上升=纯避险偏好，下降=工业需求预期占上风

**白银交叉验证**（辅助判断，若数据可用）：
- 若白银涨幅明显大于黄金（日内差距>2%），说明市场同时定价了地缘避险+工业需求，此时负相关（原油涨+黄金跌）可能是假象
- 若白银与原油同向且涨幅接近，优先判断为供给冲击叙事，强化滞胀情景
- 若白银独自异动而黄金/原油平稳，可能为自身供需因素，不急于纳入宏观框架

### 3. 中国宏观验证（第三层：2026年新增维度）

**中国PMI状态矩阵**（数据可用时强制执行）：
- 制造业PMI ≥ 50% + 新订单指数 ≥ 50% → 中国内需扩张，周期ETF传导链优先级提升
- 制造业PMI ≥ 50% + 新订单指数 < 50% → 生产过热但需求不足，警惕库存积压
- 制造业PMI < 50% + 新订单指数降幅 > 2个百分点 → **A股开盘承压信号**，周期ETF（油气、铜、地产）传导链优先级降级
- 制造业PMI < 50% + 非制造业PMI < 50% + 综合PMI < 50% → 全面收缩，防御板块（高股息、医药、消费刚需）优先级提升
- 综合PMI为2023年以来最低 → 情绪面冲击大于基本面，短期超跌反弹概率存在但需确认

**离岸人民币验证**：
- USDCNH 升值（人民币走弱）+ A股跌 → 资本外流压力，北向资金流出风险
- USDCNH 贬值（人民币走强）+ A股跌 → 内因主导，非外部流动性问题

### 4. VIX情绪验证（第四层）

- VIX < 15：市场情绪极度乐观，警惕回调风险
- VIX 15~20：正常区间，情绪中性
- VIX 20~30：担忧情绪升温，需结合纳指判断是"有序调整"还是"恐慌前兆"
- VIX > 30：市场恐慌，避险资产（黄金、美债）通常受益，风险资产承压
- VIX与纳指同跌：市场定价的是"基本面走弱"而非"情绪崩溃"
- VIX飙升+纳指暴跌：纯粹恐慌性抛售，短期可能超卖

### 5. GLD黄金ETF验证（第五层）

- GLD持仓量增加 + 金价上涨 → 投资需求驱动，黄金上涨可信度高
- GLD持仓量减少 + 金价上涨 → 金价上涨缺乏资金流入支撑，可能是短期避险脉冲
- GLD持仓量增加 + 金价下跌 → 资金逢低吸纳，黄金接近支撑
- GLD持仓量 stagnant + 金价 stagnant → **灰色地带**，不做方向性判断，标记为"观望区"

### 6. 美联储政策风格验证（2026年新增）

**沃什任美联储主席后的"无前瞻指引"风格**：
- 若 FOMC 声明删除"数据依赖"等前瞻性措辞 → 政策不确定性上升，市场波动率放大
- 若 dissent（反对票）≥ 2票 → 紧缩分歧显性化，利率敏感型资产（科技、地产）承压
- 若 CME 利率期货定价9月加息概率 > 50% → 紧缩预期主导，滞胀叙事让位于衰退叙事

### 7. 情景逻辑互斥提醒

更新概率时，需注意几个情景的宏观逻辑互斥：
- "滞胀"由供给冲击驱动，特征是经济停滞+高通胀
- "紧缩"是央行主动加息抑制通胀，会终结滞胀但可能引发衰退
- "软着陆"则是通胀受控、增长平稳的理想状态
- "AI算力结构性需求"（2026年新增）与周期衰退可以共存，表现为铜/电力/数据中心相关资产与周期大宗分化

理论上前三者不可同时存在。若有多事件分别强化互斥情景，必须指出市场主要在定价哪一种，另一种只是潜在尾部风险。

### 8. 策略传导链要求（2026年修正版）

给出任何方向建议时，必须附带完整的传导链，但允许标注传导链失效：

**标准传导链格式**：
事件A → 影响B → 资产C反应 → 策略D

**传导链失效判定**（满足任一条件即标记为失效）：
- 原油与美债收益率反向运动超过3个交易日
- 黄金与VIX反向运动超过2个交易日
- 铜价与油价反向运动且幅度均 > 3%
- 中国PMI与A股走势反向超过5个交易日

**失效后的处理**：
- 标注"传导链失效，切换至事件驱动模式"
- 策略建议降级为"观望"或"轻仓试错"
- 禁止在传导链失效时给出高置信度的方向性建议

### 9. 策略审慎性约束

- 给出方向性建议时，必须考虑当前价格是否处于极端波动后的短期高位/低位（如单日涨跌幅超过4%）
- 禁止在日内暴涨暴跌后立即推荐追涨/杀跌，除非有明确的反转信号且已在报告中说明
- 若资产处于"灰色地带"（价格 stagnant + 指标 stagnant），策略建议必须为"观望"

### 10. 策略与诊断一致性

策略建议必须与相关性状态诊断逻辑一致。若诊断为负相关（紧缩逻辑），则不推荐以"通胀/避险"为核心逻辑的配置，除非能明确指出该负相关是由特殊事件造成的假象（需在矛盾信号中已说明）。`;
}

// ==================== 盘前专属规则 ====================
export function getPremarketSkill() {
return `## 盘前专属规则
**具体任务清单：**

1. **情景概率更新**：基于上述事件簇和资产收线，对昨日可能的情景（例如软着陆、滞胀、衰退、AI结构性需求等）概率进行倾向性调整。说明哪个情景在强化，哪个在消退。
2. **核心叙事修正**：当前市场的主导叙事是否有变化？如有，请指出新叙事和脆弱点。
3. **开盘关键锚点**：给出今日A股开盘最需关注的3个价格/指标（如纳指指数期货关键位、纽约原油压力、美元指数位置、离岸人民币、中国PMI分项等）。
4. **今日策略基调**：整体仓位建议（偏进攻/防守/观望），重点关注方向（宽基、科技、消费、周期、防御、高股息等），并说明理由（附传导链）。
5. **具体交易信号**（必须包含本节）：
   从以下 ETF 中选择 1-3 个给出具体建议：纳斯达克ETF、纳指ETF、科创50ETF、创业板ETF、沪深300ETF、上证50ETF、中证500ETF、黄金ETF、白银ETF、原油ETF、油气ETF、军工ETF、半导体ETF、芯片ETF、科技ETF、消费ETF、医药ETF、地产ETF、金融ETF、券商ETF、银行ETF、保险ETF、红利ETF、短债ETF。
   每个信号格式必须包含：
   - ETF 名称
   - 支撑位价格（动态计算，基于当前价和波动率分级）
   - 阻力位价格（动态计算，基于当前价和波动率分级）
   - 操作建议（做多/做空/观望）
   - 简要理由（必须附传导链或标注传导链失效）
   示例：纳斯达克ETF 支撑位 [动态计算]，阻力位 [动态计算]，建议在支撑位附近做多，目标阻力位，理由：纳指期货上涨带动科技板块。传导链：美联储暂停加息→流动性预期改善→科技股估值修复→纳指ETF受益。
6. **风险警示**：列出今日可能出现的黑天鹅或灰犀牛。`;
}

// ==================== 午盘专属规则 ====================
export function getMidmarketSkill() {
return `## 午盘专属规则
**具体任务清单：**

1. **上午验证**：基于上午事件和ETF表现，验证早盘策略是否正确？哪些传导链成立，哪些不成立？
2. **情景概率更新**：基于上午的新信息，对当前情景概率进行调整。说明哪个情景在强化，哪个在消退。
3. **核心叙事修正**：上午的市场表现是否改变了当前的主导叙事？如有变化，指出新叙事和脆弱点。
4. **下午关键锚点**：给出下午交易最需关注的3个价格/指标。
5. **下午策略基调**：整体仓位建议（偏进攻/防守/观望），重点关注方向，并说明理由（附传导链）。
6. **具体交易信号**（必须包含本节）：
   从以下 ETF 中选择 1-3 个给出具体建议：纳斯达克ETF、纳指ETF、科创50ETF、创业板ETF、沪深300ETF、上证50ETF、中证500ETF、黄金ETF、白银ETF、原油ETF、油气ETF、军工ETF、半导体ETF、芯片ETF、科技ETF、消费ETF、医药ETF、地产ETF、金融ETF、券商ETF、银行ETF、保险ETF、红利ETF、短债ETF。
   每个信号格式必须包含：
   - ETF 名称
   - 支撑位价格（动态计算）
   - 阻力位价格（动态计算）
   - 操作建议（做多/做空/观望）
   - 简要理由（必须附传导链或标注传导链失效）
   示例：创业板ETF 支撑位 [动态计算]，阻力位 [动态计算]，建议在支撑位附近做多，目标阻力位，理由：上午科技板块表现较强。传导链：半导体业绩超预期→创业板权重上涨→创业板指突破关键位→创业板ETF跟随。
7. **风险警示**：列出下午可能出现的黑天鹅或灰犀牛。`;
}

// ==================== 盘后专属规则 ====================
export function getPostmarketSkill() {
return `## 盘后专属规则
**具体任务清单：**

1. **事件簇影响评估**：回顾今日推送的事件簇中，哪些对盘面产生了实质性影响？其传导链是否成立？哪些传导链失效？
2. **逻辑自洽检验**：基于今日资产表现，是否有证据表明之前的宏观框架需要修正？
3. **错失信号识别**：今日盘面是否存在明显异动而无法用今日推送事件解释？是否出现"AI算力结构性需求"与周期大宗的分化？
4. **框架修正建议**：是否需要调整原油-黄金的相关性判断？对D状态规则在利率高位环境下的表现有何反思？中国宏观维度是否有效解释了A股走势？
5. **明日初步预案**：基于今日收盘状况，明日的核心观察指标和潜在情景是什么？是否需要关注美联储讲话、中国政策动向、地缘风险演变？`;
}

// ==================== 动态趋势上下文生成（2026年重构版） ====================
/**
 * 根据历史数据生成资产的趋势描述
 * @param {string} symbol - 资产标识（如 'wti', 'gold'）
 * @param {number} price - 当前价格
 * @param {number} prevClose - 前收盘价
 * @param {number} high - 日内最高
 * @param {number} low - 日内最低
 * @param {number} open - 开盘价（可选）
 * @param {Array} history - 宏观历史数组（loadMacroHistory() 返回的）
 * @param {string} volatilityRegime - 波动率制度：'low' | 'normal' | 'high' | 'extreme'
 * @returns {string} 趋势描述文本
 */
export function getTrendContext(symbol, price, prevClose, high, low, open, history = [], volatilityRegime = 'normal') {
  // 波动率分级阈值（百分比）
  const thresholdMap = {
    'low': [0.03, 0.06, 0.09],
    'normal': [0.05, 0.10, 0.15],
    'high': [0.08, 0.15, 0.25],
    'extreme': [0.12, 0.20, 0.30]
  };

  const thresholds = thresholdMap[volatilityRegime] || thresholdMap['normal'];
  const resistance1 = price * (1 + thresholds[0]);
  const resistance2 = price * (1 + thresholds[1]);
  const resistance3 = price * (1 + thresholds[2]);
  const support1 = price * (1 - thresholds[0]);
  const support2 = price * (1 - thresholds[1]);
  const support3 = price * (1 - thresholds[2]);

  let context = '';

  // 日内动能
  if (open && price > open && price > prevClose) context += '动能偏多，';
  else if (open && price < open && price < prevClose) context += '动能偏空，';
  else if (open && Math.abs(price - open) / price < 0.001) context += '动能中性，';

  // 动态关键位
  context += `动态阻力 R1=${resistance1.toFixed(2)}(+${(thresholds[0]*100).toFixed(1)}%) R2=${resistance2.toFixed(2)} R3=${resistance3.toFixed(2)}，`;
  context += `动态支撑 S1=${support1.toFixed(2)}(-${(thresholds[0]*100).toFixed(1)}%) S2=${support2.toFixed(2)} S3=${support3.toFixed(2)}，`;

  // 日内振幅与波动率分级
  if (high && low && price > 0) {
    const amplitude = ((high - low) / price * 100);
    if (amplitude > 5) {
      context += `日内振幅${amplitude.toFixed(1)}%（极端波动，触发审慎约束），`;
      const extremeR = price * 1.08;
      const extremeS = price * 0.92;
      context += `极端波动修正位：阻力${extremeR.toFixed(2)}，支撑${extremeS.toFixed(2)}，`;
    } else if (amplitude > 3) {
      context += `日内振幅${amplitude.toFixed(1)}%（高波动），`;
    } else if (amplitude > 1) {
      context += `日内振幅${amplitude.toFixed(1)}%（正常波动），`;
    } else {
      context += `日内振幅${amplitude.toFixed(1)}%（低波动），`;
    }
  }

  // 近期趋势（扩大至10日窗口）
  if (history.length >= 2) {
    const recent = history.slice(-10);
    let consecutiveUp = 0, consecutiveDown = 0;
    for (let i = recent.length - 1; i > 0; i--) {
      const prev = recent[i - 1]?.[symbol]?.price;
      const curr = recent[i][symbol]?.price;
      if (prev && curr > prev) { consecutiveUp++; consecutiveDown = 0; }
      else if (prev && curr < prev) { consecutiveDown++; consecutiveUp = 0; }
      else break;
    }
    if (consecutiveUp >= 3) context += `连涨${consecutiveUp}日（趋势较强），`;
    else if (consecutiveUp >= 2) context += `连涨${consecutiveUp}日，`;
    else if (consecutiveDown >= 3) context += `连跌${consecutiveDown}日（趋势较弱），`;
    else if (consecutiveDown >= 2) context += `连跌${consecutiveDown}日，`;

    // 20日区间位置
    const longWindow = history.slice(-20);
    const prices = longWindow.map(r => r[symbol]?.price).filter(Boolean);
    if (prices.length && price > 0) {
      const recentHigh = Math.max(...prices, price);
      const recentLow = Math.min(...prices, price);
      const distToHigh = ((recentHigh - price) / price * 100).toFixed(1);
      const distToLow = ((price - recentLow) / price * 100).toFixed(1);
      context += `20日高${recentHigh.toFixed(2)}(距当前-${distToHigh}%) 低${recentLow.toFixed(2)}(距当前+${distToLow}%)，`;

      const range = recentHigh - recentLow;
      if (range > 0) {
        const position = (price - recentLow) / range;
        if (position > 0.8) context += `处于20日区间高位(${(position*100).toFixed(0)}%)，`;
        else if (position < 0.2) context += `处于20日区间低位(${(position*100).toFixed(0)}%)，`;
        else context += `处于20日区间中位(${(position*100).toFixed(0)}%)，`;
      }
    }

    // 均线偏离
    if (recent.length >= 5) {
      const ma5 = recent.slice(-5).reduce((sum, r) => sum + (r[symbol]?.price || price), 0) / 5;
      const ma5Dev = ((price - ma5) / ma5 * 100).toFixed(1);
      context += `偏离5日均线${ma5Dev>0?'+':''}${ma5Dev}%，`;
    }
  }

  return context.replace(/，$/, '');
}

// ==================== 宏观状态诊断辅助函数 ====================

/**
 * 判断当前波动率制度
 * @param {number} price - 当前价格
 * @param {number} high - 日内最高
 * @param {number} low - 日内最低
 * @param {Array} history - 历史数据
 * @returns {string} 'low' | 'normal' | 'high' | 'extreme'
 */
export function getVolatilityRegime(price, high, low, history = []) {
  if (!high || !low || price <= 0) return 'normal';

  const dailyAmp = (high - low) / price;

  let avgAmp = dailyAmp;
  if (history.length >= 5) {
    const amps = history.slice(-20).map(r => {
      const h = r?.high, l = r?.low, p = r?.price;
      return (h && l && p > 0) ? (h - l) / p : 0;
    }).filter(a => a > 0);
    if (amps.length > 0) {
      avgAmp = amps.reduce((a, b) => a + b, 0) / amps.length;
    }
  }

  if (avgAmp > 0.05 || dailyAmp > 0.08) return 'extreme';
  if (avgAmp > 0.035 || dailyAmp > 0.05) return 'high';
  if (avgAmp > 0.015 || dailyAmp > 0.03) return 'normal';
  return 'low';
}

/**
 * 中国宏观状态快速判断
 * @param {number} pmi - 制造业PMI
 * @param {number} newOrders - 新订单指数
 * @param {number} nonMfgPmi - 非制造业PMI（可选）
 * @returns {string} 状态描述
 */
export function getChinaMacroContext(pmi, newOrders, nonMfgPmi = null) {
  let context = '';

  if (pmi >= 50) {
    context += '制造业扩张，';
    if (newOrders >= 50) context += '新订单同步扩张，周期传导链有效。';
    else context += '但新订单收缩，警惕库存积压风险。';
  } else {
    context += '制造业收缩，';
    if (newOrders < 50) {
      const drop = 50 - newOrders;
      if (drop > 2) context += `新订单骤降${drop.toFixed(1)}个百分点，A股开盘承压信号。`;
      else context += '新订单同步收缩，内需不足。';
    } else {
      context += '新订单意外扩张，关注持续性。';
    }
  }

  if (nonMfgPmi !== null) {
    if (nonMfgPmi < 50 && pmi < 50) context += '非制造业同步收缩，全面收缩确认，防御板块优先级提升。';
    else if (nonMfgPmi >= 50 && pmi < 50) context += '非制造业韧性，结构性分化。';
  }

  return context;
}

/**
 * 美联储政策风格判断（2026年沃什时代）
 * @param {number} dissentCount - FOMC反对票数量
 * @param {boolean} hasForwardGuidance - 声明是否包含前瞻指引
 * @param {number} hikeProbability - CME加息概率(%)
 * @returns {string} 政策风格描述
 */
export function getFedPolicyContext(dissentCount, hasForwardGuidance, hikeProbability) {
  let context = '';

  if (!hasForwardGuidance) {
    context += '美联储删除前瞻指引，政策不确定性上升，市场波动率放大。';
  }

  if (dissentCount >= 2) {
    context += `FOMC dissent=${dissentCount}票，紧缩分歧显性化，利率敏感型资产承压。`;
  } else if (dissentCount === 1) {
    context += 'FOMC存在1票反对，分歧初现。';
  }

  if (hikeProbability > 50) {
    context += `CME定价9月加息概率${hikeProbability.toFixed(1)}%，紧缩预期主导。`;
  } else if (hikeProbability > 30) {
    context += `CME定价9月加息概率${hikeProbability.toFixed(1)}%，紧缩预期升温。`;
  } else {
    context += `CME定价9月加息概率${hikeProbability.toFixed(1)}%，紧缩预期降温。`;
  }

  return context;
}

/**
 * 传导链失效检测
 * @param {Object} signals - 各资产信号对象 {wti, gold, copper, yield10y, vix, nasdaq}
 * @returns {Array} 失效的传导链列表
 */
export function detectBrokenChains(signals) {
  const broken = [];

  if (signals.wti && signals.yield10y) {
    const wtiChange = signals.wti.changePct;
    const yieldChange = signals.yield10y.changePct;
    if (wtiChange * yieldChange < 0 && Math.abs(wtiChange - yieldChange) > 3) {
      broken.push('原油-美债收益率传导链失效（反向运动且分化>3%）');
    }
  }

  if (signals.gold && signals.vix) {
    const goldChange = signals.gold.changePct;
    const vixChange = signals.vix.changePct;
    if (goldChange * vixChange < 0 && Math.abs(goldChange) > 1 && Math.abs(vixChange) > 10) {
      broken.push('黄金-VIX传导链失效（避险逻辑断裂）');
    }
  }

  if (signals.copper && signals.wti) {
    const copperChange = signals.copper.changePct;
    const wtiChange = signals.wti.changePct;
    if (copperChange * wtiChange < 0 && Math.abs(copperChange) > 3 && Math.abs(wtiChange) > 3) {
      broken.push('铜-原油传导链失效（周期与供给冲击分化）');
    }
  }

  return broken;
}