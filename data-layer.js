import axios from 'axios';
import { HOLDINGS_MAP } from './const/index.js';
import { getChinaMarketStatus } from './utils/chinaMarket.js';
import { CONFIG } from './config.js';

async function getHoldingsFromTencent() {
  try {
    const codes = Object.values(HOLDINGS_MAP).join(',');
    const url = `${CONFIG.API_ENDPOINTS.TENCENT_HOLDINGS}${codes}`;

    const res = await axios.get(url, {
      headers: { 
        'Referer': 'https://finance.qq.com',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000,
      responseType: 'text'
    });

    const results = [];
    const lines = res.data.trim().split('\n');
    const codeToName = Object.fromEntries(
      Object.entries(HOLDINGS_MAP).map(([name, code]) => [code, name])
    );

    for (const line of lines) {
      const match = line.match(/v_(sz|sh)(\d+)="([^"]*)"/);
      if (!match) continue;

      const [, market, codeNum, dataStr] = match;
      const fullCode = `${market}${codeNum}`;
      const d = dataStr.split('~');

      const name = codeToName[fullCode] || d[1];
      const price = parseFloat(d[3]);
      const prevClose = parseFloat(d[4]);

      let change = 0;
      if (prevClose > 0) {
        change = ((price - prevClose) / prevClose * 100);
      }

      const volume = parseFloat(d[36]) || 0;
      const avgVolume = parseFloat(d[37]) || 0;

      results.push({
        name,
        code: d[2],
        price: price.toFixed(3),
        prevClose: prevClose.toFixed(3),
        change: parseFloat(change.toFixed(2)),
        changeStr: change > 0 ? `${change.toFixed(2)}` : `${change.toFixed(2)}`,
        volume,
        volumeRatio: avgVolume > 0 ? (volume / avgVolume).toFixed(2) : '0',
        isStale: false,
        source: 'tencent'
      });
    }
    return results;
  } catch (e) {
    console.error('获取持仓行情失败:', e.message);
    return [];
  }
}

export async function getMarketData(isForce = false) {
  const marketStatus = getChinaMarketStatus();
  const isAOpen = marketStatus.isOpen;

  let holdings = [];
  if (isForce || isAOpen) {
    holdings = await getHoldingsFromTencent();
  } else {
    console.log(`A股未开市（${marketStatus.reason || '非交易时间'}），跳过获取 ETF 盘面`);
  }

  return {
    marketStatus,
    isAOpen,
    holdings,
    timestamp: new Date().toISOString()
  };
}
