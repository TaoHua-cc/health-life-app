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
    var a = [], base = String((state().curDate)||new Date().toISOString().slice(0,10)).replace(/-/g,'/'), now = new Date(base); now.setHours(12,0,0,0);
    var shift = (now.getDay() + 6) % 7;
    for (var i = 0; i < 7; i++) { var d = new Date(now); d.setDate(now.getDate() - shift + i); a.push(metrics(d.toISOString().slice(0,10)).min); }
    return a;
  }
  function hasRecords() {
    var d = dayData(), fit = ((d.fit||{}).parts||[]).some(function(p){return (p.items||[]).length;}), meals=d.meals||{}, meal = Object.keys(meals).some(function(k){return (meals[k]||[]).length;}), tasks=(d.tasks||[]).length>0, focus=n(d.focus)>0, life=d.life||{};
    return fit || meal || tasks || focus || !!life.mood || Object.keys(life.tags||{}).some(function(k){return (life.tags[k]||[]).length;});
  }
  function hasFitRecords() { var d=dayData(); return ((d.fit||{}).parts||[]).some(function(p){return (p.items||[]).length;}); }
  function streak() {
    var c = 0;
    for (var i=0;i<90;i++) { if (metrics(keyOffset(-i)).done.length) c++; else if (i) break; }
    return c;
  }
  function fmtVolume(v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)); }
  function goal() { var s=state().S||{}; return n(s.weeklyGoal || s.activityGoal || s.exerciseGoal) || 30; }
  function paintTrend(section, values) {
    if (!section) return;
    var svg = q('svg', section), days = qa('.rb-home-pixel-days span,.rb-pixel-days span', section);
    if (!svg) return;
    var max = Math.max(goal() * 2, 60, Math.max.apply(Math, values) * 1.15);
    var x = [10,68,126,184,242,300,350], y = values.map(function(v) { return Math.round(86 - Math.min(78, v / max * 78)); });
    var green = values.map(function(v,i) { return x[i] + ',' + y[i]; }).join(' ');
    var orange = values.map(function(v,i) { return x[i] + ',' + (v >= goal() ? y[i] : 86); }).join(' ');
    var selected = String((state().curDate)||new Date().toISOString().slice(0,10)).replace(/-/g,'/');
    var currentDate = new Date(selected); currentDate.setHours(12,0,0,0);
    var current = (currentDate.getDay() + 6) % 7;
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
    var root=q('.rb-fit-pixel'); if (!root) return;
    if (!hasFitRecords()) {
      if (!q('.xm-fit-dates',root)) { var emptyStatus=q('.rb-pixel-status',root); if (emptyStatus) emptyStatus.insertAdjacentHTML('beforebegin',dateStrip()); }
      return;
    }
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
    var root=q('.rb-home-pixel'); if(!root) return;
    var records=hasRecords(), d=dayData(), m=metrics(), goalK=n((state().S||{}).goalKcal||1800), eaten=n(d.kcal || d.calories), mealRows=[];
    Object.keys(d.meals||{}).forEach(function(k){(d.meals[k]||[]).forEach(function(x){mealRows.push(x);});});
    var hasMeals=mealRows.length>0, hasFit=((d.fit||{}).parts||[]).some(function(p){return (p.items||[]).length;});
    if(!eaten) eaten=mealRows.reduce(function(s,x){return s+n(x.cal||x.kcal||x.calories);},0);
    if (hasMeals) { var ring=q('.rb-home-pixel-ring div',root); if(ring) ring.innerHTML='<b>'+Math.round(eaten)+'</b><span>/'+goalK+' kcal</span><small>\u76ee\u6807 '+goalK+' kcal</small>'; }
    else if (records) { var emptyRing=q('.rb-home-pixel-ring div',root); if(emptyRing) emptyRing.innerHTML='<b>0</b><span>/'+goalK+' kcal</span><small>\u76ee\u6807 '+goalK+' kcal</small>'; }
    var macro={carb:0,protein:0,fat:0};mealRows.forEach(function(x){macro.carb+=n(x.carb);macro.protein+=n(x.protein);macro.fat+=n(x.fat);});
    var macroMax={carb:n((state().S||{}).macroCarb||220)||220,protein:n((state().S||{}).macroProtein||110)||110,fat:n((state().S||{}).macroFat||60)||60};
    if (hasMeals || records) qa('.rb-home-pixel-macros > div',root).forEach(function(row,i){var k=['carb','protein','fat'][i],b=row.querySelector('b'),em=row.querySelector('em'),value=hasMeals?macro[k]:0;if(b)b.textContent=Math.round(value)+' g';if(em)em.style.width=Math.min(100,Math.round(value/macroMax[k]*100))+'%';});
    var mood=(dayData().life||{}).mood||'\ud83d\ude42',foot=qa('.rb-home-status-item',root),moodLabel={'\ud83d\ude04':'开心','\ud83d\ude42':'平静','\ud83d\ude0a':'充实','\ud83d\ude14':'疲惫','\ud83d\ude23':'难过'}[mood]||'开心';
    if(foot[0]){var moodText=q('b',foot[0]),moodSub=q('small',foot[0]);if(moodText)moodText.textContent=moodLabel;if(moodSub)moodSub.textContent='点击选择心情';foot[0].setAttribute('onclick','xmOpenMoodPicker()');foot[0].style.cursor='pointer';}
    if(foot[1]){var mt=q('b',foot[1]);if(mt)mt.textContent=hasFit?Math.round(m.min)+' '+TEXT.min:'未记录';}
    var week=weekData(), complete=week.filter(function(v){return v>=goal();}).length; if(foot[2]){var gt=q('b',foot[2]);if(gt)gt.textContent=hasFit?complete+' / 4 天':'未记录';}
    var keys=['breakfast','lunch','dinner'],imgs=['home-breakfast-bowl.png','home-lunch-salmon.png','home-dinner-soup.png'],labels=['早餐','午餐','晚餐'],mealCards=qa('.rb-home-pixel-meal',root);mealCards.forEach(function(card,i){var rows=(d.meals&&d.meals[keys[i]])||[],total=rows.reduce(function(sum,x){return sum+n(x.cal||x.kcal||x.calories);},0),title=q('b',card),sub=q('small',card);if(title)title.textContent=labels[i];if(sub)sub.textContent=rows.length?Math.round(total)+' kcal':'未记录';var im=q('img',card);if(im){im.src='assets/xiaoman-v3/'+imgs[i];im.alt=labels[i];}});
    if (hasFit) paintTrend(q('.rb-home-pixel-trend',root),week);
    else { var trend=q('.rb-home-pixel-trend',root),svg=trend&&q('svg',trend); if(svg){var green=q('.home-trend-green',svg),orange=q('.home-trend-orange',svg);if(green)green.setAttribute('d','M 10 86 L 350 86');if(orange)orange.setAttribute('d','M 10 86 L 350 86');} }
  }
  function injectStyle(){ if(q('#xm-live-style'))return; var s=document.createElement('style');s.id='xm-live-style';s.textContent='.xm-fit-dates{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:8px 0 12px}.xm-fit-dates button{border:1px solid #ead8b8;border-radius:11px;background:#fffaf0;padding:5px 2px;color:#65462d}.xm-fit-dates button.on{background:#738d31;color:#fff;border-color:#738d31}.xm-fit-dates small,.xm-fit-dates b{display:block}.xm-edit-action{border:0;background:transparent;text-align:left;padding:0;min-width:0}.rb-pixel-session-row.xm-done{background:#f1e7ce;animation:xmDone .35s ease both}.rb-pixel-session-row .rb-pixel-check{border:0;cursor:pointer}.rb-pixel-session-row .rb-pixel-check.xm-check{background:#799235;color:#fff}.rb-pixel-session-row>img{object-fit:contain!important;width:64px!important;height:58px!important}.rb-body-sheet{position:fixed;inset:0;z-index:9999;background:rgba(57,34,18,.42);display:flex;align-items:flex-end}.rb-body-sheet[hidden]{display:none}.rb-body-panel{background:#fffaf0;border:2px solid #5b321b;border-radius:24px 24px 0 0;width:min(100%,430px);margin:auto;padding:20px;box-sizing:border-box}.rb-body-panel h2{margin:0 0 14px;color:#4a2b19}.rb-body-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rb-body-grid label{font-size:12px;color:#6f5744}.rb-body-grid input,.rb-body-grid select{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #d6bd97;border-radius:10px;background:#fffdf7}.rb-body-bmr{margin:14px 0;padding:12px;border:1px dashed #d9b06b;border-radius:12px;color:#55762e}.rb-body-actions{display:flex;gap:10px}.rb-body-actions button{flex:1;border:0;border-radius:14px;padding:11px;background:#6f8a2d;color:white;font-weight:700}.rb-body-actions button:first-child{background:#f5ead5;color:#6f5036}.xm-delete{background:#eb6b4b!important}.xm-mood-pop{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.xm-mood-pop button{font-size:25px;border:1px solid #ead8b8;border-radius:12px;background:#fff}@keyframes xmDone{from{transform:translateX(4px);filter:brightness(1.12)}to{transform:none;filter:none}}';document.head.appendChild(s);}
  var planDay=1;
  function planSectionHtml(){var s=state().S||{},days=s.fitPlanDays||{},names=['\u5468\u4e00','\u5468\u4e8c','\u5468\u4e09','\u5468\u56db','\u5468\u4e94','\u5468\u516d','\u5468\u65e5'],tabs=names.map(function(name,i){var w=i+1;return '<button class="xm-plan-day '+(w===planDay?'on':'')+'" onclick="xmPlanSelectDay('+w+')">'+name+'<small>'+(days[w]||[]).length+'个动作</small></button>';}).join(''),rows=(days[planDay]||[]).map(function(x,i){var meta=x.type==='cardio'||x.type==='time'?((x.dur||20)+' 分钟'):(x.sets||3)+' 组 × '+(x.reps||12)+' 次';return '<div class="xm-plan-row"><span>'+esc(x.alias||x.name||'训练动作')+'</span><small>'+meta+'</small><button onclick="xmPlanDelete('+planDay+','+i+')">删除</button></div>';}).join('');return '<div class="xm-plan-days"><div class="xm-plan-head"><b>按日训练安排</b><button onclick="xmPlanAddPrompt()">＋ 添加动作</button></div><div class="xm-plan-tabs">'+tabs+'</div><div class="xm-plan-list">'+(rows||'<small class="xm-plan-empty">这天还没有安排动作</small>')+'</div></div>';}
  function refreshPlanSection(){var sheet=q('#rbPlanSheet'),old=sheet&&q('.xm-plan-days',sheet);if(old)old.outerHTML=planSectionHtml();}
  function planStyle(){if(q('#xm-plan-style'))return;var s=document.createElement('style');s.id='xm-plan-style';s.textContent='.xm-plan-days{margin:12px 0;padding:12px;border:1px solid #ddc6a0;border-radius:16px;background:#fffaf0}.xm-plan-head,.xm-plan-row{display:flex;align-items:center;gap:8px}.xm-plan-head{justify-content:space-between}.xm-plan-head button,.xm-plan-row button{border:0;border-radius:9px;padding:5px 8px;background:#738d31;color:#fff}.xm-plan-tabs{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:10px 0}.xm-plan-day{border:1px solid #ddc6a0;border-radius:8px;background:#fff;padding:5px 2px;color:#65462d}.xm-plan-day.on{background:#738d31;color:#fff}.xm-plan-day small{display:block;font-size:9px}.xm-plan-list{display:grid;gap:6px}.xm-plan-row{justify-content:space-between;padding:7px 8px;border-radius:9px;background:#fff}.xm-plan-row span{flex:1}.xm-plan-empty{color:#8b745f}';document.head.appendChild(s);}
  function homeStyle(){if(q('#xm-home-style'))return;var s=document.createElement('style');s.id='xm-home-style';s.textContent='.rb-home-pixel-status-foot .rb-home-status-item{display:flex;align-items:center;justify-content:center;gap:4px}.rb-home-pixel-status-foot .rb-home-status-item>i{width:24px;height:24px;display:grid;place-items:center;font-style:normal}.rb-home-pixel-status-foot .status-foot-icon{width:22px;height:22px;object-fit:contain}.rb-home-pixel-status-foot .rb-home-status-item b{font-size:12px}.rb-home-pixel-status-foot .rb-home-status-item small{display:block;font-size:9px;font-weight:600;color:#7b624d}.rb-home-pixel-status-foot .rb-home-status-item>div{line-height:1.15}.rb-home-pixel-status-foot{grid-template-columns:1.1fr 1fr 1fr!important}';document.head.appendChild(s);}
  window.xmPlanSelectDay=function(day){planDay=Math.max(1,Math.min(7,Number(day)||1));refreshPlanSection();};
  window.xmPlanDelete=function(day,index){var s=state().S||{},days=s.fitPlanDays||{},list=days[day]||[];if(!list[index])return;list.splice(index,1);s.fitPlanDays=days;app().save();refreshPlanSection();};
  window.xmPlanAddPrompt=function(){var s=state().S||{},name=window.prompt('输入动作名称');if(!name)return;var db=window.EXERCISE_DB||[],needle=String(name).toLowerCase(),item=db.find(function(x){return String(x.name||'').toLowerCase().indexOf(needle)>=0;});if(!item){window.alert('没有找到这个动作，请先在动作库查看');return;}var days=s.fitPlanDays||{};days[planDay]=days[planDay]||[];days[planDay].push({id:item.id,name:item.name,alias:(item.alias&&item.alias[0])||item.name,grp:item.grp||'',type:item.type||'strength',sets:3,reps:12,weight:0,dur:item.type==='cardio'?20:0});s.fitPlanDays=days;app().save();refreshPlanSection();};
  function wrapPlanManager(){var fn=window.rbOpenPlanManager;if(typeof fn!=='function'||fn.__xmPlan)return;function w(){var r=fn.apply(this,arguments);setTimeout(function(){var sheet=q('#rbPlanSheet'),panel=sheet&&q('.rb-plan-panel',sheet);if(panel&&!q('.xm-plan-days',panel))panel.insertAdjacentHTML('afterbegin',planSectionHtml());},0);return r;}w.__xmPlan=true;window.rbOpenPlanManager=w;}
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
  function refreshProfile(){var root=q('.rb-ref-profile');if(!root)return;var title=q('.rb-ref-profile-user',root);if(title)title.setAttribute('onclick','rbOpenBodyData()');var grid=q('.rb-ref-health-grid',root);if(grid){var week=weekData(),mins=week.reduce(function(a,v){return a+v;},0),burn=Math.round(mins*8.75),cells=qa('.rb-ref-health-cell',grid),v=bodyValues();if(cells[0])cells[0].querySelector('b').innerHTML=mins+' <small>'+TEXT.min+'</small>';if(cells[1])cells[1].querySelector('b').innerHTML=burn+' <small>kcal</small>';var cell=q('.xm-bmr-cell',grid);if(!cell){cell=document.createElement('div');cell.className='rb-ref-health-cell xm-bmr-cell';grid.appendChild(cell);}cell.innerHTML='<span class="rb-ref-health-glyph">\u2668</span><b>'+v.bmr+' <small>kcal</small></b><span>'+TEXT.bmr+' · BMI '+(v.bmi?v.bmi.toFixed(1):'--')+' · TDEE '+(v.tdee?Math.round(v.tdee):'--')+'</span>';}}
  function homePage(){
    return '<div class="rb-home-pixel"><header class="rb-home-pixel-head"><div><h1>早上好，小满 <span class="rb-pixel-sun">☀</span></h1><p>今天也要照顾好自己</p></div><button onclick="rbOpenProfilePage()" aria-label="打开我的"><img src="assets/xiaoman-v3/home-puppy-mug.png" alt="小满拿着热饮"><i class="rb-pixel-sparkle s1"></i><i class="rb-pixel-sparkle s2"></i></button></header><section class="rb-home-pixel-status"><div class="rb-home-pixel-status-title"><span>❧</span> 今日状态 <span>❧</span></div><div class="rb-home-pixel-status-grid"><div class="rb-home-pixel-ring-wrap"><div class="rb-home-pixel-ring"><svg viewBox="0 0 190 190"><circle class="track" cx="95" cy="95" r="74"></circle><circle class="green" cx="95" cy="95" r="74"></circle><circle class="orange" cx="95" cy="95" r="74"></circle></svg><div><b>1280</b><span>kcal</span></div></div><div class="rb-home-pixel-ring-target">目标 1800 kcal</div></div><div class="rb-home-pixel-macros"><div><span class="home-macro-icon carb"><img src="assets/xiaoman-v3/macro-carb-v2.png" alt=""></span><div class="home-macro-text"><label>碳水化合物</label><b>160<small>g / 220g</small></b></div><i><em style="width:73%"></em></i></div><div><span class="home-macro-icon protein"><img src="assets/xiaoman-v3/macro-protein-v2.png" alt=""></span><div class="home-macro-text"><label>蛋白质</label><b>80<small>g / 120g</small></b></div><i><em style="width:67%"></em></i></div><div><span class="home-macro-icon fat"><img src="assets/xiaoman-v3/macro-fat-v2.png" alt=""></span><div class="home-macro-text"><label>脂肪</label><b>40<small>g / 60g</small></b></div><i><em style="width:67%"></em></i></div></div></div><div class="rb-home-pixel-status-foot"><div class="rb-home-status-item mood" role="button" tabindex="0" onclick="xmOpenMoodPicker()"><i><img class="status-foot-icon" src="assets/xiaoman-v3/status-mood-v2.png" alt=""></i><div><b>开心</b><small>今日心情</small></div></div><div class="rb-home-status-item"><i><img class="status-foot-icon" src="assets/xiaoman-v3/status-time-v2.png" alt=""></i><div><b>32 分钟</b><small>运动时长</small></div></div><div class="rb-home-status-item"><i><img class="status-foot-icon" src="assets/xiaoman-v3/status-goal-v2.png" alt=""></i><div><b>3 / 4 次</b><small>运动目标</small></div></div></div></section><section class="rb-home-pixel-meals"><div class="rb-home-pixel-card-head"><span><img src="assets/xiaoman-v3/ui-leaf-sticker.png" alt=""></span>今日饮食<small>详情记录 ›</small></div><div class="rb-home-pixel-meal"><img src="assets/xiaoman-v3/home-breakfast-bowl.png" alt="早餐"><div><b>早餐</b><small>340 kcal</small></div></div><div class="rb-home-pixel-meal"><img src="assets/xiaoman-v3/home-lunch-salmon.png" alt="午餐"><div><b>午餐</b><small>520 kcal</small></div></div><div class="rb-home-pixel-meal"><img src="assets/xiaoman-v3/home-dinner-soup.png" alt="晚餐"><div><b>晚餐</b><small>380 kcal</small></div></div></section><section class="rb-home-pixel-trend"><div class="rb-home-pixel-card-head"><span><img src="assets/xiaoman-v3/ui-leaf-sticker.png" alt=""></span>本周趋势</div><div class="rb-home-pixel-trend-sub">运动时长（分钟）</div><div class="rb-home-pixel-trend-plot"><div class="rb-home-pixel-trend-scale"><span>60</span><span>30</span><span>0</span></div><svg viewBox="0 0 360 105" preserveAspectRatio="none"><path class="grid" d="M0 8H350M0 47H350M0 86H350"></path><path d="M10 76 68 48 126 66 184 30 242 66 300 48 350 76" class="home-trend-green"></path><path d="M10 86 68 86 126 86 184 86 242 86 300 86 350 86" class="home-trend-orange"></path><g><circle cx="10" cy="76" r="4.5"></circle><circle cx="68" cy="48" r="4.5"></circle><circle cx="126" cy="66" r="4.5"></circle><circle class="orange-dot" cx="184" cy="30" r="4.5"></circle><circle cx="242" cy="66" r="4.5"></circle><circle class="orange-dot" cx="300" cy="30" r="4.5"></circle><circle class="hollow-dot" cx="350" cy="20" r="4.5"></circle></g></svg><span class="trend-tip">45</span></div><div class="rb-home-pixel-days"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div></section></div>';
  }
  function refresh(){injectStyle();refreshFit();refreshHome();refreshProfile();}
  function wrap(name){var fn=window[name];if(typeof fn!=='function'||fn.__xm)return;function w(){var r=fn.apply(this,arguments);setTimeout(refresh,0);return r;}w.__xm=true;window[name]=w;}
  function init(){['rbNavTo','rbToggleFit','rbSetMood','rbOpenFitPart'].forEach(wrap);planStyle();homeStyle();wrapPlanManager();window.rbHome=homePage;var go=window.rbNavTo;if(go){window.addEventListener('hashchange',function(){var p=location.hash.slice(1);if(/^(home|fit|diet|work|life|profile)$/.test(p))go(p);});}var screen=q('#rbScreen'),queued=false;if(screen)new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;refresh();},0);}).observe(screen,{childList:true});if(location.hash==='#home'||!location.hash){var appRef=app();if(appRef)appRef.render();}refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
