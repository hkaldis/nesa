/* Inventory: search, filter and browse the collection. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const tax = App.taxonomy;

  const view = {};

  function toolCard(tool) {
    const photoId = (tool.photos || [])[0];
    const media = h('div.card__media', photoId
      ? App.photos.bind(h('img.card__img', { alt: model.displayName(tool), loading: 'lazy' }), photoId, 'thumb')
      : h('div.card__placeholder', { text: initials(tool) }));

    return h('article.card' + (tool.status !== 'owned' ? '.card--muted' : ''), {
      onclick: function () { App.navigate('#/tool/' + tool.id); },
      tabindex: 0,
      role: 'link',
      onkeydown: function (event) {
        if (event.key === 'Enter') App.navigate('#/tool/' + tool.id);
      }
    }, [
      media,
      h('div.card__body', [
        h('h3.card__title', { text: model.displayName(tool) }),
        h('p.card__subtitle', { text: model.subtitle(tool) }),
        h('div.card__chips', [
          tool.quantity > 1 ? ui.chip('×' + tool.quantity) : null,
          tool.status !== 'owned' ? ui.chip(tool.status, { tone: tool.status === 'wishlist' ? 'info' : 'warn' }) : null,
          tool.condition === 'needs repair' || tool.condition === 'broken'
            ? ui.chip(tool.condition, { tone: 'danger' }) : null,
          tool.location ? ui.chip(tool.location, { tone: 'quiet' }) : null
        ])
      ])
    ]);
  }

  function initials(tool) {
    const source = tool.brand || tool.name || '?';
    return source.split(/\s+/).slice(0, 2).map(function (word) { return word[0]; }).join('').toUpperCase();
  }

  function toolRow(tool) {
    return h('tr.row', {
      onclick: function () { App.navigate('#/tool/' + tool.id); },
      tabindex: 0,
      onkeydown: function (event) { if (event.key === 'Enter') App.navigate('#/tool/' + tool.id); }
    }, [
      h('td', [
        h('div.row__name', { text: model.displayName(tool) }),
        h('div.row__meta', { text: model.subtitle(tool) })
      ]),
      h('td.hide-sm', { text: tool.location || '—' }),
      h('td.hide-sm', { text: tool.size || '—' }),
      h('td', { text: tool.quantity > 1 ? '×' + tool.quantity : '' })
    ]);
  }

  function filterBar(tools) {
    const filters = App.state.filters;
    const owned = tools;
    const brands = util.unique(owned.map(function (t) { return t.brand; })).sort();
    const locations = util.unique(owned.map(function (t) { return t.location; })).sort();
    const usedCategories = util.unique(owned.map(function (t) { return t.category; }));

    const groups = tax.CATEGORIES.map(function (group) {
      return {
        name: group.name,
        children: group.children.filter(function (child) { return usedCategories.indexOf(child.id) >= 0; })
      };
    }).filter(function (group) { return group.children.length; });

    const search = ui.input({
      type: 'search',
      value: filters.query,
      placeholder: 'Search name, brand, size, notes…',
      onInput: util.debounce(function (event) {
        App.state.filters.query = event.target.value;
        App.render();
      }, 180)
    });

    return h('div.filters', [
      h('div.filters__search', [ui.icon('search'), search]),
      h('div.filters__row', [
        ui.groupedSelect(groups, filters.category, function (value) {
          App.state.filters.category = value; App.render();
        }, 'All categories'),
        ui.select(brands, filters.brand, function (value) {
          App.state.filters.brand = value; App.render();
        }, 'All brands'),
        ui.select(locations, filters.location, function (value) {
          App.state.filters.location = value; App.render();
        }, 'Anywhere'),
        ui.select(tax.STATUSES, filters.status, function (value) {
          App.state.filters.status = value; App.render();
        }, 'Any status'),
        h('button.icon-button.icon-button--toggle', {
          onclick: function () {
            App.state.layout = App.state.layout === 'grid' ? 'list' : 'grid';
            App.saveUiState();
            App.render();
          },
          title: App.state.layout === 'grid' ? 'Switch to list' : 'Switch to grid',
          'aria-label': 'Toggle layout'
        }, ui.icon(App.state.layout === 'grid' ? 'list' : 'grid'))
      ])
    ]);
  }

  view.render = function (container) {
    const tools = App.state.tools;
    const filtered = util.sortBy(
      tools.filter(function (tool) { return model.matches(tool, App.state.filters); }),
      function (tool) { return model.displayName(tool).toLowerCase(); }
    );

    const hasFilters = Object.keys(App.state.filters).some(function (key) { return App.state.filters[key]; });

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: 'Inventory' }),
          h('p.view__subtitle', {
            text: tools.length
              ? filtered.length + ' of ' + util.plural(tools.length, 'tool') + ' shown'
              : 'Nothing here yet'
          })
        ]),
        ui.button('Add tool', { variant: 'primary', icon: 'plus', onClick: function () { App.navigate('#/new'); } })
      ]),
      tools.length ? filterBar(tools) : null,
      !tools.length
        ? ui.empty('No tools yet',
            'Your inventory is stored on this device, so a new phone or browser starts empty. Import your tools to fill it.',
            h('div.empty__actions', [
              ui.button('Import my tools', {
                variant: 'primary',
                onClick: function () { App.bundles.import(App.bundles.MY_TOOLS, 'My tools'); }
              }),
              ui.button('Add a tool', { onClick: function () { App.navigate('#/new'); } })
            ]))
        : !filtered.length
          ? ui.empty('Nothing matches', 'Try clearing the filters.',
              hasFilters ? ui.button('Clear filters', {
                onClick: function () { App.state.filters = {}; App.render(); }
              }) : null)
          : App.state.layout === 'grid'
            ? h('div.grid', filtered.map(toolCard))
            : h('table.table', [
                h('thead', h('tr', [
                  h('th', { text: 'Tool' }),
                  h('th.hide-sm', { text: 'Location' }),
                  h('th.hide-sm', { text: 'Size' }),
                  h('th', { text: 'Qty' })
                ])),
                h('tbody', filtered.map(toolRow))
              ])
    ]);
  };

  view.toolCard = toolCard;

  App.views = App.views || {};
  App.views.inventory = view;
})(window.App = window.App || {});
