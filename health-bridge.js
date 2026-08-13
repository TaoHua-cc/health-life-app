(function () {
  'use strict'

  var KEY = 'apple-health-sync-v1'

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) { return null }
  }

  function value(data, key, digits, suffix) {
    var n = data && Number(data[key])
    if (!isFinite(n)) return '—'
    return (digits ? n.toFixed(digits) : Math.round(n).toLocaleString()) + (suffix || '')
  }

  function render(data) {
    var host = document.getElementById('appleHealthCard')
    if (!host) return
    if (!data || !data.syncedAt) {
      host.innerHTML = '<div class="ah-empty">点击页面右下角“ 健康”授权并同步</div>'
      return
    }
    host.innerHTML = '<div class="ah-grid">'
      + '<div><b>' + value(data, 'steps') + '</b><span>今日步数</span></div>'
      + '<div><b>' + value(data, 'activeEnergy') + '</b><span>活动千卡</span></div>'
      + '<div><b>' + value(data, 'sleepHours', 1) + '</b><span>睡眠小时</span></div>'
      + '<div><b>' + value(data, 'heartRate') + '</b><span>最近心率</span></div>'
      + '</div><div class="ah-time">上次同步：' + new Date(data.syncedAt).toLocaleString() + '</div>'
  }

  function mount() {
    var profile = document.querySelector('#profileOv .ms2')
    if (!profile || document.getElementById('appleHealthCard')) return
    var cards = profile.querySelectorAll('.card')
    var target = cards.length > 1 ? cards[1] : profile.querySelector('.macts')
    var card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = '<div class="ct"> Apple 健康</div><div id="appleHealthCard"></div>'
    profile.insertBefore(card, target)
    var style = document.createElement('style')
    style.textContent = '.ah-grid{display:flex;flex-wrap:wrap;gap:8px}.ah-grid>div{box-sizing:border-box;width:calc(50% - 4px);padding:10px 12px;border-radius:12px;background:rgba(93,128,100,.08);display:flex;flex-direction:column}.ah-grid b{color:#315f40;font-size:1.05rem}.ah-grid span,.ah-time,.ah-empty{color:var(--t2);font-size:.72rem}.ah-time{margin-top:8px}.ah-empty{padding:8px 0}'
    document.head.appendChild(style)
    render(read())
  }

  window.HealthBridge = {
    receive: function (payload) {
      if (!payload || typeof payload !== 'object') return
      localStorage.setItem(KEY, JSON.stringify(payload))
      render(payload)
      if (typeof renderHome === 'function') renderHome()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
  setTimeout(mount, 800)
}())
