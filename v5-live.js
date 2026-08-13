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
  function keyOffset(offset) { var base=String((state().curDate)||new Date().toISOString().slice(0,10)).replace(/-/g,'/'); var d = new Date(base); d.setHours(12,0,0,0); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
  function allItems(date) { var fit=dayData(date).fit||{},out=[];(fit.parts||[]).forEach(function(p){(p.items||[]).forEach(function(x){if(x&&!x.deleted)out.push(Object.assign({partId:p.id,partName:p.name},x));});});return out; }
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
    var d = dayData(), fit = ((d.fit||{}).parts||[]).some(function(p){return (p.items||[]).length;}), meals=d.meals||{}, meal = Object.keys(meals).some(function(k){return (meals[k]||[]).length;});
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
      var line = '<line x1="'+x[i]+'" y1="'+y[i]+'" x2="'+x[i]+'" y2="86" stroke="#dfbf85" stroke-dasharray="3 3" stroke-width="1" opacity="'+(future?'0.45':'1')+'"/>';
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
  function artFor(item) {
    var n=String((item.partName||'')+' '+(item.name||'')).toLowerCase(),f='fit-part-core-v2.png';
    if(/\u5c0f\u817f|calf|calves/.test(n))f='fit-part-calf-v2.png';
    else if(/\u5927\u817f|\u4e0b\u80a2|leg|glute|quad|hamstring/.test(n))f='fit-part-leg-v2.png';
    else if(/\u80f8|chest|pectoral/.test(n))f='fit-part-chest-v2.png';
    else if(/\u80cc|back|lat/.test(n))f='fit-part-back-v2.png';
    else if(/\u80a9|shoulder|delt/.test(n))f='fit-part-shoulder-v2.png';
    else if(/\u624b\u81c2|\u4e8c\u5934|\u4e09\u5934|bicep|tricep/.test(n))f='fit-part-arm-v2.png';
    else if(/\u524d\u81c2|forearm/.test(n))f='fit-part-forearm-v2.png';
    else if(/\u9888|neck/.test(n))f='fit-part-neck-v2.png';
    else if(/\u6709\u6c27|\u8dd1|\u9a91|cardio|run|walk/.test(n))f='fit-part-cardio-v2.png';
    return f;
  }
  function dateStrip(){var s=state(),cur=new Date(String(s.curDate||new Date().toISOString().slice(0,10)).replace(/-/g,'/')),html='<div class="xm-fit-dates">';for(var i=-3;i<=3;i++){var d=new Date(cur);d.setDate(cur.getDate()+i);var k=d.toISOString().slice(0,10);html+='<button class="'+(i===0?'on':'')+'" onclick="__xmV5.selectDate(\''+k+'\')"><small>'+DAY[(d.getDay()+6)%7]+'</small><b>'+d.getDate()+'</b></button>';}return html+'</div>';}
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
      return '<div class="rb-pixel-session-row '+(finished?'xm-done':'pending')+'"><img src="assets/illustrations/'+artFor(item)+'" alt=""><button class="rb-pixel-session-copy xm-edit-action" onclick="xmOpenActionEdit(\''+esc(item.partId)+'\',\''+esc(item.eid)+'\')"><h3>'+esc(item.name || '\u81ea\u5b9a\u4e49\u52a8\u4f5c')+'</h3><p>'+sessionMeta(item)+(finished?' \u00b7 '+TEXT.done:'')+'</p></button><button class="rb-pixel-guide" onclick="__xmV5.openExercise(\''+esc(item.eid)+'\')">'+TEXT.guide+'</button><button class="rb-pixel-check '+(finished?'xm-check':'')+'" onclick="__xmV5.toggleExercise(\''+esc(item.partId)+'\',\''+esc(item.eid)+'\')">'+(finished?'\u2713':'')+'</button></div>';
    }).join('');
    var status=q('.rb-pixel-status',root);if(status&&!q('.xm-fit-dates',root))status.insertAdjacentHTML('beforebegin',dateStrip());
    paintTrend(q('.rb-pixel-trend',root),weekly);
  }
  function refreshHome() {
    var root=q('.rb-home-pixel'); if(!root || !hasRecords()) return;
    var d=dayData(), m=metrics(), goalK=n((state().S||{}).goalKcal||1800), eaten=n(d.kcal || d.calories), mealRows=[];
    Object.keys(d.meals||{}).forEach(function(k){(d.meals[k]||[]).forEach(function(x){mealRows.push(x);});});
    if(!eaten) eaten=mealRows.reduce(function(s,x){return s+n(x.cal||x.kcal||x.calories);},0);
    var ring=q('.rb-home-pixel-ring div',root); if(ring) ring.innerHTML='<b>'+Math.round(eaten)+'</b><span>/'+goalK+' kcal</span><small>\u76ee\u6807 '+goalK+' kcal</small>';
    var macro={carb:0,protein:0,fat:0};mealRows.forEach(function(x){macro.carb+=n(x.carb);macro.protein+=n(x.protein);macro.fat+=n(x.fat);});
    var macroMax={carb:n((state().S||{}).macroCarb||220)||220,protein:n((state().S||{}).macroProtein||110)||110,fat:n((state().S||{}).macroFat||60)||60};
    qa('.rb-home-pixel-macros > div',root).forEach(function(row,i){var k=['carb','protein','fat'][i],b=row.querySelector('b'),em=row.querySelector('em');if(b)b.textContent=Math.round(macro[k])+' g';if(em)em.style.width=Math.min(100,Math.round(macro[k]/macroMax[k]*100))+'%';});
    var foot=qa('.rb-home-pixel-status-foot span',root),mood=(dayData().life||{}).mood||'\ud83d\ude42'; if(foot[0]){foot[0].textContent=mood+' \u5fc3\u60c5';foot[0].setAttribute('onclick','xmOpenMoodPicker()');foot[0].style.cursor='pointer';}if(foot[1]) foot[1].textContent='\u2668 '+Math.round(m.min)+' '+TEXT.min;
    var week=weekData(), complete=week.filter(function(v){return v>=goal();}).length; if(foot[2]) foot[2].textContent='\u25a3 '+complete+' / 4 '+TEXT.times;
    paintTrend(q('.rb-home-pixel-trend',root),week);
  }
  function injectStyle(){ if(q('#xm-live-style'))return; var s=document.createElement('style');s.id='xm-live-style';s.textContent='.xm-fit-dates{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:8px 0 12px}.xm-fit-dates button{border:1px solid #ead8b8;border-radius:11px;background:#fffaf0;padding:5px 2px;color:#65462d}.xm-fit-dates button.on{background:#738d31;color:#fff;border-color:#738d31}.xm-fit-dates small,.xm-fit-dates b{display:block}.xm-edit-action{border:0;background:transparent;text-align:left;padding:0;min-width:0}.rb-pixel-session-row.xm-done{background:#f1e7ce;animation:xmDone .35s ease both}.rb-pixel-session-row .rb-pixel-check{border:0;cursor:pointer}.rb-pixel-session-row .rb-pixel-check.xm-check{background:#799235;color:#fff}.rb-pixel-session-row>img{object-fit:contain!important;width:64px!important;height:58px!important}.rb-body-sheet{position:fixed;inset:0;z-index:9999;background:rgba(57,34,18,.42);display:flex;align-items:flex-end}.rb-body-sheet[hidden]{display:none}.rb-body-panel{background:#fffaf0;border:2px solid #5b321b;border-radius:24px 24px 0 0;width:min(100%,430px);margin:auto;padding:20px;box-sizing:border-box}.rb-body-panel h2{margin:0 0 14px;color:#4a2b19}.rb-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rb-body-grid label{font-size:12px;color:#6f5744}.rb-body-grid input,.rb-body-grid select{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #d6bd97;border-radius:10px;background:#fffdf7}.rb-body-bmr{margin:14px 0;padding:12px;border:1px dashed #d9b06b;border-radius:12px;color:#55762e}.rb-body-actions{display:flex;gap:10px}.rb-body-actions button{flex:1;border:0;border-radius:14px;padding:11px;background:#6f8a2d;color:white;font-weight:700}.rb-body-actions button:first-child{background:#f5ead5;color:#6f5036}.xm-delete{background:#eb6b4b!important}.xm-mood-pop{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.xm-mood-pop button{font-size:25px;border:1px solid #ead8b8;border-radius:12px;background:#fff}@keyframes xmDone{from{transform:translateX(4px);filter:brightness(1.12)}to{transform:none;filter:none}}';document.head.appendChild(s);}
  function bodyValues(){var p=((state().S)||{}).profile||{},w=n(p.weight),h=n(p.height),a=n(p.age),fat=n(p.bodyFat),b=bmr(),bmi=h&&w?w/Math.pow(h/100,2):0,tdee=b*n(p.activity||1.55);return {bmr:b,bmi:bmi,tdee:tdee};}
  function bmr(){var p=((state().S)||{}).profile||{},w=n(p.weight),h=n(p.height),a=n(p.age),fat=n(p.bodyFat);return Math.round(fat>0?w*(1-fat/100)*21.6:(p.gender==='female'?10*w+6.25*h-5*a-161:10*w+6.25*h-5*a+5));}
  window.rbOpenBodyData=function(){injectStyle();var p=(((state().S)||{}).profile)||{},v=bodyValues(),el=q('#rbBodySheet');if(!el){el=document.createElement('div');el.id='rbBodySheet';el.className='rb-body-sheet';document.body.appendChild(el);}el.hidden=false;el.innerHTML='<section class="rb-body-panel"><h2>'+TEXT.body+'</h2><div class="rb-body-grid"><label>'+TEXT.age+'<input id="xmAge" type="number" value="'+n(p.age)+'"></label><label>'+TEXT.height+' (cm)<input id="xmHeight" type="number" value="'+n(p.height)+'"></label><label>'+TEXT.weight+' (kg)<input id="xmWeight" type="number" value="'+n(p.weight)+'"></label><label>'+TEXT.fat+' (%)<input id="xmFat" type="number" value="'+n(p.bodyFat)+'"></label><label>\u6bcf\u65e5\u8fd0\u52a8\u76ee\u6807 (\u5206\u949f)<input id="xmActivityGoal" type="number" min="1" value="'+goal()+'"></label></div><div class="rb-body-bmr">'+TEXT.bmr+'\uff1a<b id="xmBmr">'+v.bmr+' kcal</b><small id="xmBodyExtra">　BMI '+(v.bmi?v.bmi.toFixed(1):'--')+'　·　TDEE '+(v.tdee?Math.round(v.tdee):'--')+' kcal</small></div><div class="rb-body-actions"><button onclick="rbCloseBodyData()">'+TEXT.cancel+'</button><button onclick="rbSaveBodyData()">'+TEXT.save+'</button></div></section>';};
  window.rbCloseBodyData=function(){var el=q('#rbBodySheet');if(el)el.hidden=true;};
  window.rbSaveBodyData=function(){var s=state().S;if(!s)return;s.profile=s.profile||{};s.profile.age=n(q('#xmAge').value);s.profile.height=n(q('#xmHeight').value);s.profile.weight=n(q('#xmWeight').value);s.profile.bodyFat=n(q('#xmFat').value);var a=app();if(a){a.setGoal(n(q('#xmActivityGoal').value));a.save();}rbCloseBodyData();refreshProfile();};
  window.xmOpenActionEdit=function(partId,eid){var item=allItems().find(function(x){return x.partId===partId&&x.eid===eid;});if(!item)return;injectStyle();var el=q('#xmActionSheet');if(!el){el=document.createElement('div');el.id='xmActionSheet';el.className='rb-body-sheet';document.body.appendChild(el);}var cardio=item.type==='cardio'||item.type==='time';el.hidden=false;el.innerHTML='<section class="rb-body-panel"><h2>'+esc(item.name)+'</h2><div class="rb-body-grid"><label>\u7ec4\u6570<input id="xmSets" type="number" min="1" value="'+n(item.sets||3)+'"></label>'+(cardio?'<label>\u65f6\u957f (\u5206\u949f)<input id="xmDuration" type="number" min="1" value="'+n(item.duration||item.minutes||20)+'"></label>':'<label>\u6bcf\u7ec4\u6b21\u6570<input id="xmReps" type="number" min="1" value="'+n(item.reps||12)+'"></label><label>\u91cd\u91cf (kg)<input id="xmWeight2" type="number" min="0" step="0.5" value="'+n(item.weight)+'"></label>')+'</div><div class="rb-body-actions" style="margin-top:14px"><button onclick="xmCloseActionEdit()">'+TEXT.cancel+'</button><button class="xm-delete" onclick="xmDeleteAction(\''+esc(partId)+'\',\''+esc(eid)+'\')">\u5220\u9664</button><button onclick="xmSaveAction(\''+esc(partId)+'\',\''+esc(eid)+'\','+(cardio?'true':'false')+')">'+TEXT.save+'</button></div></section>';};
  window.xmCloseActionEdit=function(){var el=q('#xmActionSheet');if(el)el.hidden=true;};
  window.xmSaveAction=function(partId,eid,cardio){var patch={sets:n(q('#xmSets').value)};if(cardio)patch.duration=n(q('#xmDuration').value);else{patch.reps=n(q('#xmReps').value);patch.weight=n(q('#xmWeight2').value);}app().updateExercise(partId,eid,patch);xmCloseActionEdit();};
  window.xmDeleteAction=function(partId,eid){app().removeExercise(partId,eid);xmCloseActionEdit();};
  window.xmOpenMoodPicker=function(){injectStyle();var el=q('#xmMoodSheet');if(!el){el=document.createElement('div');el.id='xmMoodSheet';el.className='rb-body-sheet';document.body.appendChild(el);}el.hidden=false;el.innerHTML='<section class="rb-body-panel"><h2>\u4eca\u65e5\u5fc3\u60c5</h2><div class="xm-mood-pop">'+['\ud83d\ude04','\ud83d\ude42','\ud83d\ude0a','\ud83d\ude14','\ud83d\ude23'].map(function(x){return '<button onclick="xmChooseMood(\''+x+'\')">'+x+'</button>';}).join('')+'</div><div class="rb-body-actions"><button onclick="xmCloseMoodPicker()">'+TEXT.cancel+'</button></div></section>';};
  window.xmCloseMoodPicker=function(){var el=q('#xmMoodSheet');if(el)el.hidden=true;};
  window.xmChooseMood=function(m){app().setMood(m);xmCloseMoodPicker();};
  function refreshProfile(){var root=q('.rb-ref-profile');if(!root)return;var title=q('.rb-ref-profile-user',root);if(title)title.setAttribute('onclick','rbOpenBodyData()');var grid=q('.rb-ref-health-grid',root);if(grid){var week=weekData(),mins=week.reduce(function(a,v){return a+v;},0),burn=Math.round(mins*8.75),cells=qa('.rb-ref-health-cell',grid);if(cells[0])cells[0].querySelector('b').innerHTML=mins+' <small>'+TEXT.min+'</small>';if(cells[1])cells[1].querySelector('b').innerHTML=burn+' <small>kcal</small>';var cell=q('.xm-bmr-cell',grid);if(!cell){cell=document.createElement('div');cell.className='rb-ref-health-cell xm-bmr-cell';grid.appendChild(cell);}cell.innerHTML='<span class="rb-ref-health-glyph">\u2668</span><b>'+bmr()+' <small>kcal</small></b><span>'+TEXT.bmr+'</span>';}}
  function refresh(){injectStyle();refreshFit();refreshHome();refreshProfile();}
  function wrap(name){var fn=window[name];if(typeof fn!=='function'||fn.__xm)return;function w(){var r=fn.apply(this,arguments);setTimeout(refresh,0);return r;}w.__xm=true;window[name]=w;}
  function init(){['rbNavTo','rbToggleFit','rbSetMood','rbOpenFitPart'].forEach(wrap);var go=window.rbNavTo;if(go){window.addEventListener('hashchange',function(){var p=location.hash.slice(1);if(/^(home|fit|diet|work|life|profile)$/.test(p))go(p);});}var screen=q('#rbScreen'),queued=false;if(screen)new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;refresh();},0);}).observe(screen,{childList:true});refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
