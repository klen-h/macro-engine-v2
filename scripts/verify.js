import { getMarketData } from '../data-layer.js';
import { saveVerification } from '../storage.js';

async function main() {
  console.log(`\n[${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}] 🔍 开始收盘验证...`);

  const marketData = await getMarketData(true);
  const holdings = marketData?.holdings || [];

  if (holdings.length === 0) {
    console.log('⚠️ 未获取到ETF收盘数据');
    process.exit(1);
  }

  saveVerification(holdings);
  console.log('✅ 验证完成\n');
}

main().catch(err => {
  console.error('验证脚本异常:', err);
  process.exit(1);
});
