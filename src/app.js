/* Application shell: state, hash router, chrome. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const model = App.model;

  App.state = {
    tools: [],
    jobs: [],
    plans: [],
    filters: {},
    layout: 'grid',
    draft: null,
    draftKey: null,
    route: { name: 'inventory', params: {} }
  };

  const ROUTES = [
    { pattern: /^#?\/?$/, name: 'inventory' },
    { pattern: /^#\/inventory$/, name: 'inventory' },
    { pattern: /^#\/new$/, name: 'toolForm' },
    { pattern: /^#\/edit\/(.+)$/, name: 'toolForm', keys: ['id'] },
    { pattern: /^#\/tool\/(.+)$/, name: 'toolDetail', keys: ['id'] },
    { pattern: /^#\/jobs$/, name: 'jobs' },
    { pattern: /^#\/job\/(.+)$/, name: 'jobDetail', keys: ['id'] },
    { pattern: /^#\/compatibility$/, name: 'compat' },
    { pattern: /^#\/gaps$/, name: 'gaps' },
    { pattern: /^#\/settings$/, name: 'settings' }
  ];

  const TABS = [
    { hash: '#/inventory', label: 'Inventory', match: ['inventory', 'toolDetail', 'toolForm'] },
    { hash: '#/jobs', label: 'Jobs', match: ['jobs', 'jobDetail'] },
    { hash: '#/compatibility', label: 'Fits', match: ['compat'] },
    { hash: '#/gaps', label: 'Gaps', match: ['gaps'] },
    { hash: '#/settings', label: 'Settings', match: ['settings'] }
  ];

  function parseRoute(hash) {
    for (let i = 0; i < ROUTES.length; i += 1) {
      const route = ROUTES[i];
      const found = String(hash || '').match(route.pattern);
      if (!found) continue;
      const params = {};
      (route.keys || []).forEach(function (key, index) {
        params[key] = decodeURIComponent(found[index + 1]);
      });
      return { name: route.name, params: params };
    }
    return { name: 'inventory', params: {} };
  }

  App.navigate = function (hash) {
    if (window.location.hash === hash) App.render();
    else window.location.hash = hash;
  };

  /* Reload everything from storage, recompute job plans, redraw. */
  App.refresh = function () {
    return Promise.all([App.store.allTools(), App.jobs.all()]).then(function (results) {
      App.state.tools = results[0].map(model.normalize);
      App.state.jobs = results[1];
      App.state.plans = App.jobs.planAll(App.state.jobs, App.state.tools);
      App.render();
    });
  };

  App.saveUiState = function () {
    return App.store.setSetting('ui', { layout: App.state.layout });
  };

  function header() {
    return h('header.app-header', [
      h('a.brand', { href: '#/inventory' }, [
        h('span.brand__mark', { text: 'N' }),
        h('span.brand__name', { text: 'Nesa' })
      ]),
      h('nav.tabs', TABS.map(function (tab) {
        const active = tab.match.indexOf(App.state.route.name) >= 0;
        return h('a.tab' + (active ? '.tab--active' : ''), {
          href: tab.hash,
          text: tab.label,
          'aria-current': active ? 'page' : null
        });
      }))
    ]);
  }

  App.render = function () {
    const main = document.getElementById('view');
    const chrome = document.getElementById('chrome');
    if (!main || !chrome) return;

    util.clear(chrome);
    chrome.appendChild(header());

    util.clear(main);
    main.scrollTop = 0;

    const route = App.state.route;
    const views = App.views;
    const renderers = {
      inventory: views.inventory.render,
      toolForm: views.toolForm.render,
      toolDetail: views.toolDetail.render,
      jobs: views.jobs.render,
      jobDetail: views.jobs.renderDetail,
      compat: views.compat.render,
      gaps: views.gaps.render,
      settings: views.settings.render
    };

    const render = renderers[route.name] || renderers.inventory;
    try {
      render(main, route.params);
    } catch (err) {
      console.error(err);
      util.append(main, App.ui.empty('Something went wrong', err.message,
        App.ui.button('Back to inventory', { onClick: function () { App.navigate('#/inventory'); } })));
    }
  };

  function onHashChange() {
    const next = parseRoute(window.location.hash);
    // Leaving the editor throws away an unsaved draft rather than leaking it
    // into the next tool you open.
    if (App.state.route.name === 'toolForm' && next.name !== 'toolForm') {
      App.state.draft = null;
      App.state.draftKey = null;
    }
    App.state.route = next;
    App.render();
  }

  function boot() {
    window.addEventListener('hashchange', onHashChange);
    App.state.route = parseRoute(window.location.hash);

    App.store.getSetting('ui', {}).then(function (ui) {
      if (ui && ui.layout) App.state.layout = ui.layout;
      return App.refresh();
    }).catch(function (err) {
      console.error(err);
      App.render();
    });

    if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.App = window.App || {});
