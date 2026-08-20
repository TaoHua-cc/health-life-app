/* Xiaoman plan library: a richer catalog surface over the existing plan details. */
(function () {
  'use strict';

  var LIBRARY = [
    { id:'fat-burn-beg', name:'全身燃脂', level:'初级', category:'燃脂塑形', tag:'燃脂', color:'#ef5c2b', desc:'低门槛全身循环，先建立稳定运动习惯。', dur:20, kcal:210, art:'fit-puppy-dumbbell.png', focus:['全身','心肺','无器械'], schedule:'每周 3–4 次 · 间隔一天恢复' },
    { id:'hiit-burn', name:'HIIT 燃脂', level:'进阶', category:'燃脂塑形', tag:'燃脂', color:'#ef5c2b', desc:'短时高效间歇训练，适合已有运动基础。', dur:18, kcal:220, art:'fit-puppy-wave.png', focus:['心肺','爆发力','居家'], schedule:'每周 2–3 次 · 不连续安排' },
    { id:'loss-easy', name:'减重入门', level:'轻松', category:'燃脂塑形', tag:'减重', color:'#d99b1f', desc:'低冲击踏步与轻有氧，给身体温和的启动。', dur:18, kcal:130, art:'fit-puppy-wave.png', focus:['低冲击','燃脂','新手'], schedule:'每周 4–5 次 · 可拆成两段完成' },
    { id:'core-mid', name:'核心激活', level:'中级', category:'核心体态', tag:'核心', color:'#738d31', desc:'唤醒腹部与躯干控制，改善久坐后的松散感。', dur:15, kcal:150, art:'fit-puppy-plank.png', focus:['腹部','核心','体态'], schedule:'每周 3 次 · 训练后加做拉伸' },
    { id:'abs-line', name:'马甲线', level:'中级', category:'核心体态', tag:'核心', color:'#738d31', desc:'腹直肌、侧腹与稳定性组合，循序建立线条。', dur:15, kcal:120, art:'fit-puppy-plank.png', focus:['腹部','侧腹','稳定'], schedule:'每周 3–4 次 · 留出恢复日' },
    { id:'posture-fix', name:'体态矫正', level:'中级', category:'核心体态', tag:'体态', color:'#6b8b68', desc:'从肩胛、胸椎和核心入手，缓解圆肩驼背。', dur:16, kcal:110, art:'fit-part-back-v2.png', focus:['肩背','核心','久坐'], schedule:'每天 1 次 · 工作间隙也可练' },
    { id:'leg-adv', name:'下肢力量', level:'进阶', category:'力量增肌', tag:'力量', color:'#5a7bb8', desc:'腿部复合动作组合，提升下肢力量与稳定。', dur:25, kcal:240, art:'fit-puppy-squat.png', focus:['腿部','臀腿','力量'], schedule:'每周 2–3 次 · 组间充分休息' },
    { id:'upper-shape', name:'上肢塑形', level:'中级', category:'力量增肌', tag:'塑形', color:'#b36c90', desc:'胸背肩臂均衡安排，让上肢训练更有章法。', dur:16, kcal:130, art:'fit-puppy-dumbbell.png', focus:['肩臂','胸背','塑形'], schedule:'每周 2–3 次 · 与下肢交替' },
    { id:'glute-shape', name:'蜜桃臀', level:'进阶', category:'力量增肌', tag:'臀腿', color:'#b36c90', desc:'臀大肌与髋部发力练习，强化臀腿连接。', dur:16, kcal:140, art:'fit-puppy-squat.png', focus:['臀部','髋部','腿部'], schedule:'每周 2–3 次 · 避免连续训练' },
    { id:'yoga-stretch', name:'瑜伽拉伸', level:'轻松', category:'拉伸恢复', tag:'拉伸', color:'#5794a7', desc:'放松髋、背和腿后侧，结束一天的紧绷。', dur:14, kcal:60, art:'fit-puppy-stretch.png', focus:['柔韧','放松','恢复'], schedule:'每天 1 次 · 睡前很适合' },
    { id:'neck-relax', name:'肩颈放松', level:'轻松', category:'拉伸恢复', tag:'放松', color:'#5794a7', desc:'针对久坐后的肩颈紧张，动作轻柔易跟练。', dur:10, kcal:50, art:'fit-puppy-stretch.png', focus:['肩颈','久坐','舒缓'], schedule:'每天 1–2 次 · 每次 10 分钟' },
    { id:'morning-wake', name:'晨间唤醒', level:'轻松', category:'日常唤醒', tag:'唤醒', color:'#c08b35', desc:'用温和活动打开关节，让身体进入清醒状态。', dur:12, kcal:70, art:'fit-puppy-wave.png', focus:['晨练','关节','轻运动'], schedule:'每天早晨 · 起床后即可开始' }
  ];
  var FILTERS = ['全部', '燃脂塑形', '力量增肌', '核心体态', '拉伸恢复', '日常唤醒'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function card(plan) {
    return '<article class="xm-plan-library-card" data-category="' + esc(plan.category) + '" data-plan-id="' + esc(plan.id) + '">' +
      '<div class="xm-plan-library-art"><img src="assets/illustrations/' + esc(plan.art) + '" alt="' + esc(plan.name) + '训练插画"></div>' +
      '<div class="xm-plan-library-card-main"><div class="xm-plan-library-card-top"><span class="xm-plan-library-tag" style="background:' + esc(plan.color) + '">' + esc(plan.tag) + '</span><span class="xm-plan-library-level">' + esc(plan.level) + '</span></div>' +
      '<h3>' + esc(plan.name) + '</h3><p class="xm-plan-library-card-desc">' + esc(plan.desc) + '</p>' +
      '<div class="xm-plan-library-meta"><span>' + plan.dur + ' 分钟</span><span>约 ' + plan.kcal + ' kcal</span></div>' +
      '<div class="xm-plan-library-focus">' + plan.focus.map(function (item) { return '<span>' + esc(item) + '</span>'; }).join('') + '</div>' +
      '<div class="xm-plan-library-card-foot"><small>' + esc(plan.schedule) + '</small><button type="button" onclick="event.stopPropagation();__xmV5.openPlanDetail(\'' + esc(plan.id) + '\')">查看内容</button></div></div>' +
      '</article>';
  }

  function page() {
    return '<main class="xm-plan-library"><header class="xm-plan-library-head"><button class="xm-plan-library-back" type="button" onclick="__xmV5.backToFit()" aria-label="返回健身页"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg></button><div class="xm-plan-library-title"><h1>训练计划库</h1><p>按目标挑一套，今天从第一步开始</p></div><span class="xm-plan-library-bookmark" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5A2.5 2.5 0 0 1 9.5 2h5A2.5 2.5 0 0 1 17 4.5V21l-5-3-5 3V4.5Z"/></svg></span></header>' +
      '<section class="xm-plan-library-hero"><strong>把目标拆成一周</strong><p>从燃脂、力量到拉伸恢复，选择与你今天状态匹配的训练安排。开始后会写入今日训练，可继续调整动作。</p><div class="xm-plan-library-summary"><span>12 套计划</span><span>5 类目标</span><span>10–25 分钟</span></div></section>' +
      '<div class="xm-plan-library-section-head"><h2>找到适合今天的计划</h2><small><b id="xmPlanCount">12</b> 套可选</small></div>' +
      '<nav class="xm-plan-library-filter" aria-label="训练计划筛选">' + FILTERS.map(function (filter, i) { return '<button type="button" class="' + (i === 0 ? 'on' : '') + '" data-filter="' + esc(filter) + '" onclick="xmFilterPlans(\'' + esc(filter) + '\')">' + esc(filter) + '</button>'; }).join('') + '</nav>' +
      '<section class="xm-plan-library-list" aria-label="训练计划列表">' + LIBRARY.map(card).join('') + '<div class="xm-plan-library-empty" hidden>暂时没有符合条件的计划，换一个目标看看。</div></section></main>';
  }

  window.xmFilterPlans = function (filter) {
    var cards = document.querySelectorAll('.xm-plan-library-card'), visible = 0;
    document.querySelectorAll('.xm-plan-library-filter button').forEach(function (button) { button.classList.toggle('on', button.getAttribute('data-filter') === filter); });
    cards.forEach(function (item) {
      var show = filter === '全部' || item.getAttribute('data-category') === filter;
      item.hidden = !show;
      if (show) visible += 1;
    });
    var count = document.getElementById('xmPlanCount');
    if (count) count.textContent = visible;
    var empty = document.querySelector('.xm-plan-library-empty');
    if (empty) empty.hidden = visible > 0;
  };

  window.renderPlanCatalogPage = page;
}());
