/* Xiaoman completion trend: the fitness chart follows completed exercises. */
(function () {
  'use strict';

  var DAY = ['一', '二', '三', '四', '五', '六', '日'];
  var GOAL = 3;

  function appState() {
    try { return window.__xmV5 && window.__xmV5.state ? window.__xmV5.state() : {}; } catch (e) { return {}; }
  }

  function localDate(d) {
    var y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  function weekDates(anchor) {
    var d = new Date(String(anchor || localDate(new Date())).replace(/-/g, '/'));
    if (isNaN(d.getTime())) d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var out = [];
    for (var i = 0; i < 7; i++) {
      var next = new Date(d);
      next.setDate(d.getDate() + i);
      out.push(localDate(next));
    }
    return out;
  }

  function completedCount(days, date) {
    var day = days[date] || {}, parts = day.fit && day.fit.parts || [], count = 0;
    parts.forEach(function (part) {
      (part.items || []).forEach(function (item) {
        if (item && !item.deleted && (item.done || item.ck)) count++;
      });
    });
    return count;
  }

  var lastKey = '';
  function render() {
    if (!document.body.classList.contains('rb-fit-page')) return;
    var card = document.querySelector('body.rb-fit-page .rb-fit-pixel .xm-v6-trend');
    if (!card) return;
    var state = appState(), store = state.S || {}, days = store.days || {};
    var dates = weekDates(state.curDate), today = localDate(new Date());
    var values = dates.map(function (date) { return completedCount(days, date); });
    var current = dates.indexOf(state.curDate || today);
    if (current < 0) current = dates.indexOf(today);
    if (current < 0) current = 6;
    var key = dates.join('|') + '|' + values.join(',') + '|' + current;
    if (key === lastKey) return;
    lastKey = key;
    var max = Math.max(6, Math.ceil(Math.max.apply(Math, values) / 3) * 3);
    var x = [12, 68, 124, 180, 236, 292, 348];
    var y = values.map(function (value) { return Math.round(108 - Math.min(76, value / max * 76)); });
    var title = card.querySelector('.xm-v6-card-head b');
    var sub = card.querySelector('strong');
    var scale = card.querySelector('.xm-v6-scale');
    var svg = card.querySelector('svg');
    if (!svg) return;
    if (title) title.textContent = '完成趋势';
    if (sub) sub.textContent = '本周完成 ' + values.slice(0, current + 1).reduce(function (a, b) { return a + b; }, 0) + ' 次';
    if (scale) scale.innerHTML = '<span>' + max + '</span><span>' + Math.round(max / 2) + '</span><span>0</span>';
    var points = values.map(function (value, i) { return x[i] + ',' + y[i]; }).join(' ');
    var markup = '<path class="grid" d="M0 12H356M0 65H356M0 118H356"></path>';
    markup += '<polyline class="line" points="' + points + '" fill="none" stroke="#789438" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></polyline>';
    values.forEach(function (value, i) {
      var future = i > current, hot = !future && value >= GOAL;
      markup += '<line x1="' + x[i] + '" y1="' + y[i] + '" x2="' + x[i] + '" y2="118" stroke="#d8bd8d" stroke-width="1" stroke-dasharray="3 3" opacity="' + (future ? '.45' : '1') + '"></line>';
      if (hot) markup += '<rect x="' + (x[i] - 14) + '" y="' + Math.max(1, y[i] - 25) + '" width="28" height="16" rx="8" fill="#f2683d"></rect><text x="' + x[i] + '" y="' + Math.max(13, y[i] - 12) + '" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">' + value + '</text>';
      markup += '<circle cx="' + x[i] + '" cy="' + y[i] + '" r="' + (future ? '5' : '6') + '" fill="' + (future ? '#fffdf8' : (hot ? '#f2683d' : '#789438')) + '" stroke="' + (future ? '#806b55' : '#fffdf8') + '" stroke-width="2.5"' + (future ? ' stroke-dasharray="3 2"' : '') + '></circle>';
    });
    svg.innerHTML = markup;
    var tip = card.querySelector('.xm-v6-tip'), peak = Math.max.apply(Math, values.slice(0, current + 1));
    if (tip) { tip.textContent = peak >= GOAL ? peak : ''; tip.style.display = peak >= GOAL ? '' : 'none'; }
    card.querySelectorAll('.xm-v6-days span').forEach(function (el, i) { el.textContent = DAY[i]; });
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; render(); }, 0);
  }

  function init() {
    schedule();
    var screen = document.querySelector('#rbScreen');
    if (screen && window.MutationObserver) new MutationObserver(schedule).observe(screen, { childList: true, subtree: true });
    ['rbToggleFit', 'rbNavTo'].forEach(function (name) {
      var fn = window[name];
      if (typeof fn !== 'function' || fn.__completionTrendWrapped) return;
      var wrapped = function () { var result = fn.apply(this, arguments); schedule(); return result; };
      wrapped.__completionTrendWrapped = true;
      window[name] = wrapped;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
