/* Xiaoman profile: real local data + an actionable Qwen settings entry. */
(function () {
  'use strict';

  function api() { return window.__xmV5 || null; }
  function state() { var a = api(); return a && a.state ? a.state() : {S:{},curDate:''}; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function isoDate(value) { var date = value ? new Date(String(value).replace(/-/g, '/')) : new Date(); if (isNaN(date.getTime())) date = new Date(); date.setHours(12, 0, 0, 0); return date; }
  function iso(date) { return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2); }
  function weekDates(current) { var date = isoDate(current), monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return Array.from({length:7}, function (_, index) { var d = new Date(monday); d.setDate(monday.getDate() + index); return iso(d); }); }
  function dayStat(day) {
    var fit = day && day.fit || {}, items = []; (fit.parts || []).forEach(function (part) { (part.items || []).forEach(function (item) { if (item && !item.deleted) items.push(item); }); });
    var done = items.filter(function (item) { return item.done; }), minutes = done.reduce(function (total, item) { return total + Number(item.duration || item.minutes || (item.done ? Math.max(3, Number(item.sets || 0) * 2) : 0)); }, 0);
    var meals = day && day.meals || {}, mealCount = Object.keys(meals).reduce(function (total, key) { return total + (meals[key] || []).length; }, 0);
    return {minutes:Math.round(minutes), kcal:Math.round(minutes * 8.75), mealCount:mealCount, focus:Math.round(Number(day && day.focus || 0) / 60), hasFit:items.length > 0};
  }
  function profileStats() {
    var current = state(), days = current.S && current.S.days || {}, dates = weekDates(current.curDate), stats = dates.map(function (date) { return dayStat(days[date] || {}); });
    return {minutes:stats.reduce(function (total, item) { return total + item.minutes; }, 0), kcal:stats.reduce(function (total, item) { return total + item.kcal; }, 0), meals:stats.reduce(function (total, item) { return total + item.mealCount; }, 0), focus:stats.reduce(function (total, item) { return total + item.focus; }, 0), active:stats.filter(function (item) { return item.hasFit; }).length};
  }
  function aiLabel(s) { return s.aiKey ? '已配置 · ' + (s.aiProvider === 'sensenova' ? '商汤' : '通义千问') : '未配置 · 点击添加'; }
  function toast(message) { if (typeof window.toast === 'function') window.toast(message); else window.alert(message); }
  function profilePage() {
    var current = state(), s = current.S || {}, stats = profileStats(), name = s.name || '小满';
    return '<main class="xm-profile-page"><header class="xm-profile-head"><div><h1>我的</h1><p>把身体数据与生活设置，放在一个顺手的位置</p></div><button class="xm-profile-gear" type="button" onclick="xmOpenAiSettings()" aria-label="打开 AI 设置">⚙</button></header>' +
      '<button class="xm-profile-user" type="button" onclick="rbEditProfile()"><img src="assets/xiaoman-v3/profile-puppy-avatar.png" alt="小满头像"><span><b>' + esc(name) + '</b><small>编辑身体数据与昵称</small></span><i>›</i></button>' +
      '<section class="xm-profile-section"><div class="xm-profile-section-title"><h2>本周记录</h2><small>' + stats.active + ' 天有训练</small></div><div class="xm-profile-stats"><div><b>' + stats.minutes + '<small>分钟</small></b><span>运动时长</span></div><div><b>' + stats.kcal + '<small>kcal</small></b><span>消耗热量</span></div><div><b>' + stats.meals + '<small>份</small></b><span>饮食记录</span></div><div><b>' + stats.focus + '<small>分钟</small></b><span>专注时长</span></div></div></section>' +
      '<button class="xm-profile-ai-entry" type="button" onclick="xmOpenAiSettings()"><span class="xm-profile-ai-mark">AI</span><span><b>AI 助手设置</b><small>配置通义千问，用于饮食、训练和经期建议</small></span><em>' + esc(aiLabel(s)) + '　›</em></button>' +
      '<button class="xm-profile-sync" type="button" onclick="xmHealthSyncInfo()"><img src="assets/xiaoman-v3/profile-health-sync.png" alt="健康同步"><span><b>健康数据同步</b><small>网页端先使用本地记录；小程序端可在授权后接入系统健康数据</small></span><em>说明　›</em></button>' +
      '<h2 class="xm-profile-services-title">服务与设置</h2><section class="xm-profile-services"><button type="button" onclick="rbNavTo(\'home\')"><span class="xm-profile-service-icon">▥</span><span><b>数据统计</b><small>查看首页趋势和本周记录</small></span><i>›</i></button><button type="button" onclick="rbEditProfile()"><span class="xm-profile-service-icon">⌁</span><span><b>目标设置</b><small>修改年龄、身高、体重和活动目标</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'提醒设置已保留入口，微信小程序端可继续接入系统提醒。\')"><span class="xm-profile-service-icon">◷</span><span><b>提醒设置</b><small>训练、饮水和记录提醒</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'你的数据默认只保存在当前设备浏览器中。\')"><span class="xm-profile-service-icon">◇</span><span><b>隐私与安全</b><small>本地存储与 AI Key 使用说明</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'小满日常 · 健康生活记录\')"><span class="xm-profile-service-icon">·</span><span><b>关于小满日常</b><small>版本与功能说明</small></span><i>›</i></button></section></main>';
  }
  function aiOverlay() {
    var current = state(), s = current.S || {}, overlay = document.getElementById('xmAiSettingsOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div'); overlay.id = 'xmAiSettingsOverlay'; overlay.className = 'xm-ai-settings-overlay';
    overlay.innerHTML = '<section class="xm-ai-settings-panel" role="dialog" aria-modal="true" aria-labelledby="xmAiSettingsTitle"><header><button type="button" onclick="xmCloseAiSettings()" aria-label="关闭">‹</button><div><span>服务与设置</span><h2 id="xmAiSettingsTitle">AI 助手设置</h2></div><span class="xm-ai-qwen-badge">Qwen</span></header><div class="xm-ai-provider"><span class="xm-ai-provider-logo">Q</span><div><b>通义千问</b><small>用于训练建议、饮食分析和图像识别</small></div><strong>当前引擎</strong></div><label class="xm-ai-field"><span>API Key</span><input id="xmAiKey" type="password" autocomplete="off" placeholder="粘贴 DashScope API Key" value="' + esc(s.aiKey || '') + '"></label><label class="xm-ai-field"><span>文字模型</span><select id="xmAiTextModel"><option value="qwen-turbo">qwen-turbo · 快速</option><option value="qwen-plus">qwen-plus · 更强分析</option></select></label><label class="xm-ai-field"><span>图像模型</span><select id="xmAiVisionModel"><option value="qwen-vl-max">qwen-vl-max · 食物识别</option><option value="qwen-vl-plus">qwen-vl-plus · 图像理解</option></select></label><label class="xm-ai-field"><span>中转代理（可选）</span><input id="xmAiProxy" type="url" placeholder="需要跨域代理时填写" value="' + esc(s.aiProxy || '') + '"></label><p class="xm-ai-hint">Key 只保存到当前浏览器的本地数据中。未填写时，应用继续使用本地规则生成建议。</p><div id="xmAiSettingsStatus" class="xm-ai-settings-status" role="status"></div><footer><button type="button" class="xm-ai-test" onclick="xmTestAiSettings()">测试连接</button><button type="button" class="xm-ai-save" onclick="xmSaveAiSettings()">保存设置</button></footer></section>';
    document.body.appendChild(overlay); document.body.classList.add('xm-ai-settings-open');
    var textModel = document.getElementById('xmAiTextModel'), visionModel = document.getElementById('xmAiVisionModel'); if (textModel) textModel.value = s.aiModel || 'qwen-turbo'; if (visionModel) visionModel.value = s.aiVisionModel || 'qwen-vl-max';
    overlay.addEventListener('click', function (event) { if (event.target === overlay) window.xmCloseAiSettings(); });
  }
  window.xmOpenAiSettings = aiOverlay;
  window.xmCloseAiSettings = function () { var overlay = document.getElementById('xmAiSettingsOverlay'); if (overlay) overlay.remove(); document.body.classList.remove('xm-ai-settings-open'); };
  window.xmSaveAiSettings = function () {
    var current = state(), s = current.S || {}, key = (document.getElementById('xmAiKey') || {}).value || '', textModel = (document.getElementById('xmAiTextModel') || {}).value || 'qwen-turbo', visionModel = (document.getElementById('xmAiVisionModel') || {}).value || 'qwen-vl-max', proxy = ((document.getElementById('xmAiProxy') || {}).value || '').trim(), status = document.getElementById('xmAiSettingsStatus');
    key = key.trim(); if (key && key.length < 8) { if (status) status.textContent = 'API Key 长度不正确，请检查后再保存。'; return; }
    s.aiProvider = 'qwen'; s.aiKey = key; s.aiModel = textModel; s.aiVisionModel = visionModel; s.aiProxy = proxy; if (api() && api().save) api().save(); window.xmCloseAiSettings(); if (typeof window.rbNavTo === 'function') window.rbNavTo('profile'); toast(key ? '通义千问设置已保存' : '已关闭云端 AI，继续使用本地建议');
  };
  window.xmTestAiSettings = function () {
    var key = ((document.getElementById('xmAiKey') || {}).value || '').trim(), model = (document.getElementById('xmAiTextModel') || {}).value || 'qwen-turbo', proxy = ((document.getElementById('xmAiProxy') || {}).value || '').trim(), status = document.getElementById('xmAiSettingsStatus');
    if (!key) { if (status) status.textContent = '请先填写 API Key，再测试连接。'; return; }
    if (status) status.textContent = '正在测试通义千问连接…';
    var target = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', url = proxy ? proxy.replace(/\/?$/, '') + '?target=' + encodeURIComponent(target) : target;
    fetch(url, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + key}, body:JSON.stringify({model:model,messages:[{role:'user',content:'只回复：连接成功'}],temperature:0})}).then(function (response) { return response.json().then(function (data) { return {ok:response.ok,data:data}; }); }).then(function (result) { if (!status) return; if (result.ok && !(result.data && result.data.error)) status.textContent = '连接成功，可以使用通义千问生成建议。'; else status.textContent = '连接失败：' + (((result.data || {}).error || {}).message || (result.data || {}).message || '请检查 Key、模型或代理地址。'); }).catch(function () { if (status) status.textContent = '连接失败：浏览器跨域或网络不可用，可填写中转代理后重试。'; });
  };
  window.xmHealthSyncInfo = function () { toast('网页端暂不直接连接系统健康数据；本地训练、饮食和专注记录仍会正常统计。'); };
  window.xmProfileMessage = function (message) { toast(message); };
  var originalNav = window.rbNavTo;
  function syncProfileNav() {
    document.querySelectorAll('#rbNav button').forEach(function (button) { button.classList.toggle('on', button.textContent.indexOf('生活') >= 0); });
  }
  function navigate(page) {
    if (page !== 'profile' && typeof originalNav === 'function') return originalNav(page);
    var screen = document.getElementById('rbScreen'); if (!screen) return;
    document.body.classList.remove('rb-home-page', 'rb-fit-page'); document.body.classList.add('rb-ref-page'); screen.innerHTML = profilePage(); screen.scrollTop = 0; syncProfileNav();
  }
  window.rbNavTo = navigate;
  window.rbOpenProfilePage = function () { navigate('profile'); };
  if (window.location.hash === '#profile') navigate('profile');
}());
