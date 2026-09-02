/* Add / edit a tool. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const tax = App.taxonomy;

  const view = {};

  function interfaceEditor(draft, side, onChange) {
    const label = side === 'accepts' ? 'Accepts (things that plug into it)' : 'Fits (what it plugs into)';
    const hint = side === 'accepts'
      ? 'A 1/2" ratchet accepts 1/2" drive. A cordless drill accepts its battery platform.'
      : 'A socket fits 1/2" drive. A battery fits its platform.';

    const chips = h('div.chips', (draft[side] || []).map(function (token) {
      return ui.chip(tax.interfaceName(token), {
        title: tax.interfaceGroupName(token) + ': ' + tax.interfaceName(token),
        removable: true,
        onClick: function () {
          draft[side] = draft[side].filter(function (t) { return t !== token; });
          onChange();
        }
      });
    }));

    const groupSelect = ui.select(tax.INTERFACE_GROUPS, '', function (groupId) {
      if (!groupId) return;
      const group = tax.interfaceGroupById[groupId];
      ui.modal(group.name, [
        h('p.modal__text', { text: side === 'accepts' ? group.hostLabel : group.fitLabel }),
        h('div.chips', group.values.map(function (value) {
          const token = groupId + ':' + value.id;
          return ui.chip(value.name, {
            tone: (draft[side] || []).indexOf(token) >= 0 ? 'good' : null,
            onClick: function () {
              if ((draft[side] || []).indexOf(token) < 0) draft[side] = (draft[side] || []).concat([token]);
              ui.closeModal();
              onChange();
            }
          });
        }))
      ]);
    }, '+ Add ' + (side === 'accepts' ? 'connection it accepts' : 'connection it fits'));

    const suggestions = model.suggestInterfaces(draft)[side]
      .filter(function (token) { return (draft[side] || []).indexOf(token) < 0; });

    return h('div.field', [
      h('span.field__label', { text: label }),
      chips,
      groupSelect,
      suggestions.length ? h('div.suggestions', [
        h('span.suggestions__label', { text: 'Suggested:' }),
        h('div.chips', suggestions.map(function (token) {
          return ui.chip('+ ' + tax.interfaceName(token), {
            tone: 'info',
            onClick: function () {
              draft[side] = (draft[side] || []).concat([token]);
              onChange();
            }
          });
        }))
      ]) : null,
      h('span.field__hint', { text: hint })
    ]);
  }

  function capabilityEditor(draft, onChange) {
    return h('div.field', [
      h('span.field__label', { text: 'What it can do' }),
      h('div.chips.chips--wrap', tax.CAPABILITIES.map(function (capability) {
        const on = (draft.capabilities || []).indexOf(capability.id) >= 0;
        return ui.chip(capability.name, {
          tone: on ? 'good' : 'quiet',
          onClick: function () {
            draft.capabilities = on
              ? draft.capabilities.filter(function (id) { return id !== capability.id; })
              : (draft.capabilities || []).concat([capability.id]);
            onChange();
          }
        });
      })),
      h('span.field__hint', { text: 'Job planning matches on these, so a tick here is what makes a job show as ready.' })
    ]);
  }

  function photoEditor(draft, onChange) {
    const input = h('input', {
      type: 'file',
      accept: 'image/*',
      multiple: true,
      style: 'display:none',
      onchange: function (event) {
        const files = event.target.files;
        if (!files || !files.length) return;
        ui.toast('Saving ' + util.plural(files.length, 'photo') + '…');
        App.photos.addMany(files).then(function (ids) {
          draft.photos = (draft.photos || []).concat(ids);
          onChange();
        }).catch(function (err) { ui.toast(err.message, 'danger'); });
        event.target.value = '';
      }
    });

    return h('div.field', [
      h('span.field__label', { text: 'Photos' }),
      h('div.photo-strip', [
        (draft.photos || []).map(function (id) {
          return h('div.photo-strip__item', [
            App.photos.bind(h('img', { alt: 'Tool photo' }), id, 'thumb'),
            h('button.photo-strip__remove', {
              type: 'button',
              'aria-label': 'Remove photo',
              onclick: function () {
                draft.photos = draft.photos.filter(function (pid) { return pid !== id; });
                App.photos.remove(id);
                onChange();
              }
            }, '×')
          ]);
        }),
        h('button.photo-strip__add', {
          type: 'button',
          onclick: function () { input.click(); }
        }, [ui.icon('camera'), h('span', { text: 'Add' })])
      ]),
      input,
      h('span.field__hint', { text: 'Photos are resized and stored on this device only.' })
    ]);
  }

  function tagEditor(draft, onChange, allTags) {
    const input = ui.input({
      placeholder: 'Add a tag and press Enter',
      list: 'tag-options',
      onChange: function (event) {
        const value = event.target.value.trim();
        if (!value) return;
        draft.tags = util.unique((draft.tags || []).concat([value]));
        event.target.value = '';
        onChange();
      }
    });
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      input.dispatchEvent(new Event('change'));
    });

    return h('div.field', [
      h('span.field__label', { text: 'Tags' }),
      h('div.chips', (draft.tags || []).map(function (tag) {
        return ui.chip(tag, {
          removable: true,
          onClick: function () {
            draft.tags = draft.tags.filter(function (t) { return t !== tag; });
            onChange();
          }
        });
      })),
      input,
      ui.datalist('tag-options', allTags)
    ]);
  }

  view.render = function (container, params) {
    const editing = params && params.id;
    const existing = editing
      ? App.state.tools.filter(function (tool) { return tool.id === params.id; })[0]
      : null;

    if (editing && !existing) {
      util.append(container, ui.empty('Tool not found', 'It may have been deleted.',
        ui.button('Back to inventory', { onClick: function () { App.navigate('#/inventory'); } })));
      return;
    }

    // Keyed so a re-render (any field change redraws the form) keeps the draft,
    // while opening a different tool - or a new one - starts a fresh record.
    const draftKey = editing ? 'edit:' + params.id : 'new';
    const draft = App.state.draft && App.state.draftKey === draftKey
      ? App.state.draft
      : Object.assign(model.blankTool(), existing ? JSON.parse(JSON.stringify(existing)) : {});
    App.state.draft = draft;
    App.state.draftKey = draftKey;

    const rerender = function () { App.render(); };
    const set = function (key) {
      return function (event) {
        draft[key] = event.target ? event.target.value : event;
      };
    };

    const allTags = util.unique(App.state.tools.reduce(function (out, tool) {
      return out.concat(tool.tags || []);
    }, []));
    const allBrands = util.unique(App.state.tools.map(function (tool) { return tool.brand; })).filter(Boolean);
    const allLocations = util.unique(App.state.tools.map(function (tool) { return tool.location; })).filter(Boolean);

    const platformValues = tax.interfaceGroupById.battery.values;

    const form = h('form.form', {
      onsubmit: function (event) {
        event.preventDefault();
        const tool = model.normalize(draft);
        App.store.saveTool(tool).then(function () {
          App.state.draft = null;
          App.state.draftKey = null;
          ui.toast(editing ? 'Saved' : 'Added ' + model.displayName(tool));
          return App.refresh();
        }).then(function () {
          App.navigate('#/tool/' + draft.id);
        });
      }
    }, [
      h('div.form__grid', [
        ui.field('Name', ui.input({
          value: draft.name,
          placeholder: 'e.g. Combi drill',
          onInput: set('name')
        })),
        ui.field('Brand', (function () {
          const input = ui.input({ value: draft.brand, placeholder: 'e.g. Makita', list: 'brand-options', onInput: set('brand') });
          return h('div', [input, ui.datalist('brand-options', allBrands)]);
        })()),
        ui.field('Model number', ui.input({ value: draft.modelNumber, placeholder: 'e.g. DHP484', onInput: set('modelNumber') })),
        ui.field('Category', ui.groupedSelect(tax.CATEGORIES, draft.category, function (value) {
          draft.category = value;
          // Seed capabilities and interfaces the first time a category is picked.
          if (!draft.capabilities.length) draft.capabilities = model.defaultCapabilities(value);
          rerender();
        }, 'Choose a category')),
        ui.field('Power', ui.select(tax.POWER_SOURCES, draft.powerSource, function (value) {
          draft.powerSource = value;
          rerender();
        })),
        draft.powerSource === 'cordless'
          ? ui.field('Battery platform', ui.select(platformValues, draft.platform, function (value) {
              draft.platform = value;
              rerender();
            }, 'Choose a platform'))
          : null,
        ui.field('Status', ui.select(tax.STATUSES, draft.status, function (value) {
          draft.status = value; rerender();
        })),
        ui.field('Condition', ui.select(tax.CONDITIONS, draft.condition, function (value) { draft.condition = value; })),
        ui.field('Quantity', ui.input({ type: 'number', min: '1', value: draft.quantity, onInput: set('quantity') })),
        ui.field('Size', ui.input({ value: draft.size, placeholder: 'e.g. 13mm or 1/2"', onInput: set('size') }),
          'For a single-size item'),
        ui.field('Size range', ui.input({ value: draft.sizeRange, placeholder: 'e.g. 8-19mm', onInput: set('sizeRange') }),
          'For a set — used to find missing sizes'),
        ui.field('Set name', ui.input({ value: draft.setName, placeholder: 'e.g. Halfords 90pc socket set', onInput: set('setName') })),
        ui.field('Location', (function () {
          const input = ui.input({ value: draft.location, placeholder: 'e.g. Garage, top drawer', list: 'location-options', onInput: set('location') });
          return h('div', [input, ui.datalist('location-options', allLocations)]);
        })()),
        draft.status === 'lent out'
          ? ui.field('Lent to', ui.input({ value: draft.lentTo, placeholder: 'Who has it?', onInput: set('lentTo') }))
          : null,
        ui.field('Purchase date', ui.input({ type: 'date', value: draft.purchaseDate, onInput: set('purchaseDate') })),
        ui.field('Price paid', ui.input({ type: 'number', step: '0.01', value: draft.price, onInput: set('price') })),
        ui.field('Serial number', ui.input({ value: draft.serial, onInput: set('serial') }))
      ]),

      photoEditor(draft, rerender),
      capabilityEditor(draft, rerender),
      h('div.form__split', [
        interfaceEditor(draft, 'accepts', rerender),
        interfaceEditor(draft, 'fits', rerender)
      ]),
      tagEditor(draft, rerender, allTags),
      ui.field('Notes', ui.textarea({ value: draft.notes, rows: 4, placeholder: 'Quirks, what it came with, what it needs…', onInput: set('notes') })),

      h('div.form__actions', [
        ui.button('Cancel', {
          onClick: function () {
            App.state.draft = null;
            App.state.draftKey = null;
            App.navigate(editing ? '#/tool/' + draft.id : '#/inventory');
          }
        }),
        ui.button(editing ? 'Save changes' : 'Add tool', { variant: 'primary', type: 'submit' })
      ])
    ]);

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: editing ? 'Edit tool' : 'Add a tool' }),
          h('p.view__subtitle', { text: 'Only the name and category are needed — the rest sharpens the analysis.' })
        ])
      ]),
      form
    ]);
  };

  App.views = App.views || {};
  App.views.toolForm = view;
})(window.App = window.App || {});
