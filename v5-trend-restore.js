/*
 * Rebuild the weekly trend SVG after v5-live renders its data.  Keeping this
 * as a small presentation layer means the source of truth remains the live
 * workout records and the chart cannot drift back to preview coordinates.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var X = [26, 77, 128, 179, 230, 281, 332];
  var BASELINE = 118;
  var CURRENT_MARK = '__xmTrendRestore';

  function n(value) {
    var number = Number(value);
    return isFinite(number) ? number : 0;
  }

  function iso(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function snapshot() {
    try {
      return window.__xmV5 && typeof window.__xmV5.state === 'function'
        ? (window.__xmV5.state() || {}) : {};
    } catch (error) {
      return {};
    }
  }

  function dayFor(date) {
    try {
      if (window.__xmV5 && typeof window.__xmV5.day === 'function') {
        return window.__xmV5.day(date) || {};
      }
    } catch (error) {}
    var data = snapshot();
    return data.S && data.S.days && data.S.days[date] || {};
  }

  function activityMinutes(item) {
    if (!item || !item.done) return 0;
    if (item.type === 'cardio' || item.type === 'time') {
      return n(item.duration || item.minutes || item.time);
    }
    if (item.duration) return n(item.duration);
    return Math.max(3, n(item.sets) * 2);
  }

  function minutesFor(date) {
    var day = dayFor(date);
    var parts = day.fit && day.fit.parts || [];
    var minutes = 0;
    parts.forEach(function (part) {
      (part.items || []).forEach(function (item) {
        if (!item.deleted) minutes += activityMinutes(item);
      });
    });
    return Math.round(minutes);
  }

  function week() {
    var data = snapshot();
    var selected = String(data.curDate || iso(new Date())).slice(0, 10);
    var base = new Date(selected.replace(/-/g, '/'));
    if (isNaN(base.getTime())) base = new Date();
    base.setHours(12, 0, 0, 0);
    var monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    var values = [];
    for (var index = 0; index < 7; index += 1) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + index);
      values.push(minutesFor(iso(day)));
    }
    return {
      values: values,
      current: (base.getDay() + 6) % 7
    };
  }

  function goal() {
    var data = snapshot();
    var state = data.S || {};
    return n(state.weeklyGoal || state.activityGoal || state.exerciseGoal) || 30;
  }

  function element(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function paint(card, values, current) {
    var svg = card.querySelector('.xm-v6-chart svg');
    if (!svg) return;
    var maximum = Math.max(goal() * 2, 60, Math.max.apply(Math, values) * 1.15);
    var y = values.map(function (value) {
      return Math.round(BASELINE - Math.min(100, value / maximum * 100));
    });
    var lineEnd = Math.max(0, Math.min(6, current));
    var past = X.slice(0, lineEnd + 1).map(function (x, index) {
      return x + ' ' + y[index];
    }).join(' L ');
    var future = X.slice(lineEnd, 7).map(function (x, index) {
      return x + ',' + y[index + lineEnd];
    }).join(' ');
    var actualCount = lineEnd + 1;
    var actualValues = values.slice(0, actualCount);

    svg.setAttribute('viewBox', '0 0 360 140');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '';
    svg.appendChild(element('path', {
      'class': 'grid',
      d: 'M0 12H356M0 65H356M0 118H356'
    }));

    var fillPoints = actualValues.map(function (value, index) {
      return X[index] + ',' + y[index];
    });
    if (fillPoints.length) {
      fillPoints.push(X[lineEnd] + ',' + BASELINE);
      fillPoints.push(X[0] + ',' + BASELINE);
      svg.appendChild(element('polygon', {
        'class': 'trend-fill',
        points: fillPoints.join(' ')
      }));
    }
    svg.appendChild(element('path', {
      'class': 'line',
      d: 'M ' + past
    }));
    if (current < 6) {
      svg.appendChild(element('polyline', {
        'class': 'trend-future-line',
        points: future
      }));
    }

    var markers = element('g', { 'class': 'trend-markers' });
    values.forEach(function (value, index) {
      var futurePoint = index > current;
      var hot = value >= goal() && value > 0 && !futurePoint;
      markers.appendChild(element('line', {
        x1: X[index], y1: y[index], x2: X[index], y2: BASELINE,
        'stroke-dasharray': '3 3',
        opacity: futurePoint ? '.45' : '1'
      }));
      if (hot) {
        var labelY = Math.max(1, y[index] - 27);
        markers.appendChild(element('rect', {
          x: X[index] - 16, y: labelY, width: 32, height: 18, rx: 9,
          fill: '#f2683d'
        }));
        var text = element('text', {
          x: X[index], y: labelY + 13,
          'text-anchor': 'middle', fill: '#fff',
          'font-size': '11', 'font-weight': '700'
        });
        text.textContent = String(Math.round(value));
        markers.appendChild(text);
      }
      markers.appendChild(element('circle', {
        cx: X[index], cy: y[index], r: futurePoint ? 5.5 : 7,
        fill: futurePoint ? '#fffdf8' : (value > 0 ? (hot ? '#f2683d' : '#789438') : '#fffdf8'),
        stroke: futurePoint || value === 0 ? '#806b55' : '#fffdf8',
        'stroke-width': futurePoint || value === 0 ? '2' : '2.5',
        opacity: futurePoint ? '.72' : '1'
      }));
    });
    svg.appendChild(markers);
  }

  function repaint() {
    var data = week();
    document.querySelectorAll('.xm-v6-trend').forEach(function (card) {
      paint(card, data.values, data.current);
    });
  }

  function install() {
    if (window.refreshHomeV6 && !window.refreshHomeV6[CURRENT_MARK]) {
      var original = window.refreshHomeV6;
      var wrapped = function () {
        var result = original.apply(this, arguments);
        setTimeout(repaint, 0);
        return result;
      };
      wrapped[CURRENT_MARK] = true;
      window.refreshHomeV6 = wrapped;
    }
    repaint();
    var screen = document.querySelector('#rbScreen');
    if (screen && !screen[CURRENT_MARK]) {
      screen[CURRENT_MARK] = new MutationObserver(function () {
        setTimeout(repaint, 0);
      });
      screen[CURRENT_MARK].observe(screen, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
  setTimeout(install, 250);
  setTimeout(install, 900);
})();
