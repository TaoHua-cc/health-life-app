/* Keep training-part headings stable when the live fitness list repaints. */
(function () {
  'use strict';

  var queued = false;
  var applying = false;

  function sessionRoot() {
    return document.querySelector('body.rb-fit-page .rb-pixel-session') ||
      document.querySelector('.rb-pixel-session');
  }

  function directRows(root) {
    return Array.prototype.filter.call(root.children, function (node) {
      return node.classList && node.classList.contains('rb-pixel-session-row');
    });
  }

  function partName(row) {
    var title = row.querySelector('.rb-pixel-session-copy h3');
    var text = title ? String(title.textContent || '').trim() : '';
    var separator = text.indexOf('·');
    if (separator > 0) return text.slice(0, separator).trim();
    return row.getAttribute('data-xm-part') || '';
  }

  function stripPartPrefix(row, part) {
    var title = row.querySelector('.rb-pixel-session-copy h3');
    if (!title || !part) return;
    var text = String(title.textContent || '').trim();
    var prefix = part + '·';
    if (text.indexOf(prefix) === 0) title.textContent = text.slice(prefix.length).trim();
    row.setAttribute('data-xm-part', part);
  }

  function makeGroup(part) {
    var group = document.createElement('div');
    group.className = 'xm-part-group';

    var heading = document.createElement('div');
    heading.className = 'xm-part-title';
    heading.innerHTML = '<span class="xm-part-title-dot" aria-hidden="true"></span>' +
      '<strong></strong><small></small>';
    heading.querySelector('strong').textContent = part;
    group.appendChild(heading);

    return group;
  }

  function applyGrouping() {
    queued = false;
    if (applying || !document.body.classList.contains('rb-fit-page')) return;

    var root = sessionRoot();
    if (!root || root.querySelector('.xm-part-group')) return;

    var rows = directRows(root);
    if (!rows.length) return;

    applying = true;
    var groups = Object.create(null);
    var order = [];

    rows.forEach(function (row) {
      var part = partName(row) || '其他';
      stripPartPrefix(row, part);
      if (!groups[part]) {
        groups[part] = makeGroup(part);
        order.push(part);
      }
      groups[part].appendChild(row);
    });

    var fragment = document.createDocumentFragment();
    order.forEach(function (part) {
      var group = groups[part];
      var count = group.querySelectorAll('.rb-pixel-session-row').length;
      group.querySelector('.xm-part-title small').textContent = count + ' 个动作';
      fragment.appendChild(group);
    });
    root.replaceChildren(fragment);
    applying = false;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(applyGrouping, 0);
  }

  function init() {
    schedule();
    if (!document.body) return;
    new MutationObserver(function () {
      if (!applying) schedule();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
