import { getMarketClock } from './utils/marketStatus.js';

export const EXCLUDE_PATTERNS = [
  /^【金十数据整理[：:]/,
  /^【今日重点关注的财经数据/,
  /^【财料】/,
  /^【金十整理[：:]/,
  /涨\d+%.*股价再创历史新高/,
  /估值或升至逾\d+亿美元/,
  /Good afternoon/i,
  /"好好先生"/i,
  /特朗普.*"太迟先生"/i,
  /特朗普.*其他地方没人要他/i,
];

export const LOW_VALUE_KEYWORDS = [
  '俏皮话', '最后一次新闻发布会', '不会成为"影子主席"',
  '部署时间创纪录', '厕所也反复出现问题',
];

export const A_STOCK_KEYWORDS = [
  '原油', '油价', '石油', 'WTI', '布伦特', 'Brent', 'EIA',
  '欧佩克', 'OPEC', '页岩油', '战略储备', '储油', '管道',
  '霍尔木兹', '海峡', '油轮', '油运', '航运',
  '沙特', '阿联酋', '科威特', '伊拉克', '委内瑞拉',
  '三桶油', '中石油', '中石化', '中海油',
  '化工', '塑料', 'PTA', '沥青', '化肥',
  '通胀', 'CPI', 'PPI', '美联储', '加息', '降息', '鲍威尔',
  '央行', '降准', 'MLF', 'LPR',
  'A股', '上证', '深证', '创业板', '沪指', '沪深300',
  '汇金', '社保基金', '国家队',
  '伊朗', '核计划', '封锁', '美伊', '中东', '战争',
  '中美', '关税', '贸易', '制裁',
  '证券', '券商', '银行', '保险', '半导体', '芯片',
  '房地产', '限购', '公积金',
  '韩国', 'KOSPI', '三星', 'SK海力士', '日经', '熔断',
  'IPO', '上市', '募资', '申购', '破发',
  'PMI', '社融', 'M2', '工业增加值', 'GDP',
];

export const EVENT_CLUSTERS = [
  { 
    name: '原油能源', 
    keywords: [
      '原油', '油价', '石油', 'WTI', '布伦特', 'Brent', 
      'EIA', '欧佩克', 'OPEC', '页岩油', '战略储备',
      '霍尔木兹', '海峡', '油轮', '储油', '管道', '出口',
      '沙特', '阿联酋', '科威特', '伊拉克', '委内瑞拉',
      '三桶油', '中石油', '中石化', '中海油',
      '化工', '塑料', 'PTA', '沥青', '化肥', '油运'
    ] 
  },
  { 
    name: '伊朗局势', 
    keywords: ['伊朗', '核计划', '封锁', '特朗普.*伊朗', '美伊', '伊美', '哈梅内伊'] 
  },
  { 
    name: '中东战争', 
    keywords: ['战争授权', '战争权力法', '60天', '国会授权', '军事行动', '以军', '真主党', '哈马斯'] 
  },
  { 
    name: '美联储利率', 
    keywords: ['美联储', 'FOMC', '利率决议', '维持利率', '降息', '加息', '鲍威尔', '沃什'] 
  },
  { 
    name: '美联储人事', 
    keywords: ['沃什', '美联储主席提名', '参议院', '米兰', '哈玛克', '卡什卡利'] 
  },
  { 
    name: '黄金贵金属', 
    keywords: ['黄金', '增持黄金', '世界黄金协会', '白银', '央行购金'] 
  },
  { 
    name: '国内政策', 
    keywords: ['证监会', '央行', '降准', '降息', 'LPR', 'MLF', '限购', '公积金', '房地产'] 
  },
  { 
    name: '中美贸易', 
    keywords: ['中美', '关税', '贸易', '半导体', '华虹', '脱钩'] 
  },
  { 
    name: '俄乌局势', 
    keywords: ['普京', '俄乌', '乌克兰', '停火', '胜利日'] 
  },
  { 
    name: '港股/中概股', 
    keywords: ['港股', '恒生', '科网股', '小米', '阿里巴巴', '百度', '中芯国际'] 
  },
  { 
    name: '亚太科技', 
    keywords: ['韩国', 'KOSPI', '三星', 'SK海力士', '日经', '熔断', '杠杆', '平仓', '半导体.*跌'] 
  },
  { 
    name: 'A股IPO', 
    keywords: ['IPO', '上市', '募资', '申购', '破发', '长鑫', '中际旭创', '港股.*上市'] 
  },
  { 
    name: '国内经济数据', 
    keywords: ['PMI', 'CPI', 'PPI', '社融', 'M2', '工业增加值', 'GDP', 'LPR', 'MLF'] 
  },
  { 
    name: 'AH联动', 
    keywords: ['H股', 'A\\+H', '港股破发', 'AH溢价', '港股.*A股', 'A股.*港股'] 
  },
];

