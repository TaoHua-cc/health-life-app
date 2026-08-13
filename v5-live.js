/* Xiaoman V5 live-data bridge. This layer keeps the approved V5 artwork while
   replacing its reference-only numbers whenever the user has real records. */
(function () {
  'use strict';
  var DAY = ['\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d','\u65e5'];
  var TEXT = {
    done: '\u5df2\u5b8c\u6210', guide: '\u8bb2\u89e3', min: '\u5206\u949f',
    times: '\u6b21', week: '\u672c\u5468', status: '\u4eca\u65e5\u72b6\u6001',
    body: '\u8eab\u4f53\u6570\u636e', bmr: '\u57fa\u7840\u4ee3\u8c22\u7387',
    save: '\u4fdd\u5b58', cancel: '\u53d6\u6d88', height: '\u8eab\u9ad8',
    weight: '\u4f53\u91cd', age: '\u5e74\u9f84', fat: '\u4f53\u8102'
  };
  function q(s, root) { return (root || document).querySelector(s); }
  function qa(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function n(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function esc(v) { return String(v || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function app() { return window.__xmV5 || null; }
  function state() { var a=app(); return a ? a.state() : {}; }
  function dayData(date) { try { var a=app(); return a ? a.day(date || state().curDate) : {}; } catch (e) { return {}; } }
  function keyOffset(offset) { var d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
  function allItems(date) { var f = dayData(date).fit || []; return f.filter(function (x) { return x && !x.deleted; }); }
  function activityMinutes(item) {
    if (item.type === 'cardio' || item.type === 'time') return n(item.duration || item.minutes || item.time);
    if (item.duration) return n(item.duration);
    return item.done ? Math.max(3, n(item.sets) * 2) : 0;
  }
  function metrics(date) {
    var list = allItems(date), done = list.filter(function (x) { return x.done; });
    var min = done.reduce(function (sum, x) { return sum + activityMinutes(x); }, 0);
    var volume = done.reduce(function (sum, x) { return sum + n(x.sets || 0) * n(x.reps || 0) * n(x.weight || 0); }, 0);
    return { list:list, done:done, min:min, kcal:Math.round(min * 8.75), volume:volume };
  }
  function weekData() {
    var a = [], now = new Date(); now.setHours(12,0,0,0);
    var shift = (now.getDay() + 6) % 7;
    for (var i = 0; i < 7; i++) { var d = new Date(now); d.setDate(now.getDate() - shift + i); a.push(metrics(d.toISOString().slice(0,10)).min); }
    return a;
  }
  function hasRecords() {
    var d = dayData(), fit = (d.fit || []).length, meal = (d.meals || d.foods || []).length;
    return fit > 0 || meal > 0;
  }
  function streak() {
    var c = 0;
    for (var i=0;i<90;i++) { if (metrics(keyOffset(-i)).done.length) c++; else if (i) break; }
    return c;
  }
  function fmtVolume(v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)); }
  function goal() { var s=state().S||{}; return n(s.weeklyGoal || s.activityGoal || s.exerciseGoal) || 30; }
  function paintTrend(section, values) {
    if (!section || !values.some(Boolean)) return;
    var svg = q('svg', section), days = qa('.rb-home-pixel-days span,.rb-pixel-days span', section);
    if (!svg) return;
    var max = Math.max(goal() * 2, 60, Math.max.apply(Math, values) * 1.15);
    var x = [10,68,126,184,242,300,350], y = values.map(function(v) { return Math.round(86 - Math.min(78, v / max * 78)); });
    var green = values.map(function(v,i) { return x[i] + ',' + y[i]; }).join(' ');
    var orange = values.map(function(v,i) { return x[i] + ',' + (v >= goal() ? y[i] : 86); }).join(' ');
    var current = (new Date().getDay() + 6) % 7;
    var dots = values.map(function(v,i) {
      var future = i > current, hot = v >= goal();
      var dash = i === 6 && future ? ' stroke-dasharray="4 3"' : '';
      var line = '<line x1="'+x[i]+'" y1="'+y[i]+'" x2="'+x[i]+'" y2="86" stroke="#dfbf85" stroke-dasharray="3 3" stroke-width="1"/>';
      var dot = '<circle cx="'+x[i]+'" cy="'+y[i]+'" r="5" fill="'+(hot?'#fb6235':'#789535')+'" stroke="#fff8ea" stroke-width="2"'+dash+'/>';
      var tag = hot ? '<rect x="'+(x[i]-14)+'" y="'+Math.max(2,y[i]-25)+'" width="28" height="16" rx="8" fill="#fb6235"/><text x="'+x[i]+'" y="'+Math.max(13,y[i]-12)+'" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">'+Math.round(v)+'</text>' : '';
      return line + tag + dot;
    }).join('');
    var paths = qa('polyline,path', svg);
    var pGreen = q('.home-trend-green,.trend-olive', svg), pOrange = q('.home-trend-orange,.trend-orange', svg);
    if (pGreen) { if (pGreen.tagName.toLowerCase()==='polyline') pGreen.setAttribute('points',green); else pGreen.setAttribute('d','M '+green.replace(/ /g,' L ')); }
    if (pOrange) { if (pOrange.tagName.toLowerCase()==='polyline') pOrange.setAttribute('points',orange); else pOrange.setAttribute('d','M '+orange.replace(/ /g,' L ')); }
    var g = q('g', svg); if (g) g.innerHTML = dots;
    days.forEach(function(el,i){ el.textContent = DAY[i]; });
  }
  function sessionMeta(item) {
    var sets=n(item.sets), reps=n(item.reps), weight=n(item.weight), duration=n(item.duration || item.minutes || item.time);
    if (item.type === 'cardio') return Math.round(duration || 20) + ' ' + TEXT.min;
    if (item.type === 'time') return Math.round(duration || 1) + ' ' + TEXT.min;
    if (weight > 0) return sets + ' \u7ec4\u00d7' + reps + ' \u6b21 \u00b7 ' + weight + 'kg';
    return sets + ' \u7ec4\u00d7' + reps + ' \u6b21';
  }
  function artFor(item, index) {
    var n = String(item.name || '').toLowerCase();
    if (/\u5e73\u677f|plank/.test(n)) return 'fit-puppy-plank.png';
    if (/\u6df1\u8e72|\u4e0b\u80a2|squat/.test(n)) return 'fit-puppy-squat.png';
    return index ? 'fit-puppy-stretch.png' : 'fit-puppy-stretch.png';
  }
  function refreshFit() {
    var root=q('.rb-fit-pixel'); if (!root || !hasRecords()) return;
    var m=metrics(), weekly=weekData(), weeklyDays=weekly.filter(function(v){return v>0;}).length;
    var ring=q('.rb-pixel-ring-copy',root); if(ring) ring.innerHTML='<b>'+Math.round(m.min)+'</b><span>'+TEXT.min+'</span><small>'+TEXT.week+' '+weeklyDays+'/4 '+TEXT.times+'</small>';
    var cards=qa('.rb-pixel-metrics > div',root);
    if(cards[0]) cards[0].querySelector('b').innerHTML=fmtVolume(m.volume || 0);
    if(cards[1]) cards[1].querySelector('b').innerHTML=Math.round(m.kcal)+' <small>kcal</small>';
    if(cards[2]) cards[2].querySelector('b').textContent=streak()+' '+TEXT.times;
    var session=q('.rb-pixel-session',root);
    if(session) session.innerHTML=m.list.map(function(item,i){
      var finished=!!item.done;
      return '<div class="rb-pixel-session-row '+(finished?'xm-done':'pending')+'"><img src="assets/illustrations/'+artFor(item,i)+'" alt=""><div class="rb-pixel-session-copy"><h3>'+esc(item.name || '\u81ea\u5b9a\u4e49\u52a8\u4f5c')+'</h3><p>'+sessionMeta(item)+(finished?' \u00b7 '+TEXT.done:'')+'</p></div><button class="rb-pixel-guide" onclick="__xmV5.openExercise(\''+esc(item.eid || item.id)+'\')">'+TEXT.guide+'</button><button class="rb-pixel-check '+(finished?'xm-check':'')+'" onclick="rbToggleFit(\''+esc(item.id)+'\')">'+(finished?'\u2713':'')+'</button></div>';
    }).join('');
    paintTrend(q('.rb-pixel-trend',root),weekly);
  }
  function refreshHome() {
    var root=q('.rb-home-pixel'); if(!root || !hasRecords()) return;
    var d=dayData(), m=metrics(), goalK=n((state().S||{}).goalKcal||1800), eaten=n(d.kcal || d.calories);
    if(!eaten && Array.isArray(d.meals)) eaten=d.meals.reduce(function(s,x){return s+n(x.kcal||x.calories);},0);
    var ring=q('.rb-home-pixel-ring div',root); if(ring) ring.innerHTML='<b>'+Math.round(eaten)+'</b><span>/'+goalK+' kcal</span><small>\u76ee\u6807 '+goalK+' kcal</small>';
    var foot=qa('.rb-home-pixel-status-foot span',root); if(foot[1]) foot[1].textContent='\u2668 '+Math.round(m.min)+' '+TEXT.min;
    var week=weekData(), complete=week.filter(function(v){return v>=goal();}).length; if(foot[2]) foot[2].textContent='\u25a3 '+complete+' / 4 '+TEXT.times;
    paintTrend(q('.rb-home-pixel-trend',root),week);
  }
  function injectStyle(){ if(q('#xm-live-style'))return; var s=document.createElement('style');s.id='xm-live-style';s.textContent='.rb-pixel-session-row.xm-done{background:#f4edd9;animation:xmDone .35s ease both}.rb-pixel-session-row .rb-pixel-check{border:0;cursor:pointer}.rb-pixel-session-row .rb-pixel-check.xm-check{background:#799235;color:#fff}.rb-pixel-session-row img{object-fit:contain!important}.rb-body-sheet{position:fixed;inset:0;z-index:9999;background:rgba(57,34,18,.42);display:flex;align-items:flex-end}.rb-body-sheet[hidden]{display:none}.rb-body-panel{background:#fffaf0;border:2px solid #5b321b;border-radius:24px 24px 0 0;width:min(100%,430px);margin:auto;padding:20px;box-sizing:border-box}.rb-body-panel h2{margin:0 0 14px;color:#4a2b19}.rb-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rb-body-grid label{font-size:12px;color:#6f5744}.rb-body-grid input{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #d6bd97;border-radius:10px;background:#fffdf7}.rb-body-bmr{margin:14px 0;padding:12px;border:1px dashed #d9b06b;border-radius:12px;color:#55762e}.rb-body-actions{display:flex;gap:10px}.rb-body-actions button{flex:1;border:0;border-radius:14px;padding:11px;background:#6f8a2d;color:white;font-weight:700}.rb-body-actions button:first-child{background:#f5ead5;color:#6f5036}@keyframes xmDone{from{transform:translateX(4px);filter:brightness(1.12)}to{transform:none;filter:none}}';document.head.appendChild(s);}
  function bmr(){var p=((state().S)||{}).profile||{},w=n(p.weight),h=n(p.height),a=n(p.age),fat=n(p.bodyFat);return Math.round(fat>0?w*(1-fat/100)*21.6:(p.gender==='female'?10*w+6.25*h-5*a-161:10*w+6.25*h-5*a+5));}
  window.rbOpenBodyData=function(){injectStyle();var p=(((state().S)||{}).profile)||{},el=q('#rbBodySheet');if(!el){el=document.createElement('div');el.id='rbBodySheet';el.className='rb-body-sheet';document.body.appendChild(el);}el.hidden=false;el.innerHTML='<section class="rb-body-panel"><h2>'+TEXT.body+'</h2><div class="rb-body-grid"><label>'+TEXT.age+'<input id="xmAge" type="number" value="'+n(p.age)+'"></label><label>'+TEXT.height+' (cm)<input id="xmHeight" type="number" value="'+n(p.height)+'"></label><label>'+TEXT.weight+' (kg)<input id="xmWeight" type="number" value="'+n(p.weight)+'"></label><label>'+TEXT.fat+' (%)<input id="xmFat" type="number" value="'+n(p.bodyFat)+'"></label></div><div class="rb-body-bmr">'+TEXT.bmr+'：<b id="xmBmr">'+bmr()+' kcal</b></div><div class="rb-body-actions"><button onclick="rbCloseBodyData()">'+TEXT.cancel+'</button><button onclick="rbSaveBodyData()">'+TEXT.save+'</button></div></section>';};
  window.rbCloseBodyData=function(){var el=q('#rbBodySheet');if(el)el.hidden=true;};
  window.rbSaveBodyData=function(){var s=state().S;if(!s)return;s.profile=s.profile||{};s.profile.age=n(q('#xmAge').value);s.profile.height=n(q('#xmHeight').value);s.profile.weight=n(q('#xmWeight').value);s.profile.bodyFat=n(q('#xmFat').value);var a=app();if(a)a.save();rbCloseBodyData();refreshProfile();};
  function refreshProfile(){var root=q('.rb-ref-profile');if(!root)return;var title=q('.rb-ref-profile-user',root);if(title)title.setAttribute('onclick','rbOpenBodyData()');var grid=q('.rb-ref-health-grid',root);if(grid){var week=weekData(),mins=week.reduce(function(a,v){return a+v;},0),burn=Math.round(mins*8.75),cells=qa('.rb-ref-health-cell',grid);if(cells[0])cells[0].querySelector('b').innerHTML=mins+' <small>'+TEXT.min+'</small>';if(cells[1])cells[1].querySelector('b').innerHTML=burn+' <small>kcal</small>';var cell=q('.xm-bmr-cell',grid);if(!cell){cell=document.createElement('div');cell.className='rb-ref-health-cell xm-bmr-cell';grid.appendChild(cell);}cell.innerHTML='<span class="rb-ref-health-glyph">\u2668</span><b>'+bmr()+' <small>kcal</small></b><span>'+TEXT.bmr+'</span>';}}
  function refresh(){injectStyle();refreshFit();refreshHome();refreshProfile();}
  function wrap(name){var fn=window[name];if(typeof fn!=='function'||fn.__xm)return;function w(){var r=fn.apply(this,arguments);setTimeout(refresh,0);return r;}w.__xm=true;window[name]=w;}
  function init(){['rbNavTo','rbToggleFit','rbSetMood','rbOpenFitPart'].forEach(wrap);var go=window.rbNavTo;if(go){window.addEventListener('hashchange',function(){var p=location.hash.slice(1);if(/^(home|fit|diet|work|life|profile)$/.test(p))go(p);});}var screen=q('#rbScreen'),queued=false;if(screen)new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;refresh();},0);}).observe(screen,{childList:true});refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
