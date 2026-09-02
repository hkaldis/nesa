/* Small helpers: DOM building, formatting, size parsing. No dependencies. */
(function (App) {
  'use strict';

  const util = {};

  util.uid = function () {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  };

  /* h('div.card', {onclick: fn}, [child, 'text']) */
  util.h = function (spec, attrs, children) {
    const parts = String(spec).split(/(?=[.#])/);
    const el = document.createElement(parts[0] || 'div');
    parts.slice(1).forEach(function (part) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else if (part[0] === '#') el.id = part.slice(1);
    });
    if (attrs && (Array.isArray(attrs) || attrs instanceof Node || typeof attrs === 'string')) {
      children = attrs;
      attrs = null;
    }
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key.slice(0, 2) === 'on' && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'text') {
        el.textContent = value;
      } else if (key === 'html') {
        el.innerHTML = value;
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (k) { el.dataset[k] = value[k]; });
      } else if (key in el && key !== 'list' && key !== 'form' && key !== 'type' && key !== 'size') {
        el[key] = value;
      } else {
        el.setAttribute(key, value === true ? '' : value);
      }
    });
    util.append(el, children);
    return el;
  };

  util.append = function (el, children) {
    if (children === null || children === undefined || children === false) return el;
    if (Array.isArray(children)) {
      children.forEach(function (child) { util.append(el, child); });
      return el;
    }
    el.appendChild(children instanceof Node ? children : document.createTextNode(String(children)));
    return el;
  };

  util.clear = function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  };

  util.debounce = function (fn, wait) {
    let timer = null;
    return function () {
      const args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  };

  util.unique = function (list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  };

  util.sortBy = function (list, key) {
    return list.slice().sort(function (a, b) {
      const av = typeof key === 'function' ? key(a) : a[key];
      const bv = typeof key === 'function' ? key(b) : b[key];
      if (av === bv) return 0;
      return av > bv ? 1 : -1;
    });
  };

  util.formatDate = function (value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  util.formatMoney = function (amount, currency) {
    if (amount === null || amount === undefined || amount === '') return '';
    const number = Number(amount);
    if (isNaN(number)) return '';
    try {
      return number.toLocaleString(undefined, { style: 'currency', currency: currency || 'GBP' });
    } catch (err) {
      return (currency || '') + number.toFixed(2);
    }
  };

  util.formatDuration = function (minutes) {
    if (!minutes) return '';
    if (minutes < 60) return minutes + ' min';
    const hours = minutes / 60;
    return (hours % 1 === 0 ? hours : hours.toFixed(1)) + ' hr';
  };

  util.plural = function (count, one, many) {
    return count + ' ' + (count === 1 ? one : (many || one + 's'));
  };

  /* ------------------------------------------------------------ size parsing */
  const FRACTION = /^(\d+)?[\s-]*(\d+)\s*\/\s*(\d+)$/;

  /* "10mm" -> {system:'metric', value:10}   '1/2"' -> {system:'imperial', value:0.5}
     "T25"  -> {system:'torx', value:25}     "" -> null */
  util.parseSize = function (input) {
    if (input === null || input === undefined) return null;
    let text = String(input).trim().toLowerCase();
    if (!text) return null;

    const torx = text.match(/^t(\d+)$/);
    if (torx) return { system: 'torx', value: Number(torx[1]), label: 'T' + torx[1] };

    let system = null;
    if (/mm$/.test(text)) { system = 'metric'; text = text.replace(/mm$/, '').trim(); }
    else if (/(in|inch|")$/.test(text)) { system = 'imperial'; text = text.replace(/(in|inch|")$/, '').trim(); }

    const fraction = text.match(FRACTION);
    if (fraction) {
      const whole = Number(fraction[1] || 0);
      const value = whole + Number(fraction[2]) / Number(fraction[3]);
      return { system: system || 'imperial', value: value, label: util.formatSize(value, system || 'imperial') };
    }

    const number = Number(text);
    if (isNaN(number) || text === '') return null;
    // Bare numbers are metric: nobody writes a 10 inch socket.
    const resolved = system || 'metric';
    return { system: resolved, value: number, label: util.formatSize(number, resolved) };
  };

  util.reduceFraction = function (numerator, denominator) {
    const gcd = function (a, b) { return b ? gcd(b, a % b) : a; };
    const divisor = gcd(numerator, denominator);
    const top = numerator / divisor, bottom = denominator / divisor;
    if (bottom === 1) return String(top);
    if (top > bottom) return Math.floor(top / bottom) + '-' + (top % bottom) + '/' + bottom;
    return top + '/' + bottom;
  };

  const IMPERIAL_LABELS = {};
  [2, 4, 8, 16, 32].forEach(function (denominator) {
    for (let n = 1; n < denominator * 2; n += 1) {
      const value = n / denominator;
      if (!(value in IMPERIAL_LABELS)) IMPERIAL_LABELS[value] = util.reduceFraction(n, denominator);
    }
  });

  util.formatSize = function (value, system) {
    if (value === null || value === undefined) return '';
    if (system === 'torx') return 'T' + value;
    if (system === 'imperial') {
      const key = Number(value.toFixed(6));
      const label = IMPERIAL_LABELS[key];
      return (label || String(value)) + '"';
    }
    return (Number(value) % 1 === 0 ? value : Number(value).toFixed(1)) + ' mm';
  };

  util.sizeSystemName = function (system) {
    return { metric: 'Metric', imperial: 'Imperial', torx: 'Torx' }[system] || system;
  };

  util.escapeCsv = function (value) {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };

  util.parseCsv = function (text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
        } else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (char !== '\r') field += char;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
  };

  util.download = function (filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  App.util = util;
})(window.App = window.App || {});