export function isSectorMove(content) {
  const sectorPatterns = [
    /集体走高|集体上扬|集体大涨|集体飙升/,
    /涨幅扩大至\d+%/,
    /涨超.*涨超/,
    /科网股|芯片股|半导体股|地产股|汽车股/,
    /港股.*涨|恒生.*涨/,
  ];
  return sectorPatterns.some(p => p.test(content));
}

export function evaluateDataQuality(macro, holdingsData) {
  const clock = getMarketClock();
  const missingItems = [];

  if (!macro.us10yt || macro.us10yt.price === 0) {
    missingItems.push('美10年期债收益率');
  }
  if (!macro.dxy || macro.dxy.price === 0) {
    missingItems.push('美元指数');
  }
  if (!macro.vix || macro.vix.price === 0) {
    missingItems.push('VIX');
  }

  if (!macro.crude || macro.crude.price === 0 || macro.crude.price === '未知') {
    missingItems.push('纽约原油');
  }
  if (!macro.gold || macro.gold.price === 0) {
    missingItems.push('黄金');
  }

  if (!macro.nke || macro.nke.price === 0) {
    missingItems.push('日经225期货');
  }
  if (!macro.nasdaq || macro.nasdaq.price === 0) {
    missingItems.push('纳指期货');
  }

  if (clock.isAStockTrading) {
    if (!macro.hsgt || macro.hsgt.inflow === undefined) {
      missingItems.push('北向资金');
    }
    if (!holdingsData || holdingsData.length === 0) {
      missingItems.push('ETF盘面数据');
    }
  }

  if (clock.isAStockTrading || clock.isHSTechExtended) {
    if (!macro.hstech || macro.hstech.price === 0) {
      missingItems.push('恒生科技');
    }
  }

  let data_quality = '充足';
  let activated_layers = ['L1', 'L2', 'L3', 'L4', 'L5'];
  let aborted_layers = [];

  if (missingItems.includes('纽约原油')) {
    data_quality = '严重不足';
    aborted_layers.push('L2供给冲击');
    activated_layers = activated_layers.filter(l => l !== 'L2');
  }

  if (missingItems.length >= 4) {
    data_quality = '严重不足';
    aborted_layers.push('多情景推演');
  } else if (missingItems.length > 0) {
    data_quality = '部分缺失';
    if (missingItems.includes('美元指数') || missingItems.includes('美10年期债收益率')) {
      aborted_layers.push('L1全球流动性细节');
    }
    if (missingItems.includes('纳指期货') || missingItems.includes('日经225期货')) {
      aborted_layers.push('L4跨市场传染细节');
    }
  }

  return {
    data_quality,
    missing_items: missingItems,
    activated_layers,
    aborted_layers,
    overall_confidence: data_quality === '充足' ? '高' : (data_quality === '部分缺失' ? '中' : '低'),
    market_clock: {
      beijing_time: clock.beijingTime,
      is_a_stock_trading: clock.isAStockTrading,
      is_hstech_extended: clock.isHSTechExtended,
      is_nikkei_trading: clock.isNikkeiTrading,
      is_us_trading: clock.isUSTrading,
      is_asia_equity_closed: clock.isAsiaEquityClosed,
    }
  };
}
