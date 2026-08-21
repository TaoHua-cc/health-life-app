/* Xiaoman fitness polish: remove the duplicate tab, add the exercise library
   beside recommendations, keep a local-first daily/weekly analysis, and make
   the exercise picker an iOS-safe bottom sheet. AI analysis is user-triggered. */
(function () {
  'use strict';

  var CACHE_KEY = 'xiaoman-fit-analysis-v1';
  var requested = {};
  var busy = '';

  function apiState() {
    var api = window.__xmV5;
    return api && api.state ? api.state() : {S: window.S || {}, curDate: window.curDate || ''};
  }
  function appData() { return apiState().S || {}; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function number(value) { var n = Number(value); return isFinite(n) ? n : 0; }
  function iso(date) { var d = date || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function currentIso() { var cur = String(apiState().curDate || ''); return /^\d{4}-\d{2}-\d{2}$/.test(cur) ? cur : iso(); }
  function dateFrom(key) { var d = new Date(String(key).replace(/-/g, '/')); d.setHours(12, 0, 0, 0); return d; }
  function dayData(key) { var s = appData(), days = s.days || {}; return days[key] || {}; }
  function itemsFor(key) {
    var fit = dayData(key).fit || {}, parts = fit.parts || [], rows = [];
    parts.forEach(function (part) { (part.items || []).forEach(function (item) { if (item && !item.deleted) rows.push(item); }); });
    return rows;
  }
  function itemMinutes(item) {
    if (number(item.minutes)) return number(item.minutes);
    if (number(item.duration)) return number(item.duration) > 180 ? number(item.duration) / 60 : number(item.duration);
    if (item.type === 'cardio' || item.type === 'time') return 10;
    return Math.max(1, number(item.sets || 3) * number(item.reps || 12) * 0.18);
  }
  function daily(key) {
    var rows = itemsFor(key), done = rows.filter(function (item) { return !!item.done; });
    return {key:key, total:rows.length, done:done.length, minutes:rows.reduce(function (sum, item) { return sum + itemMinutes(item); }, 0), kcal:rows.reduce(function (sum, item) { return sum + number(item.kcal || item.calories || item.cal); }, 0), names:rows.map(function (item) { return item.name || '训练动作'; }).slice(0, 5)};
  }
  function weekly() {
    var base = dateFrom(currentIso()), monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    var rows = [], activeDays = 0;
    for (var i = 0; i < 7; i++) { var d = new Date(monday); d.setDate(monday.getDate() + i); var item = daily(iso(d)); rows.push(item); if (item.total) activeDays++; }
    return {days:rows, activeDays:activeDays, total:rows.reduce(function (sum, item) { return sum + item.total; }, 0), done:rows.reduce(function (sum, item) { return sum + item.done; }, 0), minutes:rows.reduce(function (sum, item) { return sum + item.minutes; }, 0), kcal:rows.reduce(function (sum, item) { return sum + item.kcal; }, 0)};
  }
  function signature(d, w) { return JSON.stringify({day:d.key,total:d.total,done:d.done,minutes:Math.round(d.minutes),kcal:Math.round(d.kcal),week:w.days.map(function (x) { return [x.key,x.total,x.done,Math.round(x.minutes)]; })}); }
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeCache(value) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(value || {})); } catch (e) {} }
  function localText(d, w) {
    var today = d.total ? ('今日记录 '+d.total+' 个动作，完成 '+d.done+' 个，约 '+Math.round(d.minutes)+' 分钟。' + (d.done === d.total ? '今天已完成安排，记得补水和拉伸。' : '还有 '+(d.total - d.done)+' 个动作未完成，可按状态调整节奏。')) : '今天还没有训练记录，建议从 10 分钟热身或一组基础动作开始。';
    var week = w.activeDays ? ('本周已训练 '+w.activeDays+' 天，累计完成 '+w.done+' 个动作、约 '+Math.round(w.minutes)+' 分钟。' + (w.activeDays >= 4 ? '频率稳定，注意安排至少一天主动恢复。' : '训练频率偏低，可把短训练分散到工作日。')) : '本周还没有训练记录，先安排一次轻量训练建立节奏。';
    return {today:today, week:week};
  }
  function splitAiText(text) {
    var raw = String(text || ''), match = /本周节奏\s*[:：]/.exec(raw);
    if (!match) return {today:raw, week:'综合建议：'+raw};
    return {today:raw.slice(0, match.index).replace(/^今日训练\s*[:：]?\s*/, '').trim(), week:raw.slice(match.index + match[0].length).trim()};
  }
  function textFrom(json) {
    var content = json && json.output && (json.output.text || (json.output.choices && json.output.choices[0] && json.output.choices[0].message && json.output.choices[0].message.content));
    if (!content && json && json.choices && json.choices[0] && json.choices[0].message) content = json.choices[0].message.content;
    if (Array.isArray(content)) content = content.map(function (item) { return item.text || ''; }).join('');
    return String(content || '').trim();
  }
  function aiUrl(target) { var s = appData(); return s.aiProxy ? String(s.aiProxy).replace(/\/?$/, '') + '?target=' + encodeURIComponent(target) : target; }
  function cardRoot() { return document.querySelector('.rb-fit-pixel'); }
  function makeActions(head) {
    if (!head || head.querySelector('[data-xm-fit-library]')) return;
    var actions = document.createElement('div'), lib = document.createElement('button'), more = head.querySelector('.xm-more-btn');
    actions.className = 'xm-rec-actions';
    lib.type = 'button'; lib.className = 'xm-fit-lib-head-btn'; lib.setAttribute('data-xm-fit-library', '1'); lib.textContent = '动作库 ›';
    lib.onclick = function () { if (typeof window.rbOpenFitLibrary === 'function') window.rbOpenFitLibrary(); };
    actions.appendChild(lib);
    if (more) { head.removeChild(more); actions.appendChild(more); }
    head.appendChild(actions);
  }
  function normalizeFitNav(root) {
    if (!root) return;
    var toolbar = root.querySelector('.xm-fit-toolbar'); if (toolbar) toolbar.remove();
    makeActions(root.querySelector('.xm-rec-head'));
  }
  function renderAnalysis() {
    var root = cardRoot(); if (!root) return;
    normalizeFitNav(root);
    var d = daily(currentIso()), w = weekly(), sig = signature(d, w), cache = readCache(), saved = cache[sig], local = localText(d, w), trend = root.querySelector('.xm-v6-trend'), card = root.querySelector('.xm-fit-analysis');
    if (!card) { card = document.createElement('section'); card.className = 'xm-fit-analysis'; if (trend && trend.parentNode) trend.parentNode.insertBefore(card, trend.nextSibling); else root.appendChild(card); }
    var s = appData(), aiReady = !!s.aiKey, source = saved ? '通义千问已保存' : (busy === sig ? '通义千问分析中' : '本地综合分析'), action = '';
    if (!saved && aiReady) action = busy === sig ? '<small>正在根据今日与本周记录更新</small>' : '<button type="button" onclick="xmFitAiAnalyze()">用 AI 深度分析</button>';
    else if (saved) action = '<button type="button" onclick="xmFitAiAnalyze(true)">重新分析</button>';
    var aiParts = saved && splitAiText(saved.text), todayBody = saved ? aiParts.today : local.today, weekBody = saved ? aiParts.week : local.week;
    card.innerHTML = '<div class="xm-fit-analysis-head"><div><span class="xm-fit-analysis-mark">✦</span><b>训练分析</b><small>'+source+'</small></div>'+action+'</div><div class="xm-fit-analysis-body"><b>今日训练</b><p>'+esc(todayBody)+'</p><b>本周节奏</b><p>'+esc(weekBody)+'</p></div>';
  }
  function requestAi(sig, d, w) {
    var s = appData(); if (!s.aiKey || busy === sig) return;
    busy = sig; requested[sig] = true; renderAnalysis();
    var prompt = '你是小满日常的中文健身教练。请综合分析今日训练和本周训练，不要编造数据，给出简短可执行建议。今日：'+JSON.stringify(d)+'；本周：'+JSON.stringify(w.days)+'。输出不超过140字，分成“今日训练：”和“本周节奏：”两段，包含完成度、训练量、恢复或下一步建议。';
    fetch(aiUrl('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'), {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.aiKey}, body:JSON.stringify({model:s.aiModel || 'qwen-turbo', messages:[{role:'user',content:prompt}], temperature:.2})}).then(function (response) { return response.json().then(function (json) { return {ok:response.ok,json:json}; }); }).then(function (result) {
      var text = result.ok ? textFrom(result.json) : ''; if (text) { var cache = readCache(); cache[sig] = {text:text, at:Date.now()}; writeCache(cache); }
      busy = ''; renderAnalysis();
    }).catch(function () { busy = ''; renderAnalysis(); });
  }
  window.xmFitAiAnalyze = function (force) {
    var d = daily(currentIso()), w = weekly(), sig = signature(d, w), cache = readCache();
    if (force) { delete requested[sig]; delete cache[sig]; writeCache(cache); }
    if (cache[sig] && !force) { renderAnalysis(); return; }
    requestAi(sig, d, w);
  };

  function actionImage(item) {
    if (item && item.image) return item.image;
    var group = String(item && (item.grp || item.group) || '').toLowerCase();
    if (/胸|chest/.test(group)) return 'assets/illustrations/fit-part-chest-v2.png';
    if (/背|back/.test(group)) return 'assets/illustrations/fit-part-back-v2.png';
    if (/腿|大腿|小腿|leg|calf/.test(group)) return 'assets/illustrations/fit-part-leg-v2.png';
    if (/肩|手臂|arm|shoulder/.test(group)) return 'assets/illustrations/fit-part-arm-v2.png';
    return 'assets/illustrations/fit-part-core-v2.png';
  }
  function decorateActionResults() {
    var matches = window.rbFitMatches || [];
    Array.prototype.forEach.call(document.querySelectorAll('#rbFitResults .rb-food-result'), function (row, index) {
      if (row.querySelector('.xm-action-result-art')) return;
      var item = matches[index] || {}, art = document.createElement('span'), img = document.createElement('img');
      art.className = 'xm-action-result-art'; img.src = actionImage(item); img.alt = ''; art.appendChild(img); row.insertBefore(art, row.firstChild);
    });
  }
  function wrapExerciseSearch() {
    var fn = window.rbSearchExercise; if (typeof fn !== 'function' || fn.__xmActionImage) return;
    var wrapped = function () { var result = fn.apply(this, arguments); setTimeout(decorateActionResults, 0); return result; };
    wrapped.__xmActionImage = true; window.rbSearchExercise = wrapped;
  }
  function sheetChrome() {
    var sheet = document.getElementById('rbFitSheet'), panel = sheet && sheet.querySelector('.rb-sheet-panel'); if (!sheet || !panel) return;
    if (!panel.querySelector('.xm-sheet-grabber')) { var grabber = document.createElement('div'); grabber.className = 'xm-sheet-grabber'; grabber.setAttribute('aria-hidden','true'); panel.insertBefore(grabber, panel.firstChild); }
  }
  function wrapSheet() {
    var open = window.rbOpenFitPart, close = window.rbCloseFitPart;
    if (typeof open === 'function' && !open.__xmFitSheet) { var openWrapped = function () { var result = open.apply(this, arguments); setTimeout(function () { sheetChrome(); document.body.classList.add('xm-fit-sheet-open'); decorateActionResults(); }, 0); return result; }; openWrapped.__xmFitSheet = true; window.rbOpenFitPart = openWrapped; }
    if (typeof close === 'function' && !close.__xmFitSheetClose) { var closeWrapped = function () { document.body.classList.remove('xm-fit-sheet-open'); return close.apply(this, arguments); }; closeWrapped.__xmFitSheetClose = true; window.rbCloseFitPart = closeWrapped; }
  }
  function styles() {
    if (document.getElementById('xm-fit-polish-style')) return;
    var style = document.createElement('style'); style.id = 'xm-fit-polish-style';
    style.textContent = '.xm-rec-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}.xm-rec-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}.xm-fit-lib-head-btn,.xm-rec-actions .xm-more-btn{font:inherit!important;-webkit-appearance:none!important;text-decoration:none!important;white-space:nowrap}.xm-fit-lib-head-btn{border:1px solid #b6c88e;border-radius:10px;padding:6px 9px;background:#f0f5e4;color:#587328!important;font-size:.58rem;font-weight:900;cursor:pointer}.xm-rec-actions .xm-more-btn{margin:0!important;padding:5px 2px!important;color:#789438!important;background:transparent!important;border:0!important}.xm-fit-analysis{margin-top:12px;border:1px solid #d9c8ad;border-radius:17px;background:linear-gradient(145deg,#fffdf8,#f8f1e3);padding:12px 13px;color:#4b2c18;box-shadow:0 7px 15px rgba(86,64,33,.06)}.xm-fit-analysis-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.xm-fit-analysis-head>div{display:flex;align-items:center;gap:6px;min-width:0}.xm-fit-analysis-mark{display:grid;place-items:center;width:20px;height:20px;border-radius:7px;background:#789438;color:#fff;font-size:.7rem}.xm-fit-analysis-head b{font-size:.78rem;font-weight:900}.xm-fit-analysis-head small{color:#8b7b68;font-size:.5rem;white-space:nowrap}.xm-fit-analysis-head button{border:1px solid #d5a447;border-radius:9px;background:#fff8e8;color:#9a681e;font:inherit;font-size:.53rem;font-weight:900;padding:5px 7px;white-space:nowrap}.xm-fit-analysis-body{margin-top:9px;border-top:1px dashed #e1d4c0;padding-top:8px}.xm-fit-analysis-body b{display:block;color:#789438;font-size:.58rem;margin-top:5px}.xm-fit-analysis-body p{margin:2px 0 0;color:#62503d;font-size:.61rem;line-height:1.55}.rb-fit-pixel button,.rb-fit-pixel a{color:#4b2c18!important;text-decoration:none!important}.rb-fit-pixel .rb-pixel-guide{color:#789438!important}.rb-fit-pixel .rb-pixel-check{color:#fff!important}.rb-sheet{display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:0!important;background:rgba(53,39,25,.28)!important}.rb-sheet[hidden]{display:none!important}.rb-sheet .rb-sheet-panel{box-sizing:border-box;width:min(100%,430px)!important;max-height:min(84svh,680px)!important;overflow:auto!important;margin:0!important;padding:17px 15px calc(16px + env(safe-area-inset-bottom))!important;border-radius:26px 26px 0 0!important;border:1px solid rgba(180,154,112,.5)!important;border-bottom:0!important;background:#fffdf8!important;color:#4b2c18!important;box-shadow:0 -14px 34px rgba(86,64,33,.2)!important;animation:xmFitSheetUp .26s cubic-bezier(.22,1,.36,1)}.xm-sheet-grabber{width:38px;height:4px;border-radius:99px;background:#d8c9b2;margin:0 auto 11px}.rb-sheet button,.rb-sheet input,.rb-sheet select,.rb-sheet b,.rb-sheet small,.rb-sheet span{font-family:inherit!important;color:#4b2c18!important;-webkit-tap-highlight-color:transparent}.rb-sheet button{text-decoration:none!important}.rb-sheet .rb-result-guide{color:#789438!important}.rb-sheet .rb-secondary{color:#806b55!important}.rb-sheet .rb-primary{color:#fff!important;background:#789438!important}.rb-sheet .rb-food-result{min-height:58px!important}.xm-action-result-art{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#f5eedf;border:1px solid #e5d6bd;overflow:hidden}.xm-action-result-art img{width:38px;height:38px;object-fit:contain}.rb-pixel-session-copy,.rb-pixel-session-copy h3,.rb-pixel-session-copy p{color:#4b2c18!important;text-decoration:none!important}.rb-pixel-session-copy{font:inherit!important;background:transparent!important;border:0!important;text-align:left!important;-webkit-appearance:none!important}@keyframes xmFitSheetUp{from{transform:translateY(100%);opacity:.72}to{transform:translateY(0);opacity:1}}@media(prefers-reduced-motion:reduce){.rb-sheet .rb-sheet-panel{animation:none!important}}';
    document.head.appendChild(style);
  }
  function refresh() { styles(); wrapExerciseSearch(); wrapSheet(); var root = cardRoot(); if (root) renderAnalysis(); }
  var screen = document.getElementById('rbScreen');
  if (screen && window.MutationObserver) { var queued = false; new MutationObserver(function () { if (queued) return; queued = true; setTimeout(function () { queued = false; refresh(); }, 0); }).observe(screen, {childList:true, subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 250); }); else setTimeout(refresh, 250);
}());
