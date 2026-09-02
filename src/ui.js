/* Shared UI atoms: fields, chips, modals, toasts, empty states. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;

  const ui = {};

  ui.icon = function (name) {
    const paths = {
      search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
      plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
      camera: 'M9 3l-1.7 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.3L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
      check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
      warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
      link: 'M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z',
      back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
      trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
      close: 'M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
      grid: 'M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z',
      list: 'M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z'
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[name] || paths.check);
    svg.appendChild(path);
    return svg;
  };

  ui.button = function (label, attrs) {
    const options = attrs || {};
    const classes = 'button' + (options.variant ? ' button--' + options.variant : '');
    return h('button.' + classes.split(' ').join('.'), {
      type: options.type || 'button',
      onclick: options.onClick,
      disabled: options.disabled,
      title: options.title || label,
      'aria-label': options.ariaLabel || label
    }, [options.icon ? ui.icon(options.icon) : null, label ? h('span', { text: label }) : null]);
  };

  ui.chip = function (label, attrs) {
    const options = attrs || {};
    return h('span.chip' + (options.tone ? '.chip--' + options.tone : '') + (options.onClick ? '.chip--action' : ''), {
      onclick: options.onClick,
      title: options.title || label,
      role: options.onClick ? 'button' : null,
      tabindex: options.onClick ? 0 : null,
      onkeydown: options.onClick ? function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); options.onClick(event); }
      } : null
    }, [
      h('span', { text: label }),
      options.removable ? h('span.chip__x', { text: '×' }) : null
    ]);
  };

  ui.field = function (label, control, hint) {
    return h('label.field', [
      h('span.field__label', { text: label }),
      control,
      hint ? h('span.field__hint', { text: hint }) : null
    ]);
  };

  ui.input = function (attrs) {
    const options = attrs || {};
    return h('input.input', {
      type: options.type || 'text',
      value: options.value === null || options.value === undefined ? '' : options.value,
      placeholder: options.placeholder || '',
      inputmode: options.inputmode,
      list: options.list,
      min: options.min,
      step: options.step,
      oninput: options.onInput,
      onchange: options.onChange
    });
  };

  ui.textarea = function (attrs) {
    const options = attrs || {};
    return h('textarea.input.input--area', {
      rows: options.rows || 3,
      placeholder: options.placeholder || '',
      oninput: options.onInput
    }, options.value || '');
  };

  ui.select = function (options, value, onChange, placeholder) {
    const select = h('select.input.select', { onchange: function (event) { onChange(event.target.value); } });
    if (placeholder !== undefined) {
      select.appendChild(h('option', { value: '', text: placeholder, selected: !value }));
    }
    options.forEach(function (option) {
      const id = typeof option === 'string' ? option : option.id;
      const name = typeof option === 'string' ? option : option.name;
      if (option.group) {
        // caller supplies flat list; grouping handled by optgroup builder below
      }
      select.appendChild(h('option', { value: id, text: name, selected: String(id) === String(value) }));
    });
    return select;
  };

  ui.groupedSelect = function (groups, value, onChange, placeholder) {
    const select = h('select.input.select', { onchange: function (event) { onChange(event.target.value); } });
    if (placeholder !== undefined) {
      select.appendChild(h('option', { value: '', text: placeholder, selected: !value }));
    }
    groups.forEach(function (group) {
      const optgroup = h('optgroup', { label: group.name });
      group.children.forEach(function (child) {
        optgroup.appendChild(h('option', { value: child.id, text: child.name, selected: child.id === value }));
      });
      select.appendChild(optgroup);
    });
    return select;
  };

  ui.datalist = function (id, values) {
    return h('datalist', { id: id }, util.unique(values).map(function (value) {
      return h('option', { value: value });
    }));
  };

  ui.empty = function (title, message, action) {
    return h('div.empty', [
      h('h3.empty__title', { text: title }),
      message ? h('p.empty__message', { text: message }) : null,
      action || null
    ]);
  };

  ui.section = function (title, children, subtitle) {
    return h('section.section', [
      h('header.section__head', [
        h('h2.section__title', { text: title }),
        subtitle ? h('p.section__subtitle', { text: subtitle }) : null
      ]),
      h('div.section__body', children)
    ]);
  };

  ui.meter = function (fraction) {
    const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    const tone = percent === 100 ? 'good' : percent >= 60 ? 'ok' : 'low';
    return h('div.meter', { 'aria-label': percent + '%' }, [
      h('div.meter__fill.meter__fill--' + tone, { style: 'width:' + percent + '%' })
    ]);
  };

  ui.stat = function (label, value, hint) {
    return h('div.stat', [
      h('span.stat__value', { text: String(value) }),
      h('span.stat__label', { text: label }),
      hint ? h('span.stat__hint', { text: hint }) : null
    ]);
  };

  /* ------------------------------------------------------------------- modal */
  let openModal = null;

  ui.modal = function (title, body, footer) {
    ui.closeModal();
    const dialog = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
      h('div.modal__panel', [
        h('header.modal__head', [
          h('h2.modal__title', { text: title }),
          h('button.icon-button', { onclick: ui.closeModal, 'aria-label': 'Close' }, ui.icon('close'))
        ]),
        h('div.modal__body', body),
        footer ? h('footer.modal__foot', footer) : null
      ])
    ]);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) ui.closeModal();
    });
    document.body.appendChild(dialog);
    document.body.classList.add('is-locked');
    openModal = dialog;
    const focusable = dialog.querySelector('input, select, textarea, button');
    if (focusable) focusable.focus();
    return dialog;
  };

  ui.closeModal = function () {
    if (!openModal) return;
    openModal.remove();
    openModal = null;
    document.body.classList.remove('is-locked');
  };

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') ui.closeModal();
  });

  ui.confirm = function (title, message, onConfirm, confirmLabel) {
    ui.modal(title, [h('p.modal__text', { text: message })], [
      ui.button('Cancel', { onClick: ui.closeModal }),
      ui.button(confirmLabel || 'Delete', {
        variant: 'danger',
        onClick: function () { ui.closeModal(); onConfirm(); }
      })
    ]);
  };

  /* ------------------------------------------------------------------- toast */
  ui.toast = function (message, tone) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = h('div.toast' + (tone ? '.toast--' + tone : ''), { role: 'status', text: message });
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('is-leaving'); }, 2600);
    setTimeout(function () { toast.remove(); }, 3100);
  };

  App.ui = ui;
})(window.App = window.App || {});
