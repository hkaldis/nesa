/* Importing the inventory bundle that ships with the app. Shared by the
   Settings screen and the empty inventory screen.

   Tools are saved before any photo is fetched: on a phone the images are by far
   the slowest part, and waiting on them made the whole import look like it had
   done nothing. The inventory appears at once and the pictures fill in after. */
(function (App) {
  'use strict';

  const util = App.util;
  const model = App.model;
  const store = App.store;

  const bundles = {};

  /* Carry over photos already held on this device. This has to happen before
     the tools are saved: saving replaces the stored record, so reading the old
     photo ids afterwards would find an empty list and re-fetch every image. */
  function preserveExistingPhotos(tools) {
    return tools.reduce(function (chain, tool) {
      return chain.then(function () {
        return store.getTool(tool.id);
      }).then(function (existing) {
        if (existing && (existing.photos || []).length) tool.photos = existing.photos;
      });
    }, Promise.resolve());
  }

  /* Fetch each tool's shipped images and attach them, saving as we go so a
     dropped connection keeps whatever arrived. A tool that already has photos
     is left alone — they may be the owner's own pictures. */
  function attachPhotos(tools, base) {
    return tools.reduce(function (chain, tool) {
      const files = tool.photoFiles || [];
      if (!files.length || (tool.photos || []).length) return chain;
      return chain.then(function (added) {
        return Promise.resolve().then(function () {
          return files.reduce(function (inner, file) {
            return inner.then(function (ids) {
              return App.photos.addFromUrl(base + file)
                .then(function (id) { return ids.concat([id]); })
                .catch(function (err) { console.warn(err.message); return ids; });
            });
          }, Promise.resolve([])).then(function (ids) {
            if (!ids.length) return added;
            tool.photos = ids;
            return store.saveTool(tool).then(function () { return added + 1; });
          });
        });
      });
    }, Promise.resolve(0));
  }

  /* Load a bundle shipped with the app. Records merge by tool id, so importing
     the same file twice updates those tools instead of duplicating them. */
  bundles.import = function (path, label) {
    const ui = App.ui;
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error(label + ' not found (' + response.status + ')');
      return response.json();
    }).then(function (bundle) {
      const tools = (bundle.tools || []).map(model.normalize);
      if (!tools.length) throw new Error(label + ' is empty');

      return preserveExistingPhotos(tools).then(function () {
        return store.saveTools(tools);
      }).then(function () {
        return App.refresh();
      }).then(function () {
        App.navigate('#/inventory');
        const withPhotos = tools.filter(function (t) {
          return (t.photoFiles || []).length && !(t.photos || []).length;
        }).length;
        ui.toast(util.plural(tools.length, 'tool') + ' imported' +
          (withPhotos ? ' — fetching ' + util.plural(withPhotos, 'photo') + '…' : ''));
        // photoFiles are relative to the bundle, so a bundle can move freely.
        return attachPhotos(tools, path.replace(/[^/]+$/, ''));
      }).then(function (added) {
        if (!added) return null;
        return App.refresh().then(function () {
          ui.toast(util.plural(added, 'photo') + ' added');
        });
      });
    }).catch(function (err) {
      App.ui.toast(err.message, 'danger');
    });
  };

  bundles.MY_TOOLS = 'data/my-tools.json';

  /* The app once shipped a demo inventory, and loading it was one tap away from
     importing the real one. It is gone; this clears any of its records left on
     a device. Sample tools all carry a `sample-` id, so nothing else matches. */
  bundles.purgeSamples = function () {
    return store.allTools().then(function (tools) {
      const samples = tools.filter(function (tool) {
        return String(tool.id).indexOf('sample-') === 0;
      });
      if (!samples.length) return 0;
      return samples.reduce(function (chain, tool) {
        return chain.then(function () { return store.deleteTool(tool.id); });
      }, Promise.resolve()).then(function () { return samples.length; });
    });
  };

  App.bundles = bundles;
})(window.App = window.App || {});
