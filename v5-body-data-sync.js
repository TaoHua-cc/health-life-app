/* 身体数据同步：让首页实时使用与饮食页相同的 TDEE / 宏量目标。 */
(function () {
  'use strict';
  function number(value) { var n = Number(value); return isFinite(n) ? n : 0; }
  function metrics() {
    var api = window.__xmV5, snapshot = api && api.state ? api.state() : null, s = snapshot && snapshot.S || {}, p = s.profile || {};
    var age = number(p.age) || 25, height = number(p.height) || 170, weight = number(p.weight) || 65;
    var bmr = p.bodyFat && number(p.bodyFat) > 0 ? 370 + 21.6 * weight * (1 - number(p.bodyFat) / 100) : 10 * weight + 6.25 * height - 5 * age + (p.gender === 'female' ? -161 : 5);
    var tdee = bmr * (number(p.activity) || 1.55), mode = p.goalMode || 'maintain';
    var goal = mode === 'lose' ? tdee * .85 : mode === 'gain' ? tdee * 1.15 : tdee;
    var ratio = s.ratio || {c:50,p:30,f:20};
    return {goal:Math.round(goal),carb:Math.round(goal * number(ratio.c || 50) / 100 / 4),protein:Math.round(goal * number(ratio.p || 30) / 100 / 4),fat:Math.round(goal * number(ratio.f || 20) / 100 / 9)};
  }
  function sync() {
    var root = document.querySelector('.xm-home-v6'); if (!root) return;
    var m = metrics(), day = window.__xmV5 && window.__xmV5.day ? window.__xmV5.day() : {}, meals = day.meals || {}, rows = [];
    Object.keys(meals).forEach(function (key) { (meals[key] || []).forEach(function (item) { rows.push(item); }); });
    var values = {carb:0,protein:0,fat:0}; rows.forEach(function (item) { values.carb += number(item.carb); values.protein += number(item.protein); values.fat += number(item.fat); });
    var goal = root.querySelector('.xm-v6-ring-goal'); if (goal && goal.textContent !== '目标 ' + m.goal + ' kcal') goal.textContent = '目标 ' + m.goal + ' kcal';
    ['carb','protein','fat'].forEach(function (key) { var el = root.querySelector('[data-xm="' + key + '"]'), bar = root.querySelector('[data-xm-bar="' + key + '"]'), max = m[key]; if (el) { var text = Math.round(values[key]) + ' g / ' + max + 'g'; if (el.textContent !== text) el.textContent = text; } if (bar) { var width = Math.min(100, Math.round(values[key] / max * 100)) + '%'; if (bar.style.width !== width) bar.style.width = width; } });
  }
  var box = document.getElementById('rbScreen');
  if (box && window.MutationObserver) new MutationObserver(function () { setTimeout(sync, 0); }).observe(box, {childList:true, subtree:true});
  setTimeout(sync, 80);
}());
