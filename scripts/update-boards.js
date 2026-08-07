#!/usr/bin/env node
/**
 * boards-data.json 每日自动更新脚本（GitHub Actions 定时执行）
 *
 * 数据源：地图开放平台 POI 搜索（合规、无需爬虫）
 *   - 高德开放平台:  https://restapi.amap.com/v3/place/text  (key 免费申请)
 *   - 腾讯位置服务:  https://apis.map.qq.com/ws/place/v1/search (key 免费申请)
 *
 * 功能：
 *   1. 遍历全部城市/品类，按「城市+品类名」搜索真实店铺（评分排序），生成精确经纬度 pins
 *   2. 更新 meta.updated / meta.lastCheck（供小程序显示数据新旧）
 *   3. 无 MAP_KEY 时只更新 lastCheck 并退出（不写文件 → Actions 不产生空 commit）
 *
 * 用法：
 *   MAP_PROVIDER=amap|tencent MAP_KEY=xxx node scripts/update-boards.js
 *   可选: DRY_RUN=1 不写文件（调试）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'boards-data.json');
const PROVIDER = (process.env.MAP_PROVIDER || 'amap').toLowerCase();
const KEY = process.env.MAP_KEY || '';
const DRY = process.env.DRY_RUN === '1';
const DELAY_MS = 120;          // 限速：避免触发地图 API 频控
const MAX_PINS = 5;            // 每品类最多取 5 家真实店铺
const TODAY = new Date().toISOString().slice(0, 10);

// 品类名 → 搜索关键词补充（让 POI 搜索更准：'牛羊肉泡馍' 在西安应搜 '泡馍' 类目）
function searchKeyword(kind, city, item) {
  const n = (item.n || '').replace(/[（(].*?[)）]/g, '').trim();
  return city + ' ' + n;
}

// 高德文本搜索
async function searchAmap(keyword) {
  const url = 'https://restapi.amap.com/v3/place/text?key=' + encodeURIComponent(KEY) +
    '&keywords=' + encodeURIComponent(keyword) +
    '&citylimit=true&offset=' + MAX_PINS + '&extensions=all&output=JSON';
  const res = await fetch(url);
  const j = await res.json();
  if (j.status !== '1' || !Array.isArray(j.pois)) return [];
  return j.pois.map(p => {
    const lnglat = (p.location || '').split(',');
    return {
      name: p.name || '',
      lat: parseFloat(lnglat[1]),
      lng: parseFloat(lnglat[0]),
      addr: p.address || '',
      rating: parseFloat((p.biz_ext && p.biz_ext.rating) || 0) || 0,
      type: p.type || ''
    };
  }).filter(p => p.lat && p.lng && p.name);
}

// 腾讯位置服务搜索
async function searchTencent(keyword) {
  const url = 'https://apis.map.qq.com/ws/place/v1/search?key=' + encodeURIComponent(KEY) +
    '&keyword=' + encodeURIComponent(keyword) +
    '&boundary=region(' + encodeURIComponent(keyword.split(' ')[0]) + ',0)' +
    '&page_size=' + MAX_PINS;
  const res = await fetch(url);
  const j = await res.json();
  if (j.status !== 0 || !Array.isArray(j.data)) return [];
  return j.data.map(p => ({
    name: p.title || '',
    lat: (p.location && p.location.lat) || 0,
    lng: (p.location && p.location.lng) || 0,
    addr: p.address || '',
    rating: parseFloat(p._score || 0) || 0,
    type: (p.category || '').split(';')[0] || ''
  })).filter(p => p.lat && p.lng && p.name);
}

const search = PROVIDER === 'tencent' ? searchTencent : searchAmap;

async function main() {
  if (!fs.existsSync(FILE)) { console.error('[update-boards] 找不到 boards-data.json'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  data.meta = data.meta || {};
  data.meta.lastCheck = TODAY;

  if (!KEY) {
    console.log('[update-boards] 未配置 MAP_KEY，跳过 POI 搜索，不写文件（配置 GitHub Secret MAP_KEY 后开启真实更新）');
    return;
  }

  let totalItems = 0, pinned = 0, skipped = 0;
  const changed = {};

  for (const kind of ['food', 'play']) {
    if (!data[kind]) continue;
    for (const prov of Object.keys(data[kind])) {
      for (const city of Object.keys(data[kind][prov])) {
        const entry = data[kind][prov][city];
        const tops = entry.top || [];
        for (let i = 0; i < tops.length; i++) {
          const item = tops[i];
          totalItems++;
          const kw = searchKeyword(kind, city, item);
          let pois = [];
          try { pois = await search(kw); } catch (e) { skipped++; console.warn('  搜索失败:', kw, e.message); }
          await sleep(DELAY_MS);

          // 搜索无结果/失败时保留旧 pins（防网络抖动清空真实坐标）
          if (!pois.length && (item.pins || []).length) { skipped++; continue; }
          const pins = pois.slice(0, MAX_PINS).map(p => ({ name: p.name, lat: p.lat, lng: p.lng, addr: p.addr || '', rating: p.rating || 0 }));
          // 与旧 pins 对比，有变化才标记
          const oldStr = JSON.stringify(item.pins || []);
          const newStr = JSON.stringify(pins);
          if (oldStr !== newStr) {
            item.pins = pins;
            changed[city + '/' + item.n] = (pins.length) + '家';
          }
          if (pins.length) pinned++;
        }
      }
    }
  }

  data.meta.updated = TODAY;
  data.meta.provider = PROVIDER;
  data.meta.pinnedItems = pinned;

  const out = JSON.stringify(data, null, 2) + '\n';
  if (DRY) {
    console.log('[update-boards] DRY_RUN 不写文件');
  } else {
    const before = fs.readFileSync(FILE, 'utf8');
    if (before.trim() !== out.trim()) {
      fs.writeFileSync(FILE, out);
      console.log('[update-boards] 已写回 boards-data.json');
    } else {
      console.log('[update-boards] 内容无变化，不写文件');
    }
  }
  console.log('[update-boards] 统计:', { provider: PROVIDER, totalItems, pinned, skipped, changedCount: Object.keys(changed).length });
  if (Object.keys(changed).length) console.log('[update-boards] 变更条目示例:', JSON.stringify(changed).slice(0, 400));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error('[update-boards] 异常:', e); process.exit(1); });
