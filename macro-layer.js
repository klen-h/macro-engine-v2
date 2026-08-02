import axios from 'axios';
import { CONFIG } from './config.js';

export async function fetchSinaMacro() {
  const url = CONFIG.API_ENDPOINTS.SINA_MACRO;

  try {
    const { data } = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      responseType: 'arraybuffer',
    });
    const text = Buffer.from(data, 'binary').toString('latin1');

    const map = {};
    const lines = text.trim().split('\n');
    for (const line of lines) {
      const m = line.match(/var hq_str_(\w+)="([^"]*)"/);
      if (!m) continue;
      map[m[1]] = m[2].split(',');
    }

    const cl = map['hf_CL'] || [];
    const crude = {
      price: parseFloat(cl[0]) || 0,
      prevClose: parseFloat(cl[7]) || 0,
      high: parseFloat(cl[4]) || 0,
      low: parseFloat(cl[5]) || 0,
      change: cl[7] > 0 ? ((cl[0] - cl[7]) / cl[7] * 100).toFixed(2) : '0',
      time: `${cl[12]} ${cl[6]}`,
    };

    const bt = map['hf_OIL'] || [];
    const brent = {
      price: parseFloat(bt[0]) || 0,
      prevClose: parseFloat(bt[7]) || 0,
      high: parseFloat(bt[4]) || 0,
      low: parseFloat(bt[5]) || 0,
      change: bt[7] > 0 ? ((bt[0] - bt[7]) / bt[7] * 100).toFixed(2) : '0',
      time: `${bt[12]} ${bt[6]}`,
    };

    const gc = map['hf_GC'] || [];
    const gold = {
      price: parseFloat(gc[0]) || 0,
      prevClose: parseFloat(gc[7]) || 0,
      high: parseFloat(gc[4]) || 0,
      low: parseFloat(gc[5]) || 0,
      change: gc[7] > 0 ? ((gc[0] - gc[7]) / gc[7] * 100).toFixed(2) : '0',
      time: `${gc[12]} ${gc[6]}`,
    };

    const gd = map['gb_gld'] || [];
    const gld = {
      price: parseFloat(gd[1]) || 0,
      prevClose: parseFloat(gd[26]) || 0,
      high: parseFloat(gd[6]) || 0,
      low: parseFloat(gd[7]) || 0,
      change: gd[26] > 0 ? ((gd[1] - gd[26]) / gd[26] * 100).toFixed(2) : '0',
      time: `${gd[25]}`,
    };

    const si = map['hf_SI'] || [];
    const silver = {
      price: parseFloat(si[0]) || 0,
      prevClose: parseFloat(si[7]) || 0,
      high: parseFloat(si[4]) || 0,
      low: parseFloat(si[5]) || 0,
      change: si[7] > 0 ? ((si[0] - si[7]) / si[7] * 100).toFixed(2) : '0',
      time: `${si[12]} ${si[6]}`,
    };

    const hg = map['hf_HG'] || [];
    const copper = {
      price: parseFloat(hg[0]) || 0,
      prevClose: parseFloat(hg[7]) || 0,
      high: parseFloat(hg[4]) || 0,
      low: parseFloat(hg[5]) || 0,
      change: hg[7] > 0 ? ((hg[0] - hg[7]) / hg[7] * 100).toFixed(2) : '0',
      time: `${hg[12]} ${hg[6]}`,
    };

    const us10ytData = map['globalbd_us10yt'] || [];
    const us10yt = {
      price: parseFloat(us10ytData[3]) || 0,
      prevClose: parseFloat(us10ytData[2]) || 0,
      high: parseFloat(us10ytData[4]) || 0,
      low: parseFloat(us10ytData[5]) || 0,
      change: us10ytData[2] > 0 ? ((us10ytData[3] - us10ytData[2]) / us10ytData[2] * 100).toFixed(2) : '0',
      time: `${us10ytData[12]} ${us10ytData[13]}`,
    };

    const cn10ytData = map['globalbd_cn10yt'] || [];
    const cn10yt = {
      price: parseFloat(cn10ytData[3]) || 0,
      prevClose: parseFloat(cn10ytData[2]) || 0,
      high: parseFloat(cn10ytData[4]) || 0,
      low: parseFloat(cn10ytData[5]) || 0,
      change: cn10ytData[2] > 0 ? ((cn10ytData[3] - cn10ytData[2]) / cn10ytData[2] * 100).toFixed(2) : '0',
      time: `${cn10ytData[12]} ${cn10ytData[13]}`,  
    };   

    const nq = map['hf_NQ'] || [];
    const nasdaq = {
      price: parseFloat(nq[0]) || 0,
      prevClose: parseFloat(nq[7]) || 0,
      high: parseFloat(nq[4]) || 0,
      low: parseFloat(nq[5]) || 0,
      change: nq[7] > 0 ? ((nq[0] - nq[7]) / nq[7] * 100).toFixed(2) : '0',
      time: `${nq[12]} ${nq[6]}`,
    };

    const nk = map['hf_NK'] || [];
    const nke = {
      price: parseFloat(nk[0]) || 0,
      prevClose: parseFloat(nk[7]) || 0,
      high: parseFloat(nk[4]) || 0,
      low: parseFloat(nk[5]) || 0,
      change: nk[7] > 0 ? ((nk[0] - nk[7]) / nk[7] * 100).toFixed(2) : '0',
      time: `${nk[12]} ${nk[6]}`,
    };

    const hst = map['rt_hkHSTECH'] || [];
    const hstech = {
      price: parseFloat(hst[6]) || 0,
      prevClose: parseFloat(hst[3]) || 0,
      high: parseFloat(hst[4]) || 0,
      low: parseFloat(hst[5]) || 0,
      change: parseFloat(hst[8]) || 0,
      time: `${hst[17]} ${hst[18]}`,
    };

    const hsiData = map['rt_hkHSI'] || [];
    const hsi = {
      price: parseFloat(hsiData[6]) || 0,
      prevClose: parseFloat(hsiData[3]) || 0,
      high: parseFloat(hsiData[4]) || 0,
      low: parseFloat(hsiData[5]) || 0,
      change: parseFloat(hsiData[8]) || 0,
      time: `${hsiData[17]} ${hsiData[18]}`,
    };

    const xauData = map['hf_XAU'] || [];
    const xauNums = [xauData[0], xauData[2], xauData[3], xauData[4], xauData[5]].map(Number).filter(n => !isNaN(n) && n > 0);
    const goldSpot = {
      price: parseFloat(xauData[0]) || 0,
      high: Math.max(...xauNums),
      low: Math.min(...xauNums),
      time: `${xauData[12]} ${xauData[6]}`,
    };

    const dxyData = map['DINIW'] || [];
    const dxy = {
      price: parseFloat(dxyData[1]) || 0,
      prevClose: parseFloat(dxyData[3]) || 0,
      high: parseFloat(dxyData[6]) || 0,
      low: parseFloat(dxyData[7]) || 0,
      time: `${dxyData[10]} ${dxyData[0]}`,
    };
    dxy.change = dxy.prevClose > 0 ? ((dxy.price - dxy.prevClose) / dxy.prevClose * 100).toFixed(2) : '0';

    const cnhData = map['fx_susdcnh'] || [];
    let usdcnh = { price: 0, prevClose: 0, high: 0, low: 0, time: '', change: '0' };
    if (cnhData.length > 0) {
      usdcnh = {
        price: parseFloat(cnhData[1]) || 0,
        prevClose: parseFloat(cnhData[3]) || 0,
        high: parseFloat(cnhData[6]) || 0,
        low: parseFloat(cnhData[7]) || 0,
        change: parseFloat(cnhData[10])?.toFixed(2) || '0',
        time: `${cnhData[17]} ${cnhData[0]}`,
      };
    }

    const vxData = map['hf_VX'] || [];
    const vix = {
      price: parseFloat(vxData[0]) || 0,
      prevClose: parseFloat(vxData[7]) || 0,
      high: parseFloat(vxData[4]) || 0,
      low: parseFloat(vxData[5]) || 0,
      change: vxData[7] > 0 ? ((vxData[0] - vxData[7]) / vxData[7] * 100).toFixed(2) : '0',
      time: `${vxData[12]} ${vxData[6]}`, 
    };

    const copperOilRatio = (brent.price > 0) ? (copper.price / brent.price).toFixed(2) : '0';
    const goldSilverRatio = (silver.price > 0) ? (gold.price / silver.price).toFixed(2) : '0';
    const gldRatio = (gld.price > 0) ? (gold.price / gld.price).toFixed(2) : '0';
    const copperGoldRatio = (copper.price > 0) ? (copper.price / gold.price).toFixed(2) : '0';
    const spread = (cn10yt.price - us10yt.price).toFixed(2);

    return { 
      brent, 
      crude,
      gold, 
      goldSpot, 
      dxy, 
      usdcnh, 
      nasdaq, 
      nke, 
      hstech,
      hsi,
      silver, 
      copper, 
      us10yt,
      cn10yt,
      spread,
      vix,
      gld,
      copperOilRatio,
      goldSilverRatio,
      gldRatio,
      copperGoldRatio,
    };

  } catch (e) {
    console.error('新浪宏观数据获取失败:', e.message);
    return {
      crude: { price: 0, change: '0' },
      gold: { price: 0, change: '0' },
      goldSpot: { price: 0, change: '0' },
      dxy: { price: 0, change: '0' },
      usdcnh: { price: 0, change: '0' },
      cn10yt: { price: 0, change: '0' },
      nasdaq: { price: 0, change: '0' },
      hstech: { price: 0, change: '0' },
      brent: { price: 0, change: '0' },
      nke: { price: 0, change: '0' },
      hsi: { price: 0, change: '0' },
      silver: { price: 0, change: '0' },
      copper: { price: 0, change: '0' },
      copperOilRatio: '0',
      goldSilverRatio: '0',
      us10yt: { price: 0, change: '0' },
      vix: { price: 0, change: '0' },
      gld: { price: 0, prevClose: 0, high: 0, low: 0, time: '', change: '0' },
      gldRatio: '0',
      copperGoldRatio: '0',
      cn10yt: { price: 0, change: '0' },
      spread: '0',
    };
  }
}


// 测试运行
// fetchSinaMacro().then(res => console.log(JSON.stringify(res, null, 2)));