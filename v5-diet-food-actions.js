/* 饮食记录行操作：使用最终页面 DOM 与公开状态桥，避免被旧渲染作用域覆盖。 */
(function(){
  'use strict';
  var editing=null;
  function api(){return window.__xmV5||null}
  function day(){var a=api(),d=a&&a.day?a.day():null;if(d)return d;var st=a&&a.state?a.state():null,iso=st&&st.curDate;return st&&st.S&&st.S.days&&st.S.days[iso]||null}
  function closeSheet(){var s=document.getElementById('rbFoodEditSheet');if(s)s.hidden=true;editing=null}
  function refresh(){var a=api();if(!a)return; a.save();a.render()}
  function openSheet(mealKey,index){
    var d=day(),item=d&&d.meals&&d.meals[mealKey]&&d.meals[mealKey][index];
    if(!item){var row=document.querySelector('.rb-ref-food-row[data-rb-food-meal="'+mealKey+'"][data-rb-food-index="'+index+'"]');if(row){var macroTexts=[].slice.call(row.querySelectorAll('.rb-ref-food-macros span')).map(function(x){return Number((x.textContent.match(/[\d.]+/)||['0'])[0])||0});item={food:(row.querySelector('.rb-ref-food-main b')||{}).textContent||'未命名食物',amount:1,unit:'份',cal:Number((row.querySelector('strong')||{}).textContent||0)||0,carb:macroTexts[0]||0,protein:macroTexts[1]||0,fat:macroTexts[2]||0};}}
    if(!item)return;
    editing={mealKey:mealKey,index:index};
    var sheet=document.getElementById('rbFoodEditSheet');
    if(!sheet){sheet=document.createElement('div');sheet.id='rbFoodEditSheet';sheet.className='rb-food-edit-sheet';sheet.hidden=true;sheet.addEventListener('click',function(e){if(e.target===sheet)closeSheet()});document.body.appendChild(sheet)}
    var unit=item.unit||'份';
    sheet.innerHTML='<section class="rb-food-edit-panel" role="dialog" aria-modal="true" aria-labelledby="rbFoodEditTitle"><div class="rb-food-edit-head"><div><b id="rbFoodEditTitle">'+esc(item.food||'未命名食物')+'</b><small>调整数量或删除这条记录</small></div><button type="button" class="rb-food-edit-close" aria-label="关闭">×</button></div><div class="rb-food-edit-field"><label for="rbFoodEditAmount">记录数量</label><div><input id="rbFoodEditAmount" type="number" min="0.1" step="0.1" value="'+(item.amount||1)+'"><span>'+esc(unit)+'</span></div></div><div class="rb-food-edit-preview">当前 '+Math.round(item.cal||0)+' kcal · 碳水 '+Math.round(item.carb||0)+'g · 蛋白 '+Math.round(item.protein||0)+'g · 脂肪 '+Math.round(item.fat||0)+'g</div><div class="rb-food-edit-actions"><button type="button" class="rb-food-edit-cancel">取消</button><button type="button" class="rb-food-edit-save">保存修改</button></div><button type="button" class="rb-food-edit-delete">删除这条记录</button></section>';
    sheet.hidden=false;
    var input=document.getElementById('rbFoodEditAmount');if(input)input.focus();
  }
  function apply(){
    if(!editing)return;var d=day(),item=d&&d.meals&&d.meals[editing.mealKey]&&d.meals[editing.mealKey][editing.index],input=document.getElementById('rbFoodEditAmount'),amount=input&&Number(input.value);if(!item||!amount||amount<=0)return;
    var ratio=item.amount?amount/Number(item.amount):1;item.amount=amount;item.cal=Math.round((item.cal||0)*ratio);item.carb=+((item.carb||0)*ratio).toFixed(1);item.protein=+((item.protein||0)*ratio).toFixed(1);item.fat=+((item.fat||0)*ratio).toFixed(1);refresh();closeSheet();
  }
  function remove(){
    if(!editing)return;var d=day(),list=d&&d.meals&&d.meals[editing.mealKey];if(!list||!list[editing.index])return;if(!window.confirm('确定删除这条饮食记录吗？'))return;list.splice(editing.index,1);refresh();closeSheet();
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  /* 饮食主页面已有闭包内实现，优先保留它，避免外部脚本覆盖主数据作用域。 */
  if(!window.rbDietEditFood)window.rbDietEditFood=openSheet;
  if(!window.rbApplyFoodEdit)window.rbApplyFoodEdit=apply;
  if(!window.rbCloseFoodEdit)window.rbCloseFoodEdit=closeSheet;
  if(!window.rbDietDeleteFood)window.rbDietDeleteFood=remove;
  document.addEventListener('click',function(e){var row=e.target.closest&&e.target.closest('.rb-ref-food-row');if(row){openSheet(row.getAttribute('data-rb-food-meal'),Number(row.getAttribute('data-rb-food-index')));return}if(e.target.closest&&e.target.closest('.rb-food-edit-close,.rb-food-edit-cancel')){closeSheet();return}if(e.target.closest&&e.target.closest('.rb-food-edit-save')){apply();return}if(e.target.closest&&e.target.closest('.rb-food-edit-delete'))remove()});
  document.addEventListener('keydown',function(e){var row=e.target.closest&&e.target.closest('.rb-ref-food-row');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openSheet(row.getAttribute('data-rb-food-meal'),Number(row.getAttribute('data-rb-food-index')))}});
  function homeMealKey(card){var cards=[].slice.call(document.querySelectorAll('.xm-v6-meal'));return ['breakfast','lunch','dinner'][cards.indexOf(card)]||'breakfast'}
  function syncHomeMealCards(){[].slice.call(document.querySelectorAll('.xm-v6-meal')).forEach(function(card){var key=homeMealKey(card),name=({breakfast:'早餐',lunch:'午餐',dinner:'晚餐'}[key]||'餐');card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','查看'+name+'已记录食物');card.classList.add('xm-meal-action')})}
  function openHomeMealList(key){if(typeof window.rbOpenHomeMealSheet==='function')return window.rbOpenHomeMealSheet(key);if(typeof window.rbOpenMealList==='function')return window.rbOpenMealList(key);if(typeof window.rbOpenMealPage==='function')return window.rbOpenMealPage(key)}
  document.addEventListener('click',function(e){var card=e.target.closest&&e.target.closest('.xm-v6-meal');if(card&&!e.target.closest('a,button'))openHomeMealList(homeMealKey(card))});
  document.addEventListener('keydown',function(e){var card=e.target.closest&&e.target.closest('.xm-v6-meal');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openHomeMealList(homeMealKey(card))}});
  var homeRoot=document.getElementById('rbScreen');if(homeRoot&&window.MutationObserver){syncHomeMealCards();new MutationObserver(syncHomeMealCards).observe(homeRoot,{childList:true,subtree:true})}
})();
