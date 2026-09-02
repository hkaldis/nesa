/* Settings: backup, restore, import, sample data, storage. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const store = App.store;

  const view = {};

  function exportJson(withPhotos) {
    const bundle = { format: 'nesa-tools', version: 1, exportedAt: new Date().toISOString() };
    return store.allTools().then(function (tools) {
      bundle.tools = tools;
      return App.jobs.loadCustom();
    }).then(function (customJobs) {
      bundle.customJobs = customJobs;
      return withPhotos ? App.photos.exportAll() : [];
    }).then(function (photos) {
      bundle.photos = photos;
      const stamp = new Date().toISOString().slice(0, 10);
      util.download('tools-backup-' + stamp + '.json',
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
      ui.toast('Backup downloaded');
    });
  }

  function importJson(file) {
    return file.text().then(function (text) {
      const bundle = JSON.parse(text);
      const tools = (bundle.tools || bundle).map(model.normalize);
      if (!Array.isArray(tools) || !tools.length) throw new Error('No tools found in that file');
      return store.saveTools(tools)
        .then(function () { return bundle.photos ? App.photos.importAll(bundle.photos) : null; })
        .then(function () {
          if (!bundle.customJobs || !bundle.customJobs.length) return null;
          return App.jobs.loadCustom().then(function (existing) {
            const ids = existing.map(function (job) { return job.id; });
            return App.jobs.saveCustom(existing.concat(
              bundle.customJobs.filter(function (job) { return ids.indexOf(job.id) < 0; })
            ));
          });
        })
        .then(function () {
          ui.toast('Imported ' + util.plural(tools.length, 'tool'));
          return App.refresh();
        });
    }).catch(function (err) { ui.toast(err.message, 'danger'); });
  }

  function exportCsv() {
    return store.allTools().then(function (tools) {
      const rows = [model.CSV_COLUMNS.join(',')].concat(tools.map(model.toCsvRow));
      util.download('tools-' + new Date().toISOString().slice(0, 10) + '.csv',
        new Blob([rows.join('\n')], { type: 'text/csv' }));
      ui.toast('CSV downloaded');
    });
  }

  function importCsv(file) {
    return file.text().then(function (text) {
      const tools = model.fromCsvRows(util.parseCsv(text));
      if (!tools.length) throw new Error('No rows found');
      return store.saveTools(tools).then(function () {
        ui.toast('Imported ' + util.plural(tools.length, 'tool'));
        return App.refresh();
      });
    }).catch(function (err) { ui.toast(err.message, 'danger'); });
  }

  function filePicker(accept, onPick) {
    const input = h('input', {
      type: 'file',
      accept: accept,
      style: 'display:none',
      onchange: function (event) {
        const file = event.target.files && event.target.files[0];
        if (file) onPick(file);
        event.target.value = '';
      }
    });
    return input;
  }

  /* Import each tool's shipped images, but never re-fetch for a tool that
     already has photos on this device — those may be the owner's own. */
  function attachPhotos(tools, base) {
    return tools.reduce(function (chain, tool) {
      const files = tool.photoFiles || [];
      if (!files.length) return chain;
      return chain.then(function () {
        return store.getTool(tool.id);
      }).then(function (existing) {
        if (existing && (existing.photos || []).length) {
          tool.photos = existing.photos;
          return null;
        }
        return files.reduce(function (inner, file) {
          return inner.then(function (ids) {
            return App.photos.addFromUrl(base + file)
              .then(function (id) { return ids.concat([id]); })
              .catch(function (err) { console.warn(err.message); return ids; });
          });
        }, Promise.resolve([])).then(function (ids) { tool.photos = ids; });
      });
    }, Promise.resolve());
  }

  /* Load a bundle shipped with the app. Records merge by tool id, so importing
     the same file twice updates those tools instead of duplicating them. */
  function loadBundle(path, label) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error(label + ' not found');
      return response.json();
    }).then(function (bundle) {
      const tools = (bundle.tools || []).map(model.normalize);
      if (!tools.length) throw new Error(label + ' is empty');
      // Paths in photoFiles are relative to the bundle, so a bundle can ship
      // its own images without hard-coding where it lives.
      const base = path.replace(/[^/]+$/, '');
      return attachPhotos(tools, base).then(function () {
        return store.saveTools(tools);
      }).then(function () {
        ui.toast(label + ': ' + util.plural(tools.length, 'tool') + ' imported');
        return App.refresh();
      }).then(function () { App.navigate('#/inventory'); });
    }).catch(function (err) { ui.toast(err.message, 'danger'); });
  }

  view.render = function (container) {
    const jsonInput = filePicker('.json,application/json', importJson);
    const csvInput = filePicker('.csv,text/csv', importCsv);

    const storageLine = h('p.muted', { text: 'Checking storage…' });
    store.estimateUsage().then(function (estimate) {
      if (!estimate || !estimate.usage) {
        storageLine.textContent = store.isFallback()
          ? 'Using localStorage — IndexedDB is unavailable in this browser context.'
          : 'Stored in this browser on this device.';
        return;
      }
      const used = (estimate.usage / 1048576).toFixed(1);
      const quota = estimate.quota ? (estimate.quota / 1048576).toFixed(0) : null;
      storageLine.textContent = 'Using ' + used + ' MB' + (quota ? ' of about ' + quota + ' MB available' : '') +
        ' in this browser, on this device only.';
    });

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: 'Settings' }),
          h('p.view__subtitle', { text: 'Your data never leaves this device unless you export it.' })
        ])
      ]),

      ui.section('Backup', [
        h('p.section__text', { text: 'A full backup includes photos and is the file to keep. Restoring merges by tool id, so re-importing your own backup will not create duplicates.' }),
        h('div.button-row', [
          ui.button('Export everything', { variant: 'primary', onClick: function () { exportJson(true); } }),
          ui.button('Export without photos', { onClick: function () { exportJson(false); } }),
          ui.button('Restore from backup', { onClick: function () { jsonInput.click(); } })
        ]),
        jsonInput
      ]),

      ui.section('Spreadsheet', [
        h('p.section__text', { text: 'CSV covers the text fields only — handy for bulk-adding tools in a spreadsheet, not for photos.' }),
        h('div.button-row', [
          ui.button('Export CSV', { onClick: exportCsv }),
          ui.button('Import CSV', { onClick: function () { csvInput.click(); } })
        ]),
        csvInput,
        h('details.help', [
          h('summary', { text: 'CSV column reference' }),
          h('p.section__text', { text: model.CSV_COLUMNS.join(', ') }),
          h('p.section__text', { text: 'List columns (tags, capabilities, accepts, fits) are pipe-separated, e.g. drive:1/2|shank:hex-1/4.' })
        ])
      ]),

      ui.section('My tools', [
        h('p.section__text', { text: 'Tools kept in the repository as a file, so they can be re-imported onto any device or after clearing data. Importing merges by tool id: it updates these records rather than duplicating them, but it will also overwrite edits you made to them here.' }),
        h('div.button-row', [
          ui.button('Import my tools', {
            variant: 'primary',
            onClick: function () { loadBundle('data/my-tools.json', 'My tools'); }
          })
        ])
      ]),

      ui.section('Storage', [
        storageLine,
        h('div.button-row', [
          ui.button('Load sample inventory', {
            onClick: function () { loadBundle('data/sample-inventory.json', 'Sample inventory'); }
          }),
          ui.button('Delete everything', {
            variant: 'danger',
            onClick: function () {
              ui.confirm('Delete all data?', 'Every tool and photo on this device will be removed. Export a backup first if you want to keep it.', function () {
                store.clearTools().then(function () {
                  ui.toast('All data deleted');
                  return App.refresh();
                }).then(function () { App.navigate('#/inventory'); });
              }, 'Delete everything');
            }
          })
        ])
      ]),

      ui.section('About', [
        h('p.section__text', { text: 'Nesa is a local-first tool inventory: an offline record of what you own, what it connects to, and what is missing. Add it to your home screen to use it in the workshop without a connection.' })
      ])
    ]);
  };

  App.views = App.views || {};
  App.views.settings = view;
})(window.App = window.App || {});
