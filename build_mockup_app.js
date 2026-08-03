const fs=require('fs');
const base=fs.readFileSync('C:/Users/gctyk/WorkBuddy/2026-07-31-04-16-28/design/mockup.html','utf8');
const app=fs.readFileSync('C:/Users/gctyk/WorkBuddy/2026-07-31-04-16-28/deploy/index.html','utf8');

function extractVar(src, varName){
  const start=src.indexOf('var '+varName);
  if(start<0) return null;
  let eq=src.indexOf('=',start);
  if(eq<0) return null;
  let i=eq+1;
  while(/\s/.test(src[i])) i++;
  let depth=0,started=false,end=-1;
  for(let j=i;j<src.length;j++){
    const ch=src[j];
    if(ch==='{'){depth++;started=true;}
    else if(ch==='}'){depth--; if(started&&depth===0){end=j;break;}}
  }
  return src.slice(i,end+1);
}
const foodLit=extractVar(app,'FOOD_DATA');
const playLit=extractVar(app,'PLAY_DATA');
if(!foodLit||!playLit){console.error('DATA_EXTRACT_FAIL food='+(!!foodLit)+' play='+(!!playLit));process.exit(1);}

/* ---- 1) 生活屏标题副标题 ---- */
const oldPhead='<div class="phead"><div class="t">生活</div><div class="s">标签 · 提醒 · 随记</div></div>';
const newPhead='<div class="phead"><div class="t">生活</div><div class="s">吃喝 · 玩乐 · 标签 · 提醒 · 随记</div></div>';
if(base.indexOf(oldPhead)<0){console.error('PHEAD_NOT_FOUND');process.exit(1);}
let out=base.replace(oldPhead,newPhead);

/* ---- 2) 生活屏 chip-row：吃喝/玩乐 放到最前 ---- */
const oldChips='        <div class="chip-row">\n          <div class="chip on">🌿 健康</div><div class="chip">💰 财务</div><div class="chip">📚 学习</div><div class="chip">🎯 目标</div>\n        </div>';
const newChips='        <div class="chip-row" id="lifeChips">\n          <div class="chip on" data-cat="eat" onclick="lifeTab(\'eat\')">🍜 吃喝</div>\n          <div class="chip" data-cat="play" onclick="lifeTab(\'play\')">🎡 玩乐</div>\n          <div class="chip" data-cat="health" onclick="lifeTab(\'health\')">🌿 健康</div>\n          <div class="chip" data-cat="money" onclick="lifeTab(\'money\')">💰 财务</div>\n          <div class="chip" data-cat="study" onclick="lifeTab(\'study\')">📚 学习</div>\n          <div class="chip" data-cat="goal" onclick="lifeTab(\'goal\')">🎯 目标</div>\n        </div>';
if(out.indexOf(oldChips)<0){console.error('CHIPS_NOT_FOUND');process.exit(1);}
out=out.replace(oldChips,newChips);

/* ---- 3) 生活屏内容区：原来的 list+sech+note 换成动态容器 ---- */
const oldBody='        <div class="list">\n          <div class="row"><div class="em">🔔</div><div class="txt"><div class="t1">喝水提醒</div><div class="t2">每 2 小时</div></div><span class="val">开</span></div>\n          <div class="row"><div class="em">🔔</div><div class="txt"><div class="t1">给妈妈打电话</div><div class="t2">今晚 20:00</div></div><span class="val">待</span></div>\n          <div class="row"><div class="em">📝</div><div class="txt"><div class="t1">今日随记</div><div class="t2">状态不错，坚持就是胜利</div></div><span class="val">✎</span></div>\n        </div>\n        <div class="sech">城市美食 · 推荐</div>\n        <div class="note">🍜 附近高蛋白轻食：藜麦碗、嫩牛沙拉 —— 符合你今日「中碳日」目标。</div>';
const newBody='        <div id="lifeContent"></div>';
if(out.indexOf(oldBody)<0){console.error('BODY_NOT_FOUND');process.exit(1);}
out=out.replace(oldBody,newBody);

/* ---- 4) 注入 CSS（mockup 风格的横栏） ---- */
const css=`
  /* life: 吃喝/玩乐 横栏 (与 mockup 同款) */
  .eat-hrow{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none}
  .eat-hrow::-webkit-scrollbar{display:none}
  .eat-card{flex:none;width:148px;background:var(--card);backdrop-filter:var(--glass);-webkit-backdrop-filter:var(--glass);border:1px solid var(--line);border-radius:16px;padding:12px;box-shadow:0 8px 22px rgba(20,30,60,.05);position:relative}
  .eat-rk{position:absolute;top:-9px;left:-9px;min-width:24px;height:24px;padding:0 5px;border-radius:12px;background:var(--pri);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(10,132,255,.4)}
  .eat-nm{font-size:14px;font-weight:700;margin-top:2px;line-height:1.2}
  .eat-cat{font-size:11px;color:var(--ink3);margin-top:4px;font-weight:600}
  .eat-pr{font-size:12px;font-weight:800;color:var(--carb);margin-top:7px}
`;
if(out.indexOf('</style>')<0){console.error('STYLE_NOT_FOUND');process.exit(1);}
out=out.replace('</style>', css+'\n</style>');

