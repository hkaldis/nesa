/* Compatibility: check a pair, browse by connection, review battery platforms. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const tax = App.taxonomy;
  const compat = App.compat;

  const view = {};

  function pairChecker() {
    const state = App.state.compatPair = App.state.compatPair || { a: '', b: '' };
    const owned = util.sortBy(App.state.tools.filter(model.isOwned), function (t) {
      return model.displayName(t).toLowerCase();
    }).map(function (tool) { return { id: tool.id, name: model.displayName(tool) }; });

    const byId = function (id) { return App.state.tools.filter(function (t) { return t.id === id; })[0]; };
    const a = byId(state.a);
    const b = byId(state.b);
    const result = a && b ? compat.check(a, b, App.state.tools) : null;

    return ui.section('Will these work together?', [
      h('div.pair', [
        ui.select(owned, state.a, function (value) { state.a = value; App.render(); }, 'Pick a tool'),
        h('span.pair__plus', { text: '+' }),
        ui.select(owned, state.b, function (value) { state.b = value; App.render(); }, 'Pick another')
      ]),
      result
        ? result.compatible
          ? h('div.verdict.verdict--yes', [
              ui.icon('check'),
              h('div', [
                h('strong', { text: 'Yes — these work together.' }),
                h('p', {
                  text: result.hops > 1 && result.path.length
                    ? 'Connect them through ' + result.path.map(function (step) { return model.displayName(step.tool); }).join(' → ') + '.'
                    : 'They share ' + result.via.map(tax.interfaceName).join(', ') + '.'
                })
              ])
            ])
          : h('div.verdict.verdict--no', [
              ui.icon('warn'),
              h('div', [
                h('strong', { text: 'No — not as they are.' }),
                h('p', { text: result.reason }),
                result.needed && result.needed.length
                  ? h('div.chips', result.needed.map(function (need) {
                      return ui.chip(need.label, { tone: 'info' });
                    }))
                  : null
              ])
            ])
        : h('p.muted', { text: 'Pick two items to check them against each other.' })
    ]);
  }

  function platformPanel() {
    const platforms = compat.platformReport(App.state.tools);
    if (!platforms.length) {
      return ui.section('Battery platforms',
        h('p.muted', { text: 'No cordless tools recorded yet. Set a tool to “cordless” and choose its platform to see this.' }));
    }

    return ui.section('Battery platforms', h('div.platforms', platforms.map(function (platform) {
      return h('article.platform', [
        h('h3.platform__name', { text: platform.name }),
        h('div.platform__counts', [
          ui.stat('tools', platform.tools.length),
          ui.stat('batteries', platform.batteryCount),
          ui.stat('chargers', platform.chargers.length)
        ]),
        platform.issues.length
          ? h('ul.platform__issues', platform.issues.map(function (issue) {
              return h('li', { text: issue });
            }))
          : h('p.platform__ok', { text: 'Batteries and charger in place.' }),
        h('div.chips', platform.tools.slice(0, 8).map(function (tool) {
          return ui.chip(model.displayName(tool), {
            tone: 'quiet',
            onClick: function () { App.navigate('#/tool/' + tool.id); }
          });
        }))
      ]);
    })));
  }

  /* Every connection in use, with the hosts and attachments on each side.
     An empty side is exactly the thing worth noticing. */
  function connectionPanel() {
    const owned = App.state.tools.filter(model.isOwned);
    const map = Object.create(null);

    owned.forEach(function (tool) {
      (tool.accepts || []).forEach(function (token) {
        map[token] = map[token] || { token: token, hosts: [], attachments: [] };
        map[token].hosts.push(tool);
      });
      (tool.fits || []).forEach(function (token) {
        map[token] = map[token] || { token: token, hosts: [], attachments: [] };
        map[token].attachments.push(tool);
      });
    });

    const rows = util.sortBy(Object.keys(map).map(function (key) { return map[key]; }), function (row) {
      return tax.interfaceGroupName(row.token) + row.token;
    });

    if (!rows.length) {
      return ui.section('Connections in use',
        h('p.muted', { text: 'Add “accepts” and “fits” connections to your tools to build the compatibility map.' }));
    }

    return ui.section('Connections in use', h('table.table.table--compact', [
      h('thead', h('tr', [
        h('th', { text: 'Connection' }),
        h('th', { text: 'Hosts' }),
        h('th', { text: 'Attachments' })
      ])),
      h('tbody', rows.map(function (row) {
        // Mains is a supply, not an attachment point: an empty attachment side
        // there is normal, not a gap worth flagging.
        const supply = row.token.split(':')[0] === 'mains';
        const gap = !supply && (!row.hosts.length || !row.attachments.length);
        return h('tr' + (gap ? '.row--warn' : ''), [
          h('td', [
            h('div.row__name', { text: tax.interfaceName(row.token) }),
            h('div.row__meta', { text: tax.interfaceGroupName(row.token) })
          ]),
          h('td', row.hosts.length
            ? h('div.chips', row.hosts.map(function (tool) {
                return ui.chip(model.displayName(tool), {
                  tone: 'quiet',
                  onClick: function () { App.navigate('#/tool/' + tool.id); }
                });
              }))
            : h('span.muted', { text: 'nothing takes this' })),
          h('td', row.attachments.length
            ? h('div.chips', row.attachments.map(function (tool) {
                return ui.chip(model.displayName(tool), {
                  tone: 'quiet',
                  onClick: function () { App.navigate('#/tool/' + tool.id); }
                });
              }))
            : h('span.muted', { text: supply ? '—' : 'nothing fits this' }))
        ]);
      }))
    ]), 'Rows highlighted amber have one side empty — a host with no attachments, or an attachment with no host.');
  }

  view.render = function (container) {
    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: 'Compatibility' }),
          h('p.view__subtitle', { text: 'What fits what, including through adapters you own.' })
        ])
      ]),
      App.state.tools.length
        ? [pairChecker(), platformPanel(), connectionPanel()]
        : ui.empty('Nothing to compare yet', 'Add a couple of tools first.',
            ui.button('Add a tool', { variant: 'primary', onClick: function () { App.navigate('#/new'); } }))
    ]);
  };

  App.views = App.views || {};
  App.views.compat = view;
})(window.App = window.App || {});
