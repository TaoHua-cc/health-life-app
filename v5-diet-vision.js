/* Xiaoman diet vision: real photo input, Qwen recognition, one-time meal photos and sticker rows. */
(function () {
  'use strict';

  var KEY = '__rbMealVisionState';
  var ADVICE_KEY = 'xiaoman-food-advice-v1';
  function readAdviceCache() { try { return JSON.parse(localStorage.getItem(ADVICE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeAdviceCache(value) { try { localStorage.setItem(ADVICE_KEY, JSON.stringify(value || {})); } catch (e) {} }
  var savedAdvice = readAdviceCache();
  var state = window[KEY] || (window[KEY] = {photoData:'', aiData:'', boxes:[], foods:[], processing:false, status:'', error:'', mealType:'breakfast', adviceByFood:savedAdvice, adviceLoading:'', adviceRequested:{}});
  state.adviceByFood = state.adviceByFood || {};
  Object.keys(savedAdvice).forEach(function (name) { if (!state.adviceByFood[name]) state.adviceByFood[name] = savedAdvice[name]; });
  state.adviceRequested = state.adviceRequested || {};

  function appState() {
    var api = window.__xmV5;
    if (api && api.state) return api.state();
    return {S:window.S || {}, curDate:window.curDate || ''};
  }
  function data() { return appState().S || {}; }
  function currentDate() { return appState().curDate || window.curDate || ''; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function num(value) { var n = Number(value); return isFinite(n) ? n : 0; }
  function saveData() { try { if (window.__xmV5 && window.__xmV5.save) window.__xmV5.save(); else if (typeof window.saveNow === 'function') window.saveNow(); else if (typeof window.save === 'function') window.save(); } catch (e) {} }
  function rerender() { if (typeof window.rbRender === 'function') window.rbRender(); else if (window.rbMealVisionRefresh) window.rbMealVisionRefresh(); }
  function activeMeal() { return window.rbMealType || state.mealType || 'breakfast'; }
  function activeName() { return {breakfast:'早餐', lunch:'午餐', dinner:'晚餐', snack:'加餐'}[activeMeal()] || '餐食'; }
  function stickerGlyph(name) { try { return typeof window.foodIcon === 'function' ? window.foodIcon(name) : '🍽️'; } catch (e) { return '🍽️'; } }

  function photoPreview() {
    if (!state.photoData) return '<div class="rb-meal-photo-empty"><span>🍽️</span><b>拍照或上传照片识别食物</b></div>';
    var boxes = (state.boxes || []).map(function (box) {
      var left = Math.max(0, Math.min(95, num(box.left))), top = Math.max(0, Math.min(95, num(box.top))), width = Math.max(5, Math.min(100 - left, num(box.width) || 20)), height = Math.max(5, Math.min(100 - top, num(box.height) || 20));
      return '<span class="rb-meal-photo-box" style="left:'+left+'%;top:'+top+'%;width:'+width+'%;height:'+height+'%"><b>'+esc(box.name || '食物')+'</b></span>';
    }).join('');
    return '<div class="rb-meal-photo-preview"><img src="'+esc(state.photoData)+'" alt="本次识别的'+activeName()+'照片"><div class="rb-meal-photo-boxes">'+boxes+'</div></div>';
  }
  function recognizedHtml() {
    if (!state.foods || !state.foods.length) return '';
    return '<div class="rb-meal-vision-results"><div class="rb-meal-vision-results-head"><b>识别到 '+state.foods.length+' 种食物</b><small>可点选后继续调整分量</small></div>'+state.foods.map(function (food, index) {
      var update = food.updateAvailable ? '<button type="button" class="rb-vision-update" onclick="rbMealVisionUpdateFood('+index+')">更新食物库数据</button>' : (food.libraryAdded ? '<span class="rb-vision-library-ok">已保存到食物库</span>' : '');
      return '<button type="button" class="rb-vision-food '+(window.rbDetailMealFood === food.name ? 'on' : '')+'" onclick="rbMealVisionSelect('+index+')"><span class="rb-food-sticker"><span class="rb-food-sticker-glyph">'+stickerGlyph(food.name)+'</span></span><span><b>'+esc(food.name)+'</b><small>'+Math.round(food.cal||0)+' kcal / 100'+esc(food.unit||'g')+'　碳'+Number(food.carb||0).toFixed(1)+'g · 蛋'+Number(food.protein||0).toFixed(1)+'g · 脂'+Number(food.fat||0).toFixed(1)+'g</small></span><i>›</i></button><div class="rb-vision-food-meta">'+update+'</div>';
    }).join('')+'</div>';
  }
  function rbMealVisionCardHtml(action) {
    state.mealType = activeMeal();
    var status = state.processing ? '<div class="rb-meal-vision-status is-loading">正在使用通义千问识别照片…</div>' : (state.error ? '<div class="rb-meal-vision-status is-error">'+esc(state.error)+' <button type="button" onclick="rbMealVisionRetry()">重试</button></div>' : (state.status ? '<div class="rb-meal-vision-status">'+esc(state.status)+'</div>' : ''));
    var clear = state.photoData ? '<button type="button" class="rb-photo-clear" onclick="rbMealVisionReset();rbMealVisionRefresh()">移除本次照片</button>' : '';
    var input = action ? '<input id="rbMealPhotoInput" class="rb-meal-photo-input" type="file" accept="image/*" capture="environment" onchange="rbMealPhotoInputChange(this)"><label class="rb-photo-action" for="rbMealPhotoInput">拍照识别</label>' : '';
    return '<div class="rb-photo-card rb-meal-photo-zone" data-rb-art="meal"><div class="rb-meal-photo-stage">'+photoPreview()+'</div><div class="rb-meal-photo-actions">'+input+clear+'</div>'+status+recognizedHtml()+'</div>';
  }
  window.rbMealVisionCardHtml = rbMealVisionCardHtml;

  function readFile(file, done) {
    if (typeof window.readOrientedPhoto === 'function') return window.readOrientedPhoto(file, done);
    var reader = new FileReader(); reader.onload = function (event) { done(event.target.result); }; reader.onerror = function () { done(''); }; reader.readAsDataURL(file);
  }
  function compress(source, max, quality, done) {
    if (!source || typeof window.compressImg !== 'function') return done(source);
    try { window.compressImg(source, max, quality, done); } catch (e) { done(source); }
  }
  function setError(message) { state.processing = false; state.error = message; state.status = ''; rerender(); }
  window.rbMealPhotoInputChange = function (input) {
    var file = input && input.files && input.files[0]; if (!file) return;
    if (!/^image\//i.test(file.type || '')) return setError('请选择 JPG、PNG 或 HEIC 图片。');
    if (file.size > 16 * 1024 * 1024) return setError('照片太大了，请选择 16MB 以内的图片。');
    state.mealType = activeMeal(); state.processing = true; state.status = '照片已读取，准备分析'; state.error = ''; state.foods = []; state.boxes = []; rerender();
    readFile(file, function (source) {
      if (!source) return setError('照片读取失败，请重新选择。');
      compress(source, 720, .72, function (saved) {
        state.photoData = saved || source; state.status = data().aiKey ? '照片已读取，正在分析' : '照片已保存；请配置通义千问后识别，或先手动选择食物'; rerender();
        if (data().aiKey) recognize(source); else { state.processing = false; rerender(); }
      });
    });
  };
  window.rbMealVisionReset = function () { state.photoData = ''; state.aiData = ''; state.boxes = []; state.foods = []; state.processing = false; state.status = ''; state.error = ''; };
  window.rbMealVisionRetry = function () { if (state.aiData || state.photoData) recognize(state.aiData || state.photoData); };

  function apiUrl(target) { var s = data(); return s.aiProxy ? String(s.aiProxy).replace(/\/?$/, '') + '?target=' + encodeURIComponent(target) : target; }
  function request(url, body, headers, done) {
    var options = {method:'POST', headers:headers, body:JSON.stringify(body)}, controller = window.AbortController ? new AbortController() : null;
    if (controller) options.signal = controller.signal;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 40000);
    fetch(url, options).then(function (response) { return response.json().then(function (json) { return {ok:response.ok, json:json}; }); }).then(function (result) { clearTimeout(timer); done(null, result); }).catch(function (error) { clearTimeout(timer); done(error); });
  }
  function responseText(json) {
    var content = json && json.output && (json.output.text || (json.output.choices && json.output.choices[0] && json.output.choices[0].message && json.output.choices[0].message.content));
    if (!content && json && json.choices && json.choices[0] && json.choices[0].message) content = json.choices[0].message.content;
    if (Array.isArray(content)) content = content.map(function (x) { return x.text || ''; }).join('');
    return String(content || '');
  }
  function parseObject(text) {
    var clean = String(text || '').replace(/```json|```/gi, '').trim(), start = clean.indexOf('{'), end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) clean = clean.slice(start, end + 1);
    try { return JSON.parse(clean); } catch (e) { return null; }
  }
  function val(obj, keys) { for (var i = 0; i < keys.length; i++) { if (obj && obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]]; } return 0; }
  function normalizeBox(raw, index) {
    var box = raw && (raw.box || raw.bbox || raw.boundingBox || raw.rectangle), a = Array.isArray(box) ? box : null;
    if (a && a.length >= 4) { var scale = Math.max(num(a[0]), num(a[1]), num(a[2]), num(a[3])) <= 1.01 ? 100 : 1; return {left:num(a[0])*scale, top:num(a[1])*scale, width:num(a[2])*scale, height:num(a[3])*scale, name:raw.name}; }
    return {left:8 + (index % 3) * 30, top:10 + Math.floor(index / 3) * 30, width:24, height:22, name:raw.name};
  }
  function normalizeFood(raw, index) {
    raw = raw || {}; var name = String(raw.name || raw.food || raw.label || '').trim(); if (!name) return null;
    var unit = /ml|毫升/i.test(String(raw.unit || raw.portionUnit || '')) ? 'ml' : 'g', energyUnit = String(raw.energyUnit || raw.energy_unit || raw.calorieUnit || '').toLowerCase(), energy = num(val(raw, ['kcal','calories','energyKcal','energy_kcal','energy']));
    if (raw.energyKj != null || /kj|千焦/.test(energyUnit)) energy = num(raw.energyKj != null ? raw.energyKj : energy) / 4.184;
    var nutrition = raw.nutrition || raw.nutrients || {}, carb = num(val(raw, ['carb','carbohydrate','carbs'])) || num(val(nutrition, ['carb','carbohydrate','carbs'])), protein = num(val(raw, ['protein'])) || num(val(nutrition, ['protein'])), fat = num(val(raw, ['fat'])) || num(val(nutrition, ['fat']));
    if (/mg|毫克/.test(String(raw.nutrientUnit || raw.macroUnit || '').toLowerCase())) { carb /= 1000; protein /= 1000; fat /= 1000; }
    return {name:name, brand:String(raw.brand || ''), amount:Math.max(.1, num(val(raw, ['amount','grams','portion','weight'])) || 100), unit:unit, cal:Math.max(0, Math.round(energy)), carb:Math.max(0, carb), protein:Math.max(0, protein), fat:Math.max(0, fat), box:normalizeBox(raw, index), confidence:num(raw.confidence)};
  }
  function foodDiff(a, b) { return Math.abs(num(a.cal) - num(b.cal)) > 5 || Math.abs(num(a.carb) - num(b.carb)) > 2 || Math.abs(num(a.protein) - num(b.protein)) > 2 || Math.abs(num(a.fat) - num(b.fat)) > 2; }
  function addLibraryFood(food, update) {
    var record = {name:food.name, cal:food.cal, carb:+food.carb.toFixed(1), protein:+food.protein.toFixed(1), fat:+food.fat.toFixed(1), unit:food.unit || 'g', cat:'AI识别', brand:food.brand || '', source:'qwen', lastSyncedAt:Date.now()};
    if (typeof window.addCustomFood === 'function') window.addCustomFood(record);
    else { var s = data(); s.customFoods = s.customFoods || []; s.customFoods.unshift(record); saveData(); }
    food.libraryAdded = true; food.updateAvailable = false; food.updated = !!update;
    if (update && state.adviceByFood) { delete state.adviceByFood[food.name]; writeAdviceCache(state.adviceByFood); }
    saveData();
  }
  function assessLibrary(food) {
    var existing = typeof window.findFood === 'function' ? window.findFood(food.name) : null;
    if (!existing) { addLibraryFood(food, false); return; }
    food.existing = existing;
    food.updateAvailable = foodDiff(existing, food);
    food.libraryAdded = !food.updateAvailable;
  }
  function normalizeFoods(payload) { var rows = payload && (payload.foods || payload.items || payload.results); if (!Array.isArray(rows)) rows = []; return rows.map(normalizeFood).filter(Boolean).slice(0, 8); }
  function enrichNutrition(foods, done) {
    var missing = foods.filter(function (food) { return !food.cal || (!food.carb && !food.protein && !food.fat); });
    if (!missing.length || !data().aiKey) return done();
    var s = data(), names = missing.map(function (food) { return food.name+'，估计分量 '+food.amount+food.unit; }).join('；'), prompt = '请根据这些中国日常食物和估计分量，补全每100g或每100ml营养值，只输出JSON：{"foods":[{"name":"","kcal":0,"carb":0,"protein":0,"fat":0,"unit":"g"}]}。食物：'+names+'。热量单位为 kcal，碳水/蛋白质/脂肪单位为 g，不要输出解释。';
    request(apiUrl('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'), {model:s.aiModel || 'qwen-turbo', messages:[{role:'user',content:prompt}], temperature:.1}, {'Content-Type':'application/json','Authorization':'Bearer '+s.aiKey}, function (error, result) {
      if (!error && result && result.ok) { var extra = normalizeFoods(parseObject(responseText(result.json))); extra.forEach(function (item) { var target = missing.filter(function (food) { return food.name === item.name; })[0] || missing.filter(function (food) { return food.name.indexOf(item.name) >= 0 || item.name.indexOf(food.name) >= 0; })[0]; if (target) { if (!target.cal) target.cal = item.cal; if (!target.carb) target.carb = item.carb; if (!target.protein) target.protein = item.protein; if (!target.fat) target.fat = item.fat; } }); }
      done();
    });
  }
  function recognize(source) {
    var s = data(); if (!s.aiKey) return setError('未配置通义千问 API Key，照片已保留。');
    state.processing = true; state.error = ''; state.status = '正在分析照片中的食物、分量和营养成分'; rerender();
    compress(source, 1200, .82, function (aiData) {
      state.aiData = aiData || source;
      var prompt = '你是中文营养识别助手。请识别这张食物照片，只输出严格 JSON，不要 Markdown。格式：{"foods":[{"name":"中文食物名","brand":"","amount":120,"unit":"g","energy":380,"energyUnit":"kJ","kcal":91,"carb":10,"protein":8,"fat":3,"nutrientUnit":"g","box":[10,10,30,25],"confidence":0.92}],"best":""}。要求：识别照片中每一个主要食物；amount 是照片中实际估计分量，energy/kcal/carb/protein/fat 必须给出每100g或每100ml的营养值；energyUnit 若为 kJ 必须明确写 kJ；box 使用 0-100 的 left、top、width、height 百分比；不要把餐具当食物；不确定时仍给出合理的本地食物估计。';
      request(apiUrl('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'), {model:s.aiVisionModel || s.aiModel || 'qwen-vl-max', input:{messages:[{role:'user',content:[{image:state.aiData},{text:prompt}]}]}, parameters:{result_format:'message'}}, {'Content-Type':'application/json','Authorization':'Bearer '+s.aiKey}, function (error, result) {
        if (error || !result || !result.ok) return setError('识别失败，请检查通义千问 Key、网络或代理设置。');
        var payload = parseObject(responseText(result.json)), foods = normalizeFoods(payload);
        if (!foods.length) return setError('没有识别到明确食物，请换一张光线更好的照片。');
        enrichNutrition(foods, function () { foods.forEach(assessLibrary); state.foods = foods; state.boxes = foods.map(function (food) { return {left:food.box.left,top:food.box.top,width:food.box.width,height:food.box.height,name:food.name}; }); state.processing = false; state.error = ''; state.status = '识别完成；点击食物可带入本次'+activeName()+'，照片只保存到本次记录'; if (!window.rbDetailMealFood) window.rbDetailMealFood = foods[0].name; rerender(); });
      });
    });
  }
  window.rbMealVisionSelect = function (index) { var food = state.foods && state.foods[index]; if (!food) return; window.rbDetailMealFood = food.name; state.status = '已选择 '+food.name+'，确认添加后会保存本次照片'; rerender(); };
  window.rbMealVisionUpdateFood = function (index) { var food = state.foods && state.foods[index]; if (!food) return; addLibraryFood(food, true); state.status = food.name + ' 的营养数据已更新到我的食物库'; rerender(); };

  function selectedFood() {
    var name = window.rbDetailMealFood || '', row = document.querySelector('#rbMealSelected .rb-detail-row b');
    if (!name && row) name = row.textContent || '';
    return name && typeof window.findFood === 'function' ? window.findFood(name) : null;
  }
  function localAdvice(food) {
    var tips = [], cal = num(food.cal), protein = num(food.protein), fat = num(food.fat), carb = num(food.carb);
    if (protein >= 15) tips.push('蛋白质表现不错'); else tips.push('蛋白质偏少，可搭配鸡蛋、牛奶或豆制品');
    if (fat >= 20) tips.push('脂肪相对偏高，建议控制本次分量');
    if (carb >= 40) tips.push('碳水较充足，下一餐可多配蔬菜');
    if (cal > 300) tips.push('热量偏高，建议按半份到一份记录');
    if (!tips.length) tips.push('营养数据较均衡，按实际分量记录即可');
    return tips.join('；')+'。';
  }
  function paintFoodAdvice() {
    var target = document.querySelector('#rbMealNutri'), food = selectedFood(); if (!target || !food) return;
    var loading = state.adviceLoading === food.name, aiText = state.adviceByFood && state.adviceByFood[food.name], body = aiText ? esc(aiText) : (loading ? '正在分析这份食物的营养特点…' : esc(localAdvice(food))), action = (!aiText && !loading && data().aiKey) ? '<button type="button" onclick="rbMealVisionAnalyze()">用 AI 分析这份食物</button>' : '<small>'+ (aiText ? '通义千问分析' : (loading ? '通义千问分析中' : '本地综合建议')) +'</small>', html = '<div class="rb-meal-advice-head"><b>营养建议</b>'+action+'</div><p>'+body+'</p>';
    var section = target.querySelector('.rb-meal-advice');
    if (section) section.innerHTML = html; else target.insertAdjacentHTML('beforeend','<section class="rb-meal-advice">'+html+'</section>');
  }
  function installUnitSelector() {
    var row = document.querySelector('.rb-meal-add-page .rb-meal-amount-row'), old = row && row.querySelector('#rbMealAmtUnit'), input = document.getElementById('rbMealAmount'), food = selectedFood(); if (!row || !input || !food) return;
    var select = row.querySelector('#rbMealUnitSelect'), sv = typeof window.defaultServing === 'function' ? window.defaultServing(food) : {label:'份'};
    if (!select) { select = document.createElement('select'); select.id = 'rbMealUnitSelect'; select.className = 'rb-meal-unit-select'; select.setAttribute('aria-label','食物单位'); if (old) old.replaceWith(select); else row.appendChild(select); }
    var defaultUnit = String(sv.label || (String(food.unit || '').toLowerCase() === 'ml' ? 'ml' : 'g')), weightUnit = /ml|毫升/i.test(String(food.unit || '')) ? 'ml' : 'g', options = [defaultUnit];
    if (weightUnit !== defaultUnit) options.push(weightUnit);
    var previous = select.value;
    select.innerHTML = options.map(function (unit, index) { return '<option value="'+esc(unit)+'">'+esc(unit)+(index === 0 ? '（默认）' : '')+'</option>'; }).join('');
    select.value = options.indexOf(previous) >= 0 ? previous : defaultUnit;
    select.onchange = function () { if (window.rbMealAmtInput) window.rbMealAmtInput(); };
  }
  function syncAmountRow() {
    var row = document.querySelector('.rb-meal-add-page .rb-meal-amount-row'), food = selectedFood();
    if (!row) return;
    if (!food) {
      row.hidden = true;
      row.removeAttribute('data-meal-selected');
      return;
    }
    row.hidden = false;
    row.setAttribute('data-meal-selected', '1');
    installUnitSelector();
  }
  function wrapAmountInput() {
    var original = window.rbMealAmtInput; if (!original || original.__visionWrapped) return;
    var wrapped = function () { var food = selectedFood(), input = document.getElementById('rbMealAmount'), select = document.getElementById('rbMealUnitSelect'); if (!food || !input || !select) return original(); var n = input.value ? Number(input.value) : 1, unit = select.value || '份', sv = typeof window.defaultServing === 'function' ? window.defaultServing(food) : {amt:100}, k = /^(g|ml)$/i.test(unit) ? n / 100 : n * (sv.amt || 100) / 100, cells = document.querySelectorAll('#rbMealNutri .rb-nutri-cell b'); if (cells.length >= 4) { cells[0].textContent = Math.round((food.cal || 0) * k); cells[1].textContent = Math.round((food.protein || 0) * k); cells[2].textContent = Math.round((food.fat || 0) * k); cells[3].textContent = Math.round((food.carb || 0) * k); } };
    wrapped.__visionWrapped = true; window.rbMealAmtInput = wrapped;
  }
  window.rbMealVisionAnalyze = function () {
    var food = selectedFood(), s = data(); if (!food || !s.aiKey) return;
    state.adviceLoading = food.name; paintFoodAdvice();
    var prompt = '你是中文营养师，请分析食物“'+food.name+'”每100'+(food.unit || 'g')+'的营养数据：热量 '+Math.round(food.cal||0)+' kcal，碳水 '+Number(food.carb||0).toFixed(1)+'g，蛋白质 '+Number(food.protein||0).toFixed(1)+'g，脂肪 '+Number(food.fat||0).toFixed(1)+'g。请用不超过80字给出适合日常饮食记录的建议，包含适合搭配、分量和需要注意的地方，只输出建议文本。';
    request(apiUrl('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'), {model:s.aiModel || 'qwen-turbo', messages:[{role:'user',content:prompt}], temperature:.2}, {'Content-Type':'application/json','Authorization':'Bearer '+s.aiKey}, function (error, result) {
      var text = !error && result && result.ok ? responseText(result.json) : ''; state.adviceLoading = ''; if (text) { state.adviceByFood = state.adviceByFood || {}; state.adviceByFood[food.name] = text; writeAdviceCache(state.adviceByFood); } rerender();
    });
  };

  function mealData() { var api = window.__xmV5, info = api && api.state ? api.state() : {}, s = info.S || data(), date = info.curDate || currentDate(), day = typeof window.gd === 'function' ? window.gd(date) : (s.days && s.days[date]); return {s:s, day:day || {}, date:date}; }
  function paintRecordedPhotos() {
    var current = mealData(), meals = current.day.meals || {};
    document.querySelectorAll('.rb-ref-food-row[data-rb-food-meal][data-rb-food-index]').forEach(function (row) {
      if (row.getAttribute('data-rb-photo-painted') === '1') return;
      var meal = row.getAttribute('data-rb-food-meal'), index = Number(row.getAttribute('data-rb-food-index')), item = meals[meal] && meals[meal][index]; if (!item) return;
      var main = row.querySelector('.rb-ref-food-main'); if (!main) return;
      var mark = document.createElement('span'); mark.className = item.photo ? 'rb-recorded-food-photo' : 'rb-recorded-food-sticker rb-food-sticker';
      if (item.photo) { var img = document.createElement('img'); img.src = item.photo; img.alt = item.food || '本次食物照片'; mark.appendChild(img); }
      else { var glyph = document.createElement('span'); glyph.className = 'rb-food-sticker-glyph'; glyph.textContent = stickerGlyph(item.food); mark.appendChild(glyph); }
      main.insertBefore(mark, main.firstChild); row.setAttribute('data-rb-photo-painted', '1');
    });
  }
  function syncFoodLibraryDaily() {
    var s = data(), today = currentDate() || new Date().toISOString().slice(0, 10); if (s._foodLibrarySyncDate === today) return;
    s._foodLibrarySyncDate = today; s._foodLibrarySyncState = s.foodSyncUrl ? 'pending' : 'local'; saveData();
    if (!s.foodSyncUrl || !Array.isArray(s.customFoods) || !s.customFoods.length) return;
    fetch(String(s.foodSyncUrl), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source:'xiaoman-web',date:today,foods:s.customFoods})}).then(function (response) { if (!response.ok) throw new Error('sync'); s._foodLibrarySyncState = 'uploaded'; saveData(); }).catch(function () { s._foodLibrarySyncState = 'error'; saveData(); });
  }
  window.rbSyncFoodLibraryNow = function () { var s = data(); s._foodLibrarySyncDate = ''; syncFoodLibraryDaily(); };
  window.rbMealVisionRefresh = function () { syncAmountRow(); installUnitSelector(); wrapAmountInput(); paintFoodAdvice(); paintRecordedPhotos(); syncFoodLibraryDaily(); };
  function installFoodSyncSetting() {
    var original = window.xmSaveAiSettings;
    if (original && !original.__foodSyncWrapped) {
      var wrapped = function () {
        var input = document.getElementById('xmAiFoodSyncUrl'), current = appState(), s = current.S || {};
        if (input) s.foodSyncUrl = String(input.value || '').trim();
        original.apply(this, arguments);
      };
      wrapped.__foodSyncWrapped = true; window.xmSaveAiSettings = wrapped;
    }
    var overlay = document.getElementById('xmAiSettingsOverlay'), panel = overlay && overlay.querySelector('.xm-ai-settings-panel');
    if (!panel || panel.querySelector('#xmAiFoodSyncUrl')) return;
    var hint = panel.querySelector('.xm-ai-hint'), label = document.createElement('label'); label.className = 'xm-ai-field';
    label.innerHTML = '<span>食物库同步接口（可选）</span><input id="xmAiFoodSyncUrl" type="url" placeholder="你的服务器同步地址" value="'+esc(data().foodSyncUrl || '')+'">';
    if (hint) panel.insertBefore(label, hint); else panel.appendChild(label);
  }
  var observerTarget = document.getElementById('rbScreen'), mealSheetTarget = document.getElementById('rbMealSheet');
  function observeMealSurface(target) {
    if (!target || !window.MutationObserver) return;
    new MutationObserver(function () { setTimeout(function () { syncAmountRow(); installUnitSelector(); wrapAmountInput(); paintFoodAdvice(); paintRecordedPhotos(); }, 0); }).observe(target, {childList:true, subtree:true});
  }
  observeMealSurface(observerTarget);
  observeMealSurface(mealSheetTarget);
  if (window.MutationObserver) new MutationObserver(installFoodSyncSetting).observe(document.body, {childList:true, subtree:true});
  setTimeout(function () { installFoodSyncSetting(); syncAmountRow(); installUnitSelector(); wrapAmountInput(); paintFoodAdvice(); paintRecordedPhotos(); syncFoodLibraryDaily(); }, 300);
}());