/* ---- 5) 注入 JS：真实榜单数据 + 渲染 ---- */
const js=`
  var FOOD_DATA = ${foodLit};
  var PLAY_DATA = ${playLit};
  function escHtml(s){return (s==null?'':(''+s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function renderEat(){
    var d=FOOD_DATA['陕西']['西安'];var h='';
    h+='<div class="sech">🏆 西安美食 TOP '+d.top.length+'</div>';
    h+='<div class="eat-hrow">';
    d.top.forEach(function(x){h+='<div class="eat-card"><div class="eat-rk">'+(x.r<=3?'★':x.r)+'</div><div class="eat-nm">'+escHtml(x.n)+'</div><div class="eat-cat">'+escHtml(x.c)+'</div><div class="eat-pr">'+escHtml(x.p)+'</div></div>';});
    h+='</div>';
    h+='<div class="sech">🌟 今日推荐</div><div class="list">';
    d.top.slice(0,3).forEach(function(x){h+='<div class="row"><div class="em">🍴</div><div class="txt"><div class="t1">'+escHtml(x.n)+'</div><div class="t2">'+escHtml(x.c)+(x.must?' · '+escHtml(x.must):'')+'</div></div><span class="val">'+escHtml(x.p)+'</span></div>';});
    h+='</div>';
    h+='<div class="sech">🍜 美食街区榜</div><div class="list">';
    (d.streets||[]).forEach(function(s){h+='<div class="row"><div class="em">📍</div><div class="txt"><div class="t1">'+escHtml(s.n)+'</div><div class="t2">'+escHtml(s.i)+' · 必吃：'+escHtml(s.m)+'</div></div></div>';});
    h+='</div>';
    if(d.route&&d.route.length){h+='<div class="sech">🗺️ 必吃路线</div>';d.route.forEach(function(r){h+='<div class="note">🍽 '+escHtml(r)+'</div>';});}
    if(d.tips){h+='<div class="sech">💡 搭配 & 避坑</div><div class="note">✅ '+(d.tips.combos||[]).join('；')+'<br>🚫 '+(d.tips.avoid||[]).join('；')+'<br>💡 '+(d.tips.advice||[]).join('；')+'</div>';}
    document.getElementById('lifeContent').innerHTML=h;
  }
  function renderPlay(){
    var d=PLAY_DATA['陕西']['西安'];var h='';
    h+='<div class="sech">🏆 西安玩乐 TOP '+d.top.length+'</div>';
    h+='<div class="eat-hrow">';
    d.top.forEach(function(x){h+='<div class="eat-card"><div class="eat-rk">'+(x.r<=3?'★':x.r)+'</div><div class="eat-nm">'+escHtml(x.n)+'</div><div class="eat-cat">'+escHtml(x.c)+'</div><div class="eat-pr">'+escHtml(x.p)+'</div></div>';});
    h+='</div>';
    h+='<div class="sech">🌟 今日推荐</div><div class="list">';
    d.top.slice(0,3).forEach(function(x){h+='<div class="row"><div class="em">🎡</div><div class="txt"><div class="t1">'+escHtml(x.n)+'</div><div class="t2">'+escHtml(x.c)+(x.must?' · '+escHtml(x.must):'')+'</div></div><span class="val">'+escHtml(x.p)+'</span></div>';});
    h+='</div>';
    h+='<div class="sech">🎡 玩乐街区榜</div><div class="list">';
    (d.streets||[]).forEach(function(s){h+='<div class="row"><div class="em">📍</div><div class="txt"><div class="t1">'+escHtml(s.n)+'</div><div class="t2">'+escHtml(s.i)+' · 必玩：'+escHtml(s.m)+'</div></div></div>';});
    h+='</div>';
    if(d.route&&d.route.length){h+='<div class="sech">🗺️ 必玩路线</div>';d.route.forEach(function(r){h+='<div class="note">🎟 '+escHtml(r)+'</div>';});}
    if(d.tips){h+='<div class="sech">💡 搭配 & 避坑</div><div class="note">✅ '+(d.tips.combos||[]).join('；')+'<br>🚫 '+(d.tips.avoid||[]).join('；')+'<br>💡 '+(d.tips.advice||[]).join('；')+'</div>';}
    document.getElementById('lifeContent').innerHTML=h;
  }
  function staticLife(cat){
    if(cat==='health'){return '<div class="list"><div class="row"><div class="em">🔔</div><div class="txt"><div class="t1">喝水提醒</div><div class="t2">每 2 小时</div></div><span class="val">开</span></div><div class="row"><div class="em">🔔</div><div class="txt"><div class="t1">给妈妈打电话</div><div class="t2">今晚 20:00</div></div><span class="val">待</span></div><div class="row"><div class="em">📝</div><div class="txt"><div class="t1">今日随记</div><div class="t2">状态不错，坚持就是胜利</div></div><span class="val">✎</span></div></div>';}
    var m={money:'💰 财务：记录今日开销，月底回看更清晰。',study:'📚 学习：每天读几页，复利最可怕。',goal:'🎯 目标：把大目标拆成今天能做的一小步。'};
    return '<div class="note">'+(m[cat]||'')+'</div>';
  }
  function lifeTab(cat){
    document.querySelectorAll('#lifeChips .chip').forEach(function(c){c.classList.toggle('on', c.dataset.cat===cat);});
    var box=document.getElementById('lifeContent');
    if(cat==='eat'){renderEat();}
    else if(cat==='play'){renderPlay();}
    else{box.innerHTML=staticLife(cat);}
  }
  lifeTab('eat');
`;
if(out.indexOf('</script>')<0){console.error('SCRIPT_NOT_FOUND');process.exit(1);}
out=out.replace('</script>', js+'\n</script>');

fs.writeFileSync('C:/Users/gctyk/WorkBuddy/2026-07-31-04-16-28/deploy/index.html', out);
console.log('BUILD_OK len='+out.length);
