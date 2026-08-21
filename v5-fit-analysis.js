/* Xiaoman fitness polish: remove the duplicate tab, add the exercise library
   beside recommendations, keep a local-first daily/weekly analysis, and make
   the exercise picker an iOS-safe bottom sheet. AI analysis is user-triggered. */
(function () {
  'use strict';

  var CACHE_KEY = 'xiaoman-fit-analysis-v1';
  var requested = {};
  var busy = '';
  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

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
    if (!head) return;
    var actions = head.querySelector('.xm-rec-actions'), lib = head.querySelector('[data-xm-fit-library]'), analysis = head.querySelector('[data-xm-fit-analysis]'), more = head.querySelector('[data-xm-fit-more]');
    if (!actions) { actions = document.createElement('div'); actions.className = 'xm-rec-actions'; head.appendChild(actions); }
    var legacyMore = head.querySelector('.xm-more-btn');
    if (legacyMore && legacyMore !== more) legacyMore.remove();
    if (!lib) { lib = document.createElement('button'); lib.type = 'button'; lib.className = 'xm-fit-lib-head-btn'; lib.setAttribute('data-xm-fit-library', '1'); lib.textContent = '动作库'; lib.onclick = function () { if (typeof window.rbOpenFitLibrary === 'function') window.rbOpenFitLibrary(); }; }
    if (!analysis) { analysis = document.createElement('button'); analysis.type = 'button'; analysis.className = 'xm-fit-analysis-head-btn'; analysis.setAttribute('data-xm-fit-analysis', '1'); analysis.textContent = '训练分析'; analysis.onclick = function () { if (typeof window.xmOpenFitAnalysis === 'function') window.xmOpenFitAnalysis(); }; }
    if (!more) { more = document.createElement('button'); more.type = 'button'; more.className = 'xm-fit-more-head-btn'; more.setAttribute('data-xm-fit-more', '1'); more.textContent = '更多 ›'; more.onclick = function () { if (window.__xmV5 && typeof window.__xmV5.openPlanList === 'function') window.__xmV5.openPlanList(); }; }
    actions.appendChild(lib); actions.appendChild(analysis); actions.appendChild(more);
  }
  function sessionDateLabel() {
    var cur = currentIso(), today = iso(), d = dateFrom(cur), names = ['日','一','二','三','四','五','六'];
    return {current:cur === today, date:(d.getMonth() + 1) + '月' + d.getDate() + '日 周' + names[d.getDay()], iso:cur};
  }
  function normalizeSessionDate(root) {
    var head = Array.prototype.find.call(root.querySelectorAll('.rb-pixel-section-head:not(.xm-rec-head)'), function (item) { return item.querySelector('[data-rb-title-label="本次训练"]') || String(item.innerText || '').indexOf('本次训练') >= 0; });
    if (!head) return;
    head.classList.add('xm-fit-session-head');
    var h2 = head.querySelector('.rb-pixel-section-title'), mark = h2 && h2.querySelector('.xm-leaf-title'), title = h2 && (h2.getAttribute('data-rb-title-label') || '本次训练');
    if (h2 && !h2.getAttribute('data-xm-session-title')) { h2.innerHTML = (mark ? mark.outerHTML : '') + esc(title); h2.setAttribute('data-xm-session-title', '1'); }
    var tabs = root.querySelector('.xm-fit-daytabs'), meta = root.querySelector('.xm-fit-session-meta');
    if (!meta) { meta = document.createElement('div'); meta.className = 'xm-fit-session-meta'; meta.setAttribute('data-xm-fit-date', '1'); if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(meta, tabs); else head.parentNode.insertBefore(meta, head.nextSibling); }
    var date = sessionDateLabel();
    meta.innerHTML = '<span class="xm-fit-session-date">'+date.date+'</span>' + (date.current ? '<span class="xm-fit-current-chip">今天</span>' : '<button type="button" class="xm-fit-back-today" onclick="__xmV5.selectDate(\''+dateString(iso())+'\')">今天</button>');
  }
  function dateString(value) { return String(value || '').replace(/'/g, ''); }
  function flattenDayTabs(root) {
    var wraps = root.querySelectorAll('.xm-daytabs-wrap');
    Array.prototype.forEach.call(wraps, function (node) {
      var parent = node.parentElement;
      if (!parent || !parent.closest('.xm-daytabs-wrap')) return;
      while (node.firstChild) parent.appendChild(node.firstChild);
      node.remove();
    });
  }
  function exerciseImageFor(label) {
    var db = window.EXERCISE_DB || window.__xmExerciseDB || [], text = String(label || '').trim();
    for (var i = 0; i < db.length; i++) {
      var item = db[i], aliases = item.alias || [];
      if (item.name === text || aliases.indexOf(text) >= 0 || aliases.some(function (alias) { return String(alias).trim() === text; })) return item.image || '';
    }
    return '';
  }
  function exerciseImageForId(id) {
    var db = window.EXERCISE_DB || window.__xmExerciseDB || [], key = String(id || '').trim();
    for (var i = 0; i < db.length; i++) if (String(db[i].id || '').trim() === key) return db[i].image || '';
    return '';
  }
  function syncExerciseArt(root) {
    qa('.rb-pixel-session-row', root).forEach(function (row) {
      var title = q('.rb-pixel-session-copy h3', row), image = q('img', row), guide = q('.rb-pixel-guide', row), guideOnclick = guide && guide.getAttribute('onclick') || '', idMatch = guideOnclick.match(/rbShowExerciseGuide\(['"]([^'"]+)/), label = title && String(title.textContent || '').split('·').pop().trim(), src = idMatch ? exerciseImageForId(idMatch[1]) : exerciseImageFor(label);
      if (image && src) { image.src = src; image.classList.add('xm-exercise-static-art'); image.setAttribute('data-xm-exercise-art', '1'); }
    });
  }
  function normalizeFitNav(root) {
    if (!root) return;
    var toolbar = root.querySelector('.xm-fit-toolbar'); if (toolbar) toolbar.remove();
    makeActions(root.querySelector('.xm-rec-head'));
    var oldAnalysis = root.querySelector('.xm-fit-analysis'); if (oldAnalysis && !oldAnalysis.closest('#xmFitAnalysisSheet')) oldAnalysis.remove();
    normalizeSessionDate(root);
    flattenDayTabs(root);
    syncExerciseArt(root);
  }
  function ensureAnalysisSheet() {
    var sheet = document.getElementById('xmFitAnalysisSheet');
    if (!sheet) {
      sheet = document.createElement('div'); sheet.id = 'xmFitAnalysisSheet'; sheet.className = 'xm-fit-analysis-sheet'; sheet.hidden = true;
      sheet.innerHTML = '<section class="xm-fit-analysis-panel" role="dialog" aria-modal="true" aria-labelledby="xmFitAnalysisTitle"><div class="xm-sheet-grabber" aria-hidden="true"></div><header class="xm-fit-analysis-sheet-head"><div><span class="xm-fit-analysis-mark">✦</span><div><b id="xmFitAnalysisTitle">训练分析</b><small>今日与本周训练综合分析</small></div></div><button type="button" class="xm-fit-analysis-close" aria-label="关闭">×</button></header><div class="xm-fit-analysis"></div></section>';
      (document.getElementById('rbNav') || document.body).appendChild(sheet);
    }
    if (!sheet.getAttribute('data-xm-analysis-bound')) { sheet.addEventListener('click', function (event) { if (event.target === sheet || event.target.classList.contains('xm-fit-analysis-close')) window.xmCloseFitAnalysis(); }); sheet.setAttribute('data-xm-analysis-bound', '1'); }
    return sheet;
  }
  function restoreAnalysisSheet(sheet) { if (!sheet || sheet.isConnected) return; (document.getElementById('rbNav') || document.body).appendChild(sheet); sheet.hidden = false; renderAnalysis(); }
  window.xmOpenFitAnalysis = function () { var sheet = ensureAnalysisSheet(), panel = sheet.querySelector('.xm-fit-analysis-panel'); sheet.hidden = false; sheet.style.setProperty('display', 'flex', 'important'); sheet.style.setProperty('position', 'fixed', 'important'); sheet.style.setProperty('inset', '0', 'important'); sheet.style.setProperty('z-index', '9999', 'important'); sheet.style.setProperty('align-items', 'flex-end', 'important'); sheet.style.setProperty('justify-content', 'center', 'important'); sheet.style.setProperty('background', 'rgba(55,41,26,.3)', 'important'); if (panel) { panel.style.setProperty('width', 'min(100%, 430px)', 'important'); panel.style.setProperty('max-height', '72svh', 'important'); panel.style.setProperty('overflow', 'auto', 'important'); panel.style.setProperty('background', '#fffdf8', 'important'); panel.style.setProperty('border-radius', '25px 25px 0 0', 'important'); } document.body.classList.add('xm-fit-analysis-open'); renderAnalysis(); setTimeout(function () { restoreAnalysisSheet(sheet); }, 40); };
  window.xmCloseFitAnalysis = function () { var sheet = document.getElementById('xmFitAnalysisSheet'); if (sheet) { sheet.hidden = true; ['display','position','inset','z-index','align-items','justify-content','background'].forEach(function (name) { sheet.style.removeProperty(name); }); var panel = sheet.querySelector('.xm-fit-analysis-panel'); if (panel) ['width','max-height','overflow','background','border-radius'].forEach(function (name) { panel.style.removeProperty(name); }); } document.body.classList.remove('xm-fit-analysis-open'); };
  function renderAnalysis() {
    var root = cardRoot(); if (!root) return;
    var sheet = document.getElementById('xmFitAnalysisSheet'); if (!sheet || sheet.hidden) return;
    var d = daily(currentIso()), w = weekly(), sig = signature(d, w), cache = readCache(), saved = cache[sig], local = localText(d, w), card = sheet.querySelector('.xm-fit-analysis');
    if (!card) return;
    var s = appData(), aiReady = !!s.aiKey, source = saved ? '通义千问已保存' : (busy === sig ? '通义千问分析中' : '本地综合分析'), action = '';
    if (!saved && aiReady) action = busy === sig ? '<small>正在根据今日与本周记录更新</small>' : '<button type="button" onclick="xmFitAiAnalyze()">用 AI 深度分析</button>';
    else if (saved) action = '<button type="button" onclick="xmFitAiAnalyze(true)">重新分析</button>';
    var aiParts = saved && splitAiText(saved.text), todayBody = saved ? aiParts.today : local.today, weekBody = saved ? aiParts.week : local.week;
    card.innerHTML = '<div class="xm-fit-analysis-toolbar"><small>'+source+'</small>'+action+'</div><div class="xm-fit-analysis-body"><b>今日训练</b><p>'+esc(todayBody)+'</p><b>本周节奏</b><p>'+esc(weekBody)+'</p></div>';
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
    if (document.getElementById('xm-fit-polish-style')) { layoutStyles(); finalLayoutStyles(); return; }
    var style = document.createElement('style'); style.id = 'xm-fit-polish-style';
    style.textContent = '.xm-rec-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}.xm-rec-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}.xm-fit-lib-head-btn,.xm-rec-actions .xm-more-btn{font:inherit!important;-webkit-appearance:none!important;text-decoration:none!important;white-space:nowrap}.xm-fit-lib-head-btn{border:1px solid #b6c88e;border-radius:10px;padding:6px 9px;background:#f0f5e4;color:#587328!important;font-size:.58rem;font-weight:900;cursor:pointer}.xm-rec-actions .xm-more-btn{margin:0!important;padding:5px 2px!important;color:#789438!important;background:transparent!important;border:0!important}.xm-fit-analysis{margin-top:12px;border:1px solid #d9c8ad;border-radius:17px;background:linear-gradient(145deg,#fffdf8,#f8f1e3);padding:12px 13px;color:#4b2c18;box-shadow:0 7px 15px rgba(86,64,33,.06)}.xm-fit-analysis-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.xm-fit-analysis-head>div{display:flex;align-items:center;gap:6px;min-width:0}.xm-fit-analysis-mark{display:grid;place-items:center;width:20px;height:20px;border-radius:7px;background:#789438;color:#fff;font-size:.7rem}.xm-fit-analysis-head b{font-size:.78rem;font-weight:900}.xm-fit-analysis-head small{color:#8b7b68;font-size:.5rem;white-space:nowrap}.xm-fit-analysis-head button{border:1px solid #d5a447;border-radius:9px;background:#fff8e8;color:#9a681e;font:inherit;font-size:.53rem;font-weight:900;padding:5px 7px;white-space:nowrap}.xm-fit-analysis-body{margin-top:9px;border-top:1px dashed #e1d4c0;padding-top:8px}.xm-fit-analysis-body b{display:block;color:#789438;font-size:.58rem;margin-top:5px}.xm-fit-analysis-body p{margin:2px 0 0;color:#62503d;font-size:.61rem;line-height:1.55}.rb-fit-pixel button,.rb-fit-pixel a{color:#4b2c18!important;text-decoration:none!important}.rb-fit-pixel .rb-pixel-guide{color:#789438!important}.rb-fit-pixel .rb-pixel-check{color:#fff!important}.rb-sheet{display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:0!important;background:rgba(53,39,25,.28)!important}.rb-sheet[hidden]{display:none!important}.rb-sheet .rb-sheet-panel{box-sizing:border-box;width:min(100%,430px)!important;max-height:min(84svh,680px)!important;overflow:auto!important;margin:0!important;padding:17px 15px calc(16px + env(safe-area-inset-bottom))!important;border-radius:26px 26px 0 0!important;border:1px solid rgba(180,154,112,.5)!important;border-bottom:0!important;background:#fffdf8!important;color:#4b2c18!important;box-shadow:0 -14px 34px rgba(86,64,33,.2)!important;animation:xmFitSheetUp .26s cubic-bezier(.22,1,.36,1)}.xm-sheet-grabber{width:38px;height:4px;border-radius:99px;background:#d8c9b2;margin:0 auto 11px}.rb-sheet button,.rb-sheet input,.rb-sheet select,.rb-sheet b,.rb-sheet small,.rb-sheet span{font-family:inherit!important;color:#4b2c18!important;-webkit-tap-highlight-color:transparent}.rb-sheet button{text-decoration:none!important}.rb-sheet .rb-result-guide{color:#789438!important}.rb-sheet .rb-secondary{color:#806b55!important}.rb-sheet .rb-primary{color:#fff!important;background:#789438!important}.rb-sheet .rb-food-result{min-height:58px!important}.xm-action-result-art{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#f5eedf;border:1px solid #e5d6bd;overflow:hidden}.xm-action-result-art img{width:38px;height:38px;object-fit:contain}.rb-pixel-session-copy,.rb-pixel-session-copy h3,.rb-pixel-session-copy p{color:#4b2c18!important;text-decoration:none!important}.rb-pixel-session-copy{font:inherit!important;background:transparent!important;border:0!important;text-align:left!important;-webkit-appearance:none!important}@keyframes xmFitSheetUp{from{transform:translateY(100%);opacity:.72}to{transform:translateY(0);opacity:1}}@media(prefers-reduced-motion:reduce){.rb-sheet .rb-sheet-panel{animation:none!important}}';
    style.textContent += '.xm-rec-head{position:relative!important;overflow:visible!important}.xm-rec-head>.rb-pixel-section-title{max-width:calc(100% - 154px)!important}.xm-rec-actions{display:flex!important;flex-wrap:nowrap!important;width:max-content!important;max-width:none!important;min-width:max-content!important;gap:3px!important;align-items:center!important}.xm-rec-actions>*{display:inline-flex!important;flex:0 0 auto!important;width:auto!important;white-space:nowrap!important}.xm-fit-lib-head-btn,.xm-fit-analysis-head-btn,.xm-fit-more-head-btn,.xm-rec-actions .xm-more-btn{height:27px!important;min-height:27px!important;padding:0 5px!important;border-radius:8px!important;font-size:10px!important;line-height:25px!important}.xm-fit-lib-head-btn{background:#f0f5e4!important;color:#587328!important;border:1px solid #b6c88e!important}.xm-fit-analysis-head-btn{background:#fff5df!important;color:#9b6b25!important;border:1px solid #d9b978!important}.xm-fit-more-head-btn{background:transparent!important;color:#789438!important;border:0!important}.xm-rec-actions .xm-more-btn{display:inline-flex!important;margin:0!important;padding:0 2px!important}.xm-fit-session-meta{width:100%!important;min-width:0!important;justify-content:flex-end!important;overflow:visible!important}.xm-fit-current-chip{display:inline-flex!important;align-items:center!important;height:24px!important;padding:0 9px!important;border:1px solid #b8c98e!important;border-radius:999px!important;background:#f1f5e5!important;color:#61782f!important;font:inherit!important;font-size:11px!important;font-weight:900!important;line-height:22px!important}';
    document.head.appendChild(style);
    layoutStyles(); finalLayoutStyles();
  }
  function layoutStyles() {
    if (document.getElementById('xm-fit-layout-v2')) return;
    var style = document.createElement('style'); style.id = 'xm-fit-layout-v2';
    style.textContent = '.xm-rec-head{flex-wrap:nowrap!important;min-height:34px!important;margin-bottom:8px!important}.xm-rec-head>.rb-pixel-section-title{flex:1 1 auto!important;min-width:0!important;white-space:nowrap!important}.xm-rec-actions{flex:0 0 auto!important;flex-wrap:nowrap!important;gap:4px!important;white-space:nowrap!important}.xm-fit-lib-head-btn,.xm-fit-analysis-head-btn,.xm-rec-actions .xm-more-btn{box-sizing:border-box!important;height:29px!important;min-width:0!important;padding:0 7px!important;border-radius:9px!important;font-size:11px!important;line-height:27px!important}.xm-fit-lib-head-btn{background:#f0f5e4!important}.xm-fit-analysis-head-btn{border:1px solid #d9b978!important;background:#fff5df!important;color:#9b6b25!important;font-weight:900!important}.xm-rec-actions .xm-more-btn{padding:0 3px!important}.xm-fit-session-head{position:relative!important;display:flex!important;align-items:center!important;flex-wrap:nowrap!important;min-height:34px!important;margin-bottom:0!important}.xm-fit-session-head>.rb-pixel-section-title{flex:1 1 auto!important;margin:0!important;white-space:nowrap!important}.xm-fit-session-head>.rb-pixel-add-action{flex:0 0 auto!important;margin:0!important;white-space:nowrap!important}.xm-fit-session-meta{box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;height:28px!important;margin:1px 2px 5px!important;color:#846d56!important;font-size:11px!important;line-height:28px!important}.xm-fit-session-date{font-weight:800!important;letter-spacing:.02em!important}.xm-fit-back-today{height:24px!important;padding:0 9px!important;border:1px solid #b8c98e!important;border-radius:999px!important;background:#f1f5e5!important;color:#61782f!important;font:inherit!important;font-size:11px!important;font-weight:900!important;line-height:22px!important}.xm-fit-analysis-sheet{position:fixed!important;inset:0!important;z-index:220!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;background:rgba(55,41,26,.3)!important;padding:0!important}.xm-fit-analysis-sheet[hidden]{display:none!important}.xm-fit-analysis-panel{box-sizing:border-box!important;width:min(100%,430px)!important;max-height:min(72svh,560px)!important;overflow:auto!important;padding:10px 15px calc(16px + env(safe-area-inset-bottom))!important;border:1px solid rgba(180,154,112,.52)!important;border-bottom:0!important;border-radius:25px 25px 0 0!important;background:#fffdf8!important;box-shadow:0 -15px 34px rgba(86,64,33,.2)!important;animation:xmFitAnalysisUp .28s cubic-bezier(.22,1,.36,1)!important}.xm-fit-analysis-sheet .xm-sheet-grabber{margin:0 auto 10px!important}.xm-fit-analysis-sheet-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:2px 0 10px!important;border-bottom:1px dashed #e2d4bd!important}.xm-fit-analysis-sheet-head>div{display:flex!important;align-items:center!important;gap:8px!important}.xm-fit-analysis-sheet-head b{display:block!important;color:#4b2c18!important;font-size:16px!important;font-weight:900!important}.xm-fit-analysis-sheet-head small{display:block!important;margin-top:2px!important;color:#9a8066!important;font-size:10px!important}.xm-fit-analysis-close{width:30px!important;height:30px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#f4ead9!important;color:#806b55!important;font:inherit!important;font-size:20px!important;line-height:30px!important}.xm-fit-analysis-sheet .xm-fit-analysis{margin:12px 0 0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;padding:0!important}.xm-fit-analysis-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;min-height:28px!important}.xm-fit-analysis-toolbar>small{color:#789438!important;font-size:11px!important;font-weight:900!important}.xm-fit-analysis-toolbar button{padding:5px 9px!important;border:1px solid #d5a447!important;border-radius:999px!important;background:#fff8e8!important;color:#9a681e!important;font:inherit!important;font-size:11px!important;font-weight:900!important}.xm-fit-analysis-sheet .xm-fit-analysis-body{margin-top:8px!important;padding:11px 12px!important;border:1px solid #ead9bb!important;border-radius:14px!important;background:linear-gradient(145deg,#fffdf8,#f8f1e3)!important}.xm-fit-analysis-sheet .xm-fit-analysis-body b{margin-top:0!important;color:#789438!important;font-size:12px!important}.xm-fit-analysis-sheet .xm-fit-analysis-body b~b{margin-top:12px!important}.xm-fit-analysis-sheet .xm-fit-analysis-body p{margin:3px 0 0!important;color:#62503d!important;font-size:13px!important;line-height:1.65!important}.xm-fit-analysis-sheet .xm-fit-analysis-body p+b{margin-top:10px!important}@keyframes xmFitAnalysisUp{from{transform:translateY(100%);opacity:.7}to{transform:translateY(0);opacity:1}}@media(prefers-reduced-motion:reduce){.xm-fit-analysis-panel{animation:none!important}}';
    document.head.appendChild(style);
  }
  function finalLayoutStyles() {
    if (document.getElementById('xm-fit-layout-final')) return;
    var style = document.createElement('style'); style.id = 'xm-fit-layout-final';
    style.textContent = '.xm-rec-head{display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:nowrap!important;gap:6px!important;min-height:34px!important;position:relative!important}.xm-rec-head>.rb-pixel-section-title{flex:1 1 auto!important;min-width:0!important;max-width:calc(100% - 156px)!important;white-space:nowrap!important}.xm-rec-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;flex:0 0 auto!important;flex-wrap:nowrap!important;gap:4px!important;width:max-content!important;min-width:max-content!important;white-space:nowrap!important}.xm-rec-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;flex:0 0 auto!important;width:auto!important;height:27px!important;min-height:27px!important;margin:0!important;padding:0 5px!important;border-radius:8px!important;font-family:inherit!important;font-size:10px!important;font-weight:900!important;line-height:25px!important;white-space:nowrap!important}.xm-fit-lib-head-btn{border:1px solid #b6c88e!important;background:#f0f5e4!important;color:#587328!important}.xm-fit-analysis-head-btn{border:1px solid #d9b978!important;background:#fff5df!important;color:#9b6b25!important}.xm-fit-more-head-btn{border:0!important;background:transparent!important;color:#789438!important;padding:0 2px!important}.xm-fit-session-meta{box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:100%!important;height:28px!important;margin:1px 2px 5px!important;overflow:visible!important;color:#846d56!important;font-size:11px!important;line-height:28px!important}.xm-fit-session-date{font-weight:800!important;white-space:nowrap!important}.xm-fit-current-chip,.xm-fit-back-today{display:inline-flex!important;align-items:center!important;justify-content:center!important;height:24px!important;padding:0 9px!important;border:1px solid #b8c98e!important;border-radius:999px!important;background:#f1f5e5!important;color:#61782f!important;font:inherit!important;font-size:11px!important;font-weight:900!important;line-height:22px!important;white-space:nowrap!important}.xm-fit-analysis-sheet{position:fixed!important;inset:0!important;z-index:9999!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;box-sizing:border-box!important;padding:0!important;background:rgba(55,41,26,.3)!important}.xm-fit-analysis-sheet[hidden]{display:none!important}.xm-fit-analysis-panel{box-sizing:border-box!important;width:min(100%,430px)!important;max-height:min(72svh,560px)!important;overflow:auto!important;margin:0!important;padding:12px 15px calc(16px + env(safe-area-inset-bottom))!important;border:1px solid rgba(180,154,112,.52)!important;border-bottom:0!important;border-radius:25px 25px 0 0!important;background:#fffdf8!important;color:#4b2c18!important;box-shadow:0 -15px 34px rgba(86,64,33,.2)!important;animation:xmFitAnalysisUp .28s cubic-bezier(.22,1,.36,1)!important}.xm-fit-analysis-sheet .xm-sheet-grabber{width:38px!important;height:4px!important;margin:0 auto 10px!important;border-radius:99px!important;background:#d8c9b2!important}.xm-fit-analysis-sheet-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:2px 0 10px!important;border-bottom:1px dashed #e2d4bd!important}.xm-fit-analysis-sheet-head>div{display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important}.xm-fit-analysis-sheet-head>div>div{min-width:0!important}.xm-fit-analysis-sheet-head b{display:block!important;margin:0!important;color:#4b2c18!important;font-size:16px!important;font-weight:900!important;line-height:1.2!important;white-space:nowrap!important}.xm-fit-analysis-sheet-head small{display:block!important;margin-top:3px!important;color:#9a8066!important;font-size:10px!important;line-height:1.3!important;white-space:nowrap!important}.xm-fit-analysis-mark{display:grid!important;place-items:center!important;flex:0 0 24px!important;width:24px!important;height:24px!important;border-radius:8px!important;background:#789438!important;color:#fff!important;font-size:13px!important}.xm-fit-analysis-close{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 30px!important;width:30px!important;height:30px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:#f4ead9!important;color:#806b55!important;font:inherit!important;font-size:20px!important;line-height:30px!important}.xm-fit-analysis-sheet .xm-fit-analysis{margin:12px 0 0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}.xm-fit-analysis-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;min-height:28px!important}.xm-fit-analysis-toolbar>small{color:#789438!important;font-size:11px!important;font-weight:900!important}.xm-fit-analysis-toolbar button{display:inline-flex!important;align-items:center!important;justify-content:center!important;height:28px!important;padding:0 10px!important;border:1px solid #d5a447!important;border-radius:999px!important;background:#fff8e8!important;color:#9a681e!important;font:inherit!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important}.xm-fit-analysis-sheet .xm-fit-analysis-body{margin-top:8px!important;padding:11px 12px!important;border:1px solid #ead9bb!important;border-radius:14px!important;background:linear-gradient(145deg,#fffdf8,#f8f1e3)!important}.xm-fit-analysis-sheet .xm-fit-analysis-body b{display:block!important;margin:0!important;color:#789438!important;font-size:12px!important;font-weight:900!important;line-height:1.4!important}.xm-fit-analysis-sheet .xm-fit-analysis-body b~b{margin-top:12px!important}.xm-fit-analysis-sheet .xm-fit-analysis-body p{margin:3px 0 0!important;color:#62503d!important;font-size:13px!important;line-height:1.65!important}.xm-fit-analysis-sheet .xm-fit-analysis-body p+b{margin-top:10px!important}@keyframes xmFitAnalysisUp{from{transform:translateY(100%);opacity:.7}to{transform:translateY(0);opacity:1}}@media(prefers-reduced-motion:reduce){.xm-fit-analysis-panel{animation:none!important}}';
    document.head.appendChild(style);
  }
  function refresh() { styles(); wrapExerciseSearch(); wrapSheet(); var root = cardRoot(); if (root) { normalizeFitNav(root); renderAnalysis(); } }
  var screen = document.getElementById('rbScreen');
  if (screen && window.MutationObserver) { var queued = false; new MutationObserver(function () { if (queued) return; queued = true; setTimeout(function () { queued = false; refresh(); }, 0); }).observe(screen, {childList:true, subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 250); }); else setTimeout(refresh, 250);
}());
