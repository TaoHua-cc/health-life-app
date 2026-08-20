/* Small behavior bridge for the inline diet-record details section. */
(function () {
  'use strict';
  window.rbScrollDietRecords = function () {
    var target = document.getElementById('rbDietAllRecords') || document.querySelector('.rb-ref-meal-board');
    if (!target) return;
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      target.scrollTop = target.offsetTop;
    }
  };
})();
