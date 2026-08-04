import { config } from 'dotenv';
config();

export const CONFIG = {
  LLM: {
    API_KEY: process.env.LLM_API_KEY,
    BASE_URL: process.env.LLM_BASE_URL,
    MODEL: process.env.LLM_MODEL,
  },

  FLASH_COOKIE: process.env.JIN10_COOKIE || '',

  WECHAT_WEBHOOK: process.env.WECHAT_WEBHOOK || '',

  WECHAT_WEBHOOK_REVIEW: process.env.WECHAT_WEBHOOK_REVIEW || '',

  API_ENDPOINTS: {
    SINA_MACRO: 'https://hq.sinajs.cn/list=hf_CL,hf_GC,hf_XAU,DINIW,fx_susdcnh,hf_NQ,rt_hkHSTECH,hf_OIL,hf_NK,hf_SI,hf_HG,globalbd_us10yt,hf_VX,gb_gld,globalbd_cn10yt,rt_hkHSI',
    JIN10_L5_LIQUIDITY: 'https://mp-api.jin10.com/api/home/item?category_id=52037&page=1&limit=200&platform=pc',
    JIN10_FLASH: 'https://3318fc142ea545eab931e22a61ec6e5c.z3c.jin10.com/flash', // params will be added dynamically
    TENCENT_HOLDINGS: 'https://qt.gtimg.cn/q=',
  },

  JIN10_MACRO_CATEGORY_ID: 52012,

  // L5 核心指标映射（52037 类别下）
  L5_INDICATOR_MAP: {
    550105: { key: 'margin_trading', name: '沪深两市融资融券余额', unit: '亿元', category: 'leverage' },
    550059: { key: 'turnover', name: '沪深北A股成交额', unit: '亿元', category: 'volume' },
    550097: { key: 'southbound', name: '南向资金净流入', unit: '亿元', category: 'cross_border' },
  },

  // L5 快讯关键词 → 触发 L5 指标
  L5_FLASH_KEYWORDS: {
    '融资余额': ['margin_trading'],
    '融资融券': ['margin_trading'],
    '杠杆资金': ['margin_trading'],
    '两融': ['margin_trading'],
    '成交额': ['turnover'],
    '成交量': ['turnover'],
    'A股成交': ['turnover'],
    '两市成交': ['turnover'],
    '万亿成交': ['turnover'],
    '地量': ['turnover'],
    '放量': ['turnover'],
    '缩量': ['turnover'],
    '南向资金': ['southbound'],
    '港股通': ['southbound'],
    '南下资金': ['southbound'],
    'IPO': ['ipo'],
    '新股发行': ['ipo'],
    '打新': ['ipo'],
    '募资': ['ipo'],
    '解禁': ['unlock'],
  },

  // L3 8项核心 + 2项辅助的指标定义
  MACRO_INDICATOR_MAP: {
    534: { key: 'official_manufacturing_pmi', name: '官方制造业PMI', unit: '', category: 'pmi' },
    541: { key: 'non_manufacturing_pmi', name: '非制造业PMI', unit: '', category: 'pmi' },
    531: { key: 'cpi_yoy', name: 'CPI年率', unit: '%', category: 'price' },
    965: { key: 'ppi_mom', name: 'PPI月率', unit: '%', category: 'price' },
    548: { key: 'm2_yoy', name: 'M2货币供应年率', unit: '%', category: 'money' },
    8080: { key: 'aggregate_financing', name: '今年迄今社会融资规模增量', unit: '亿元', category: 'credit' },
    8081: { key: 'new_yuan_loans', name: '今年迄今新增人民币贷款', unit: '亿元', category: 'credit' },
    1416: { key: 'lpr_5y', name: '五年期LPR', unit: '%', category: 'policy' },
    1417: { key: 'lpr_1y', name: '一年期LPR', unit: '%', category: 'policy' },
    // 辅助项
    551: { key: 'gdp_yoy', name: 'GDP年率', unit: '%', category: 'growth' },
    552: { key: 'gdp_qoq', name: 'GDP季率', unit: '%', category: 'growth' },
    537: { key: 'industrial_added_value_yoy', name: '规模以上工业增加值同比', unit: '%', category: 'growth' },
  },

  // L3 快讯关键词 → 触发指标key
  MACRO_FLASH_KEYWORDS: {
    '制造业PMI': ['official_manufacturing_pmi'],
    '官方制造业PMI': ['official_manufacturing_pmi'],
    '非制造业PMI': ['non_manufacturing_pmi'],
    '服务业PMI': ['non_manufacturing_pmi'],
    '综合PMI': ['official_manufacturing_pmi', 'non_manufacturing_pmi'],
    'CPI': ['cpi_yoy'],
    '居民消费价格': ['cpi_yoy'],
    'PPI': ['ppi_mom'],
    '工业生产者价格': ['ppi_mom'],
    'M2': ['m2_yoy'],
    '货币供应': ['m2_yoy'],
    '社融': ['aggregate_financing'],
    '社会融资': ['aggregate_financing'],
    '新增人民币贷款': ['new_yuan_loans'],
    '新增贷款': ['new_yuan_loans'],
    '人民币贷款': ['new_yuan_loans'],
    'LPR': ['lpr_1y', 'lpr_5y'],
    '贷款市场报价利率': ['lpr_1y', 'lpr_5y'],
    'GDP': ['gdp_yoy', 'gdp_qoq'],
    '国内生产总值': ['gdp_yoy', 'gdp_qoq'],
    '工业增加值': ['industrial_added_value_yoy'],
    '规模以上工业': ['industrial_added_value_yoy'],
  },

  PATHS: {
    DATA_DIR: './data',
    STATE: './data/state.json',
    RAW: './data/raw.json',
    ANALYSIS: './data/analysis.json',
    ETF_CLOSE: './data/etf_close.json',
    PREDICTIONS: './public/data/predictions.json',
    VERIFICATIONS: './public/data/verifications.json',
    MACRO_HISTORY: './public/data/macro_history.json',
    MACRO_SNAPSHOT: './data/macro_snapshot.json',
    HOLDINGS_SNAPSHOT: './data/holdings_snapshot.json',
  }
};
