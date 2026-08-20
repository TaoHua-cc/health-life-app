/* Keep the home trend in its own 0-86 SVG coordinate system. */
(function () {
  'use strict';

  var DAY = ['一', '二', '三', '四', '五', '六', '日'];
  var X = [26, 77, 128, 179, 230, 281, 332];
  var BASELINE = 86;
  var lastCard = null;
  var lastSignature = '';

  function state() {
    try { return window.__xmV5 && window.__xmV5.state ? window.__xmV5.state() : {}; } catch (e) { return {}; }
  }

  function iso(date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  }

  function weekDates(anchor) {
    var base = new Date(String(anchor || iso(new Date())).replace(/-/g, '/'));
    if (isNaN(base.getTime())) base = new Date();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    var dates = [];
    for (var i = 0; i < 7; i += 1) {
      var day = new Date(base);
      day.setDate(base.getDate() + i);
      dates.push(iso(day));
    }
    return dates;
  }

  function minutes(item) {
    if (!item || !item.done) return 0;
    if (item.type === 'cardio' || item.type === 'time') return Number(item.duration || item.minutes || item.time) || 0;
    if (item.duration) return Number(item.duration) || 0;
    return Math.max(3, (Number(item.sets) || 0) * 2);
  }

  function valuesFor(dates, days) {
    return dates.map(function (date) {
      var fit = days[date] && days[date].fit || {}, total = 0;
      (fit.parts || []).forEach(function (part) {
        (part.items || []).forEach(function (item) {
          if (item && !item.deleted) total += minutes(item);
        });
      });
      return Math.round(total);
    });
  }

  function render() {
    if (!document.body.classList.contains('rb-home-page')) return;
    var card = document.querySelector('body.rb-home-page .xm-v6-trend');
    if (!card) return;
    var data = state(), store = data.S || {}, dates = weekDates(data.curDate), values = valuesFor(dates, store.days || {});
    var current = dates.indexOf(data.curDate || iso(new Date()));
    if (current < 0) current = 6;
    var signature = values.join(',') + '|' + current;
    var svg = card.querySelector('.xm-v6-chart svg');
    var line = svg && svg.querySelector('.line');
    var covered = !line || /\b112\b/.test(line.getAttribute('d') || '');
    if (!svg || (card === lastCard && signature === lastSignature && svg.getAttribute('data-xm-home-fixed') === '1' && !covered)) return;
    lastCard = card;
    lastSignature = signature;

    var max = Math.max(60, Math.max.apply(Math, values) * 1.15);
    var y = values.map(function (value) { return Math.round(BASELINE - Math.min(78, value / max * 78)); });
    var past = values.slice(0, current + 1).map(function (value, i) { return X[i] + ' ' + y[i]; }).join(' L ');
    var future = values.slice(current).map(function (value, i) { return X[i + current] + ',' + y[i + current]; }).join(' ');
    var marks = values.map(function (value, i) {
      var futurePoint = i > current;
      return '<line x1="' + X[i] + '" y1="' + y[i] + '" x2="' + X[i] + '" y2="' + BASELINE + '" stroke="#d8bd8d" stroke-width="1" stroke-dasharray="3 3" opacity="' + (futurePoint ? '.45' : '1') + '"></line>' +
        '<circle cx="' + X[i] + '" cy="' + y[i] + '" r="' + (futurePoint ? '4.5' : '5.5') + '" fill="' + (futurePoint ? '#fffdf8' : (value ? '#789438' : '#fffdf8')) + '" stroke="' + (futurePoint || !value ? '#806b55' : '#fffdf8') + '" stroke-width="2"' + (futurePoint ? ' opacity=".55"' : '') + '></circle>';
    }).join('');

    svg.setAttribute('viewBox', '0 0 360 105');
    svg.setAttribute('data-xm-home-fixed', '1');
    svg.innerHTML = '<path class="grid" d="M0 8H350M0 47H350M0 86H350"></path>' +
      '<path class="line" d="M ' + past + '"></path>' +
      (current < 6 ? '<polyline class="trend-future-line" points="' + future + '"></polyline>' : '') +
      '<g class="trend-markers">' + marks + '</g>';
    var scale = card.querySelectorAll('.xm-v6-scale span');
    if (scale.length >= 3) { scale[0].textContent = '60'; scale[1].textContent = '30'; scale[2].textContent = '0'; }
    card.querySelectorAll('.xm-v6-days span').forEach(function (el, i) { el.textContent = DAY[i]; });
  }

  function schedule() { setTimeout(render, 0); }

  function wrap(name) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__xmHomeTrendFix) return;
    var wrapped = function () { var result = fn.apply(this, arguments); schedule(); return result; };
    wrapped.__xmHomeTrendFix = true;
    window[name] = wrapped;
  }

  function init() {
    wrap('refreshHomeV6');
    wrap('rbNavTo');
    schedule();
    var screen = document.querySelector('#rbScreen');
    if (screen && window.MutationObserver) new MutationObserver(schedule).observe(screen, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
