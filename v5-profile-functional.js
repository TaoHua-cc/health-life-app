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
  function bodyMetrics(s) {
    var p = s.profile || {}, age = Number(p.age) || 25, height = Number(p.height) || 170, weight = Number(p.weight) || 65;
    var bmr = p.bodyFat && Number(p.bodyFat) > 0 ? 370 + 21.6 * weight * (1 - Number(p.bodyFat) / 100) : 10 * weight + 6.25 * height - 5 * age + (p.gender === 'female' ? -161 : 5);
    var activity = Number(p.activity) || 1.55, tdee = bmr * activity, mode = p.goalMode || 'maintain';
    var goal = mode === 'lose' ? tdee * .85 : mode === 'gain' ? tdee * 1.15 : tdee, ratio = s.ratio || {c:50,p:30,f:20};
    return {age:age,height:height,weight:weight,bodyFat:Number(p.bodyFat)||0,bmr:Math.round(bmr),tdee:Math.round(tdee),goal:Math.round(goal),activity:activity,activityGoal:Number(s.activityGoal)||30,mode:mode,carb:Math.round(goal * Number(ratio.c||50) / 100 / 4),protein:Math.round(goal * Number(ratio.p||30) / 100 / 4),fat:Math.round(goal * Number(ratio.f||20) / 100 / 9)};
  }
  function activityLabel(v) { return ({1.2:'久坐 · 很少运动',1.375:'轻度 · 每周1–3次',1.55:'中度 · 每周3–5次',1.725:'较高 · 每周6–7次',1.9:'高强度 · 每天运动'})[String(v)] || '中度活动'; }
  function goalLabel(v) { return ({lose:'减脂',maintain:'维持',gain:'增肌'})[v] || '维持'; }
  function profilePage() {
    var current = state(), s = current.S || {}, body = bodyMetrics(s), name = s.name || '小满';
    return '<main class="xm-profile-page"><header class="xm-profile-head"><div><h1>我的</h1><p>把身体数据与生活设置，放在一个顺手的位置</p></div><button class="xm-profile-gear" type="button" onclick="xmOpenAiSettings()" aria-label="打开 AI 设置">⚙</button></header>' +
      '<section class="xm-profile-user" aria-label="当前用户"><img src="assets/xiaoman-v3/profile-puppy-avatar.png" alt="小满头像"><span><b>' + esc(name) + '</b><small>记录自己的节奏，照顾好每天的身体</small></span></section>' +
      '<section class="xm-profile-body-card"><div class="xm-profile-card-title"><div><span>🌿</span><h2>身体数据</h2><small>用于计算基础代谢和每日热量目标</small></div><button type="button" onclick="xmOpenBodySettings()">编辑</button></div><div class="xm-profile-body-grid"><div><b>' + body.age + '<small>岁</small></b><span>年龄</span></div><div><b>' + body.height + '<small>cm</small></b><span>身高</span></div><div><b>' + body.weight + '<small>kg</small></b><span>体重</span></div><div><b>' + (body.bodyFat ? body.bodyFat + '<small>%</small>' : '—') + '</b><span>体脂率</span></div></div><div class="xm-profile-energy"><div><span>基础代谢 BMR</span><b>' + body.bmr + '<small> kcal</small></b></div><div><span>每日消耗 TDEE</span><b>' + body.tdee + '<small> kcal</small></b></div><div><span>建议摄入目标</span><b>' + body.goal + '<small> kcal</small></b></div></div></section>' +
      '<section class="xm-profile-goal-card"><div><span class="xm-profile-goal-icon">⌁</span><span><b>运动目标</b><small>' + activityLabel(body.activity) + '</small></span></div><strong>' + body.activityGoal + '<small>分钟 / 天</small></strong><button type="button" onclick="xmOpenBodySettings()">调整 ›</button></section>' +
      '<button class="xm-profile-ai-entry" type="button" onclick="xmOpenAiSettings()"><span class="xm-profile-ai-mark">AI</span><span><b>AI 助手设置</b><small>配置通义千问，用于饮食、训练和经期建议</small></span><em>' + esc(aiLabel(s)) + '　›</em></button>' +
      '<button class="xm-profile-sync" type="button" onclick="xmHealthSyncInfo()"><img src="assets/xiaoman-v3/profile-health-sync.png" alt="健康同步"><span><b>健康数据同步</b><small>网页端先使用本地记录；小程序端可在授权后接入系统健康数据</small></span><em>说明　›</em></button>' +
      '<h2 class="xm-profile-services-title">服务与设置</h2><section class="xm-profile-services"><button type="button" onclick="xmProfileMessage(\'首页和饮食页会根据身体数据实时更新目标。\')"><span class="xm-profile-service-icon">⌁</span><span><b>目标同步说明</b><small>首页热量环、饮食宏量和训练目标</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'提醒设置已保留入口，微信小程序端可继续接入系统提醒。\')"><span class="xm-profile-service-icon">◷</span><span><b>提醒设置</b><small>训练、饮水和记录提醒</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'你的数据默认只保存在当前设备浏览器中。\')"><span class="xm-profile-service-icon">◇</span><span><b>隐私与安全</b><small>本地存储与 AI Key 使用说明</small></span><i>›</i></button><button type="button" onclick="xmProfileMessage(\'小满日常 · 健康生活记录\')"><span class="xm-profile-service-icon">·</span><span><b>关于小满日常</b><small>版本与功能说明</small></span><i>›</i></button></section></main>';
  }
  function bodySettingsOverlay() {
    var current = state(), s = current.S || {}, p = s.profile || {}, body = bodyMetrics(s), overlay = document.getElementById('xmBodySettingsOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div'); overlay.id = 'xmBodySettingsOverlay'; overlay.className = 'xm-body-settings-overlay';
    overlay.innerHTML = '<section class="xm-body-settings-panel" role="dialog" aria-modal="true" aria-labelledby="xmBodySettingsTitle"><header><div><span>我的身体数据</span><h2 id="xmBodySettingsTitle">身体数据与运动目标</h2></div><button type="button" onclick="xmCloseBodySettings()" aria-label="关闭">×</button></header><p class="xm-body-settings-note">数据保存后，首页热量环、饮食碳蛋脂目标和训练目标会同步更新。</p><div class="xm-body-fields"><label><span>性别</span><select id="xmBodyGender"><option value="male">男</option><option value="female">女</option></select></label><label><span>年龄</span><input id="xmBodyAge" type="number" min="1" max="120" value="' + body.age + '"><b>岁</b></label><label><span>身高</span><input id="xmBodyHeight" type="number" min="50" max="250" value="' + body.height + '"><b>cm</b></label><label><span>体重</span><input id="xmBodyWeight" type="number" min="10" max="300" step="0.1" value="' + body.weight + '"><b>kg</b></label><label><span>体脂率 <small>可选</small></span><input id="xmBodyFat" type="number" min="1" max="70" step="0.1" value="' + (body.bodyFat || '') + '" placeholder="不填写也可以"><b>%</b></label></div><label class="xm-body-select-field"><span>日常活动水平</span><select id="xmBodyActivity"><option value="1.2">久坐 · 很少运动</option><option value="1.375">轻度 · 每周1–3次</option><option value="1.55">中度 · 每周3–5次</option><option value="1.725">较高 · 每周6–7次</option><option value="1.9">高强度 · 每天运动</option></select></label><div class="xm-body-goal-options"><span>热量目标</span><div><button type="button" data-mode="lose" onclick="xmPickBodyGoal(\'lose\')">减脂<br><small>约 -15%</small></button><button type="button" data-mode="maintain" onclick="xmPickBodyGoal(\'maintain\')">维持<br><small>按日常消耗</small></button><button type="button" data-mode="gain" onclick="xmPickBodyGoal(\'gain\')">增肌<br><small>约 +15%</small></button></div></div><label class="xm-body-motion-field"><span>每日运动目标</span><input id="xmBodyActivityGoal" type="number" min="1" max="300" value="' + body.activityGoal + '"><b>分钟</b></label><div class="xm-body-preview"><div><span>基础代谢</span><b id="xmBodyPreviewBmr">' + body.bmr + ' kcal</b></div><div><span>建议摄入</span><b id="xmBodyPreviewGoal">' + body.goal + ' kcal</b></div></div><footer><button type="button" class="xm-body-cancel" onclick="xmCloseBodySettings()">取消</button><button type="button" class="xm-body-save" onclick="xmSaveBodySettings()">保存并同步</button></footer></section>';
    document.body.appendChild(overlay); document.body.classList.add('xm-body-settings-open');
    document.getElementById('xmBodyGender').value = p.gender || 'male'; document.getElementById('xmBodyActivity').value = String(p.activity || 1.55); window.xmPickBodyGoal(p.goalMode || 'maintain');
    ['xmBodyGender','xmBodyAge','xmBodyHeight','xmBodyWeight','xmBodyFat','xmBodyActivity'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('input', window.xmPreviewBodySettings); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) window.xmCloseBodySettings(); });
  }
  window.xmOpenBodySettings = bodySettingsOverlay;
  window.xmCloseBodySettings = function () { var overlay = document.getElementById('xmBodySettingsOverlay'); if (overlay) overlay.remove(); document.body.classList.remove('xm-body-settings-open'); };
  window.xmPickBodyGoal = function (mode) { var overlay = document.getElementById('xmBodySettingsOverlay'); if (!overlay) return; overlay.querySelectorAll('[data-mode]').forEach(function (button) { button.classList.toggle('on', button.getAttribute('data-mode') === mode); }); overlay.dataset.goalMode = mode; window.xmPreviewBodySettings(); };
  window.xmPreviewBodySettings = function () { var overlay = document.getElementById('xmBodySettingsOverlay'); if (!overlay) return; var s = state().S || {}, copy = Object.assign({}, s, {profile:Object.assign({}, s.profile || {}, {gender:(document.getElementById('xmBodyGender') || {}).value || 'male',age:Number((document.getElementById('xmBodyAge') || {}).value)||25,height:Number((document.getElementById('xmBodyHeight') || {}).value)||170,weight:Number((document.getElementById('xmBodyWeight') || {}).value)||65,bodyFat:Number((document.getElementById('xmBodyFat') || {}).value)||0,activity:Number((document.getElementById('xmBodyActivity') || {}).value)||1.55,goalMode:overlay.dataset.goalMode || 'maintain'})}); var body = bodyMetrics(copy), b = document.getElementById('xmBodyPreviewBmr'), g = document.getElementById('xmBodyPreviewGoal'); if (b) b.textContent = body.bmr + ' kcal'; if (g) g.textContent = body.goal + ' kcal'; };
  window.xmSaveBodySettings = function () { var current = state(), s = current.S || {}; s.profile = s.profile || {}; s.profile.gender = (document.getElementById('xmBodyGender') || {}).value || 'male'; s.profile.age = Number((document.getElementById('xmBodyAge') || {}).value) || 25; s.profile.height = Number((document.getElementById('xmBodyHeight') || {}).value) || 170; s.profile.weight = Number((document.getElementById('xmBodyWeight') || {}).value) || 65; s.profile.bodyFat = Number((document.getElementById('xmBodyFat') || {}).value) || 0; s.profile.activity = Number((document.getElementById('xmBodyActivity') || {}).value) || 1.55; s.profile.goalMode = (document.getElementById('xmBodySettingsOverlay') || {}).dataset.goalMode || 'maintain'; s.activityGoal = Math.max(1, Number((document.getElementById('xmBodyActivityGoal') || {}).value) || 30); if (api() && api().save) api().save(); window.xmCloseBodySettings(); if (typeof window.rbNavTo === 'function') window.rbNavTo('profile'); toast('身体数据已保存，首页和饮食页已同步'); };
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
