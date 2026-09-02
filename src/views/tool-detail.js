/* One tool: photos, specifications, and everything it works with. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const tax = App.taxonomy;
  const compat = App.compat;

  const view = {};

  function gallery(tool) {
    if (!(tool.photos || []).length) return null;
    const main = App.photos.bind(h('img.gallery__main', { alt: model.displayName(tool) }), tool.photos[0], 'full');
    main.addEventListener('click', function () {
      ui.modal(model.displayName(tool), [
        App.photos.bind(h('img.gallery__zoom', { alt: model.displayName(tool) }), tool.photos[0], 'full')
      ]);
    });
    return h('div.gallery', [
      main,
      tool.photos.length > 1
        ? h('div.gallery__strip', tool.photos.map(function (id, index) {
            const thumb = App.photos.bind(h('img', { alt: 'Photo ' + (index + 1) }), id, 'thumb');
            thumb.addEventListener('click', function () {
              App.photos.url(id, 'full').then(function (url) { if (url) main.src = url; });
            });
            return h('button.gallery__thumb', { type: 'button' }, thumb);
          }))
        : null
    ]);
  }

  function specs(tool) {
    const rows = [
      ['Category', tax.categoryName(tool.category)],
      ['Brand', tool.brand],
      ['Model', tool.modelNumber],
      ['Power', tool.powerSource + (tool.platform ? ' · ' + tax.interfaceName('battery:' + tool.platform) : '')],
      ['Size', tool.size || tool.sizeRange],
      ['Set', tool.setName],
      ['Quantity', tool.quantity > 1 ? '×' + tool.quantity : null],
      ['Condition', tool.condition],
      ['Status', tool.status + (tool.lentTo ? ' — ' + tool.lentTo : '')],
      ['Location', tool.location],
      ['Bought', util.formatDate(tool.purchaseDate)],
      ['Price', util.formatMoney(tool.price, tool.currency)],
      ['Serial', tool.serial]
    ].filter(function (row) { return row[1]; });

    return h('dl.specs', rows.map(function (row) {
      return h('div.specs__row', [
        h('dt', { text: row[0] }),
        h('dd', { text: String(row[1]) })
      ]);
    }));
  }

  function matchList(title, matches, emptyText) {
    if (!matches.length) return emptyText ? h('p.muted', { text: emptyText }) : null;
    return h('div.match-group', [
      h('h4.match-group__title', { text: title }),
      h('ul.match-list', matches.map(function (match) {
        return h('li.match', {
          onclick: function () { App.navigate('#/tool/' + match.tool.id); },
          tabindex: 0,
          onkeydown: function (e) { if (e.key === 'Enter') App.navigate('#/tool/' + match.tool.id); }
        }, [
          h('span.match__name', { text: model.displayName(match.tool) }),
          h('span.match__via', {
            text: match.path && match.path.length
              ? 'via ' + match.path.map(function (step) { return model.displayName(step.tool); }).join(' → ')
              : match.via.map(tax.interfaceName).join(', ')
          })
        ]);
      }))
    ]);
  }

  function compatibilityPanel(tool) {
    const report = compat.report(tool, App.state.tools);
    const nothing = !report.takes.length && !report.takesViaAdapter.length && !report.fitsInto.length;

    return ui.section('Works with', [
      nothing
        ? h('p.muted', {
            text: (tool.accepts || []).length || (tool.fits || []).length
              ? 'Nothing else in your inventory connects to this yet.'
              : 'Add connections to this tool (edit it) and matches will appear here automatically.'
          })
        : null,
      matchList('Takes these', report.takes),
      matchList('Reaches these through an adapter', report.takesViaAdapter),
      matchList('Plugs into', report.fitsInto),
      report.orphanedInterfaces.length
        ? h('div.notice.notice--warn', [
            ui.icon('warn'),
            h('span', { text: 'Nothing you own accepts ' + report.orphanedInterfaces.map(tax.interfaceName).join(' or ') + '.' })
          ])
        : null,
      report.unusedInterfaces.length
        ? h('div.notice', [
            ui.icon('link'),
            h('span', { text: 'You own nothing that fits its ' + report.unusedInterfaces.map(tax.interfaceName).join(', ') + '.' })
          ])
        : null
    ]);
  }

  function jobsPanel(tool) {
    const relevant = App.state.plans.filter(function (plan) {
      return plan.lines.some(function (line) {
        return line.matches.some(function (match) { return match.id === tool.id; });
      });
    });
    if (!relevant.length) return null;

    return ui.section('Used by jobs', [
      h('div.chips', relevant.map(function (plan) {
        return ui.chip(plan.job.name, {
          tone: plan.ready ? 'good' : 'quiet',
          onClick: function () { App.navigate('#/job/' + plan.job.id); }
        });
      }))
    ]);
  }

  view.render = function (container, params) {
    const tool = App.state.tools.filter(function (t) { return t.id === params.id; })[0];
    if (!tool) {
      util.append(container, ui.empty('Tool not found', 'It may have been deleted.',
        ui.button('Back to inventory', { onClick: function () { App.navigate('#/inventory'); } })));
      return;
    }

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('button.back', { onclick: function () { App.navigate('#/inventory'); } },
            [ui.icon('back'), h('span', { text: 'Inventory' })]),
          h('h1.view__title', { text: model.displayName(tool) }),
          h('p.view__subtitle', { text: model.subtitle(tool) })
        ]),
        h('div.view__actions', [
          ui.button('Edit', { onClick: function () { App.navigate('#/edit/' + tool.id); } }),
          ui.button('Delete', {
            variant: 'danger',
            onClick: function () {
              ui.confirm('Delete this tool?', model.displayName(tool) + ' and its photos will be removed from this device.',
                function () {
                  App.store.deleteTool(tool.id).then(function () {
                    ui.toast('Deleted');
                    return App.refresh();
                  }).then(function () { App.navigate('#/inventory'); });
                });
            }
          })
        ])
      ]),

      h('div.detail', [
        h('div.detail__main', [
          gallery(tool),
          ui.section('Details', [
            specs(tool),
            (tool.capabilities || []).length
              ? h('div.detail__block', [
                  h('h4.detail__label', { text: 'Can do' }),
                  h('div.chips', tool.capabilities.map(function (id) { return ui.chip(tax.capabilityName(id)); }))
                ])
              : null,
            (tool.accepts || []).length
              ? h('div.detail__block', [
                  h('h4.detail__label', { text: 'Accepts' }),
                  h('div.chips', tool.accepts.map(function (t) { return ui.chip(tax.interfaceName(t), { tone: 'info' }); }))
                ])
              : null,
            (tool.fits || []).length
              ? h('div.detail__block', [
                  h('h4.detail__label', { text: 'Fits' }),
                  h('div.chips', tool.fits.map(function (t) { return ui.chip(tax.interfaceName(t), { tone: 'info' }); }))
                ])
              : null,
            (tool.tags || []).length
              ? h('div.detail__block', [
                  h('h4.detail__label', { text: 'Tags' }),
                  h('div.chips', tool.tags.map(function (t) { return ui.chip(t, { tone: 'quiet' }); }))
                ])
              : null,
            tool.notes ? h('p.detail__notes', { text: tool.notes }) : null
          ])
        ]),
        h('div.detail__side', [
          compatibilityPanel(tool),
          jobsPanel(tool)
        ])
      ])
    ]);
  };

  App.views = App.views || {};
  App.views.toolDetail = view;
})(window.App = window.App || {});
