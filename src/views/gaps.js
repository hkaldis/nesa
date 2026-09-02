/* Gaps: the shopping list, kit coverage, holes in sets, compatibility problems. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const gaps = App.gaps;

  const view = {};

  function statsRow() {
    const stats = gaps.stats(App.state.tools);
    return h('div.stats', [
      ui.stat('tools', stats.records, stats.total > stats.records
        ? stats.total + ' items counting sets and multiples' : null),
      ui.stat('categories', stats.categories),
      ui.stat('brands', stats.brands),
      ui.stat('with photos', stats.photographed),
      stats.value ? ui.stat('value', util.formatMoney(stats.value, stats.currency)) : null,
      stats.lentOut ? ui.stat('lent out', stats.lentOut) : null,
      stats.needsRepair ? ui.stat('need repair', stats.needsRepair) : null
    ].filter(Boolean));
  }

  function buyNext() {
    const suggestions = gaps.suggestions(App.state.tools, App.state.jobs).slice(0, 12);
    if (!suggestions.length) {
      return ui.section('What to get next',
        h('p.muted', { text: 'Nothing obvious missing — either you are well equipped or there is not enough recorded yet.' }));
    }

    return ui.section('What to get next', h('ol.buy-list', suggestions.map(function (suggestion, index) {
      return h('li.buy-list__item', [
        h('span.buy-list__rank', { text: String(index + 1) }),
        h('div.buy-list__text', [
          h('span.buy-list__label', { text: suggestion.label }),
          h('span.buy-list__why', { text: suggestion.why }),
          suggestion.detail ? h('span.buy-list__detail', { text: suggestion.detail }) : null
        ]),
        ui.chip(suggestion.source, { tone: 'quiet' })
      ]);
    })), 'Ranked by how much each purchase unblocks.');
  }

  function kitCoverage() {
    const rows = gaps.kitCoverage(App.state.tools).sort(function (a, b) { return b.coverage - a.coverage; });
    return ui.section('Kit coverage', h('div.kits', rows.map(function (row) {
      return h('article.kit', [
        h('div.kit__head', [
          h('h3.kit__name', { text: row.kit.name }),
          h('span.kit__score', { text: row.held + '/' + row.total })
        ]),
        ui.meter(row.coverage),
        row.missing.length
          ? h('div.chips', row.missing.map(function (entry) {
              return ui.chip(entry.item.label, { tone: 'quiet' });
            }))
          : h('p.kit__ok', { text: 'Complete.' })
      ]);
    })), 'Checklists per kind of work. Missing items are shown in grey.');
  }

  function seriesGaps() {
    const rows = gaps.seriesGaps(App.state.tools);
    if (!rows.length) return null;

    return ui.section('Holes in your sets', h('div.series', rows.map(function (row) {
      return h('article.series__item', [
        h('h3.series__name', { text: row.series.name }),
        h('p.series__span', {
          text: 'You hold ' + row.label(row.span.min) + ' to ' + row.label(row.span.max) +
            ' (' + row.held.length + ' sizes).'
        }),
        row.missingInside.length
          ? h('div.series__group', [
              h('h4', { text: 'Missing inside that range' }),
              h('div.chips', row.missingInside.map(function (size) {
                return ui.chip(row.label(size), { tone: 'danger' });
              }))
            ])
          : null,
        row.missingCommon.length
          ? h('div.series__group', [
              h('h4', { text: 'Common sizes you do not have' }),
              h('div.chips', row.missingCommon.map(function (size) {
                return ui.chip(row.label(size), { tone: 'warn' });
              }))
            ])
          : null
      ]);
    })), 'Sizes are read from each tool’s size or size range, so a set entered as “8-19mm” counts as everything it spans.');
  }

  function compatFindings() {
    const findings = gaps.compatibilityGaps(App.state.tools);
    if (!findings.length) return null;

    return ui.section('Compatibility problems', h('ul.findings', findings.slice(0, 20).map(function (finding) {
      return h('li.finding.finding--' + finding.severity, {
        onclick: finding.tool ? function () { App.navigate('#/tool/' + finding.tool.id); } : null,
        tabindex: finding.tool ? 0 : null
      }, [
        h('span.finding__severity', { text: finding.severity }),
        h('div', [
          h('span.finding__title', { text: finding.title }),
          h('span.finding__detail', { text: finding.detail })
        ])
      ]);
    })));
  }

  view.render = function (container) {
    if (!App.state.tools.length) {
      util.append(container, [
        h('div.view__head', h('h1.view__title', { text: 'Gaps' })),
        ui.empty('Nothing to analyse yet',
          'Add tools — or load the sample inventory from Settings — and this page will show what is missing.',
          ui.button('Add a tool', { variant: 'primary', onClick: function () { App.navigate('#/new'); } }))
      ]);
      return;
    }

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: 'Gaps' }),
          h('p.view__subtitle', { text: 'Where the collection is thin, and what fixes the most at once.' })
        ])
      ]),
      statsRow(),
      buyNext(),
      seriesGaps(),
      compatFindings(),
      kitCoverage()
    ]);
  };

  App.views = App.views || {};
  App.views.gaps = view;
})(window.App = window.App || {});
