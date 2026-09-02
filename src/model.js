/* Tool records: shape, defaults, normalisation and search. */
(function (App) {
  'use strict';

  const util = App.util;
  const tax = App.taxonomy;

  const model = {};

  model.blankTool = function () {
    return {
      id: util.uid(),
      name: '',
      brand: '',
      modelNumber: '',
      category: '',
      status: 'owned',
      condition: 'good',
      powerSource: 'manual',
      quantity: 1,
      size: '',
      sizeRange: '',
      setName: '',
      location: '',
      purchaseDate: '',
      price: '',
      currency: 'GBP',
      serial: '',
      notes: '',
      tags: [],
      capabilities: [],
      accepts: [],
      fits: [],
      photos: [],
      lentTo: '',
      lastServiced: '',
      createdAt: '',
      updatedAt: ''
    };
  };

  /* Fills in the fields people forget, so search and analysis never see undefined. */
  model.normalize = function (input) {
    const tool = Object.assign(model.blankTool(), input || {});
    tool.id = tool.id || util.uid();
    ['tags', 'capabilities', 'accepts', 'fits', 'photos', 'sizes'].forEach(function (key) {
      if (!Array.isArray(tool[key])) {
        tool[key] = typeof tool[key] === 'string' && tool[key]
          ? tool[key].split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean)
          : [];
      }
      tool[key] = util.unique(tool[key]);
    });
    tool.quantity = Math.max(1, Number(tool.quantity) || 1);
    tool.name = String(tool.name || '').trim();
    tool.brand = String(tool.brand || '').trim();
    if (!tool.name) tool.name = [tool.brand, tax.categoryName(tool.category)].filter(Boolean).join(' ') || 'Untitled tool';
    tool.parsedSize = util.parseSize(tool.size);
    // An itemised set: the sizes it actually contains, gaps and all.
    tool.parsedSizes = (tool.sizes || []).map(util.parseSize).filter(Boolean);
    return tool;
  };

  model.displayName = function (tool) {
    return [tool.brand, tool.name].filter(Boolean).join(' ').trim() || tool.name || 'Untitled tool';
  };

  model.subtitle = function (tool) {
    const bits = [tax.categoryName(tool.category)];
    if (tool.modelNumber) bits.push(tool.modelNumber);
    if (tool.size) bits.push(tool.size);
    return bits.filter(Boolean).join(' · ');
  };

  model.isAccessory = function (tool) {
    const cat = tax.categoryById[tool.category];
    return !!(cat && cat.accessory);
  };

  model.isAdapter = function (tool) {
    const cat = tax.categoryById[tool.category];
    return !!(cat && cat.adapter) || (tool.accepts.length > 0 && tool.fits.length > 0);
  };

  model.isOwned = function (tool) {
    return tool.status === 'owned' || tool.status === 'lent out';
  };

  /* Interfaces we can infer from category + power source, offered as one-tap
     suggestions in the editor rather than written silently into the record. */
  model.suggestInterfaces = function (tool) {
    const accepts = [], fits = [];
    const category = tool.category;
    const push = function (list, token) { if (token && list.indexOf(token) < 0) list.push(token); };

    if (tool.powerSource === 'cordless' && tool.platform) {
      push(tool.category === 'battery' || tool.category === 'charger' ? fits : accepts, 'battery:' + tool.platform);
    }
    if (tool.powerSource === 'corded') push(accepts, 'mains:230v');
    if (tool.powerSource === 'pneumatic') push(accepts, 'air:1/4-bsp');

    const map = {
      'drill-driver': { accepts: ['chuck:13mm', 'shank:hex-1/4', 'shank:round'] },
      'hammer-drill': { accepts: ['chuck:13mm', 'shank:round'] },
      'impact-driver': { accepts: ['shank:hex-1/4'] },
      'rotary-hammer': { accepts: ['shank:sds-plus'] },
      'drill-bit': { fits: ['shank:round', 'chuck:13mm'] },
      'driver-bit': { fits: ['shank:hex-1/4'] },
      'hole-saw': { fits: ['shank:hex-1/4'] },
      ratchet: { accepts: ['drive:1/2'] },
      'torque-wrench': { accepts: ['drive:1/2'] },
      'impact-wrench': { accepts: ['drive:1/2'] },
      socket: { fits: ['drive:1/2'] },
      'extension-bar': { accepts: ['drive:1/2'], fits: ['drive:1/2'] },
      'drive-adapter': { accepts: ['drive:3/8'], fits: ['drive:1/2'] },
      'angle-grinder': { accepts: ['spindle:m14', 'disc:115mm'] },
      'grinder-disc': { fits: ['spindle:m14', 'disc:115mm'] },
      jigsaw: { accepts: ['sawblade:jigsaw-t'] },
      'reciprocating-saw': { accepts: ['sawblade:recip'] },
      'circular-saw': { accepts: ['sawblade:circ-30mm'] },
      'mitre-saw': { accepts: ['sawblade:circ-30mm'] },
      'saw-blade': { fits: ['sawblade:jigsaw-t'] },
      'multi-tool': { accepts: ['oscillating:starlock'] },
      router: { accepts: ['collet:1/4'] },
      'router-bit': { fits: ['collet:1/4'] },
      sander: { accepts: ['dust:32mm'] },
      vacuum: { fits: ['dust:32mm'] },
      compressor: { fits: ['air:1/4-bsp'] },
      'air-tool': { accepts: ['air:1/4-bsp'] },
      battery: { fits: [] },
      charger: { fits: [] }
    }[category];

    if (map) {
      (map.accepts || []).forEach(function (t) { push(accepts, t); });
      (map.fits || []).forEach(function (t) { push(fits, t); });
    }
    return { accepts: accepts, fits: fits };
  };

  model.defaultCapabilities = function (categoryId) {
    return (tax.CATEGORY_CAPABILITIES[categoryId] || []).slice();
  };

  model.searchText = function (tool) {
    return [
      tool.name, tool.brand, tool.modelNumber, tool.serial, tool.location, tool.notes,
      tool.setName, tool.size, (tool.sizes || []).join(' '), tax.categoryName(tool.category),
      (tool.tags || []).join(' '),
      (tool.capabilities || []).map(tax.capabilityName).join(' '),
      (tool.accepts || []).concat(tool.fits || []).map(tax.interfaceName).join(' ')
    ].join(' ').toLowerCase();
  };

  model.matches = function (tool, filters) {
    if (!filters) return true;
    if (filters.query) {
      const needle = filters.query.toLowerCase().trim();
      if (needle && model.searchText(tool).indexOf(needle) < 0) return false;
    }
    if (filters.category && tool.category !== filters.category) {
      const cat = tax.categoryById[tool.category];
      if (!cat || cat.group !== filters.category) return false;
    }
    if (filters.brand && tool.brand !== filters.brand) return false;
    if (filters.status && tool.status !== filters.status) return false;
    if (filters.location && tool.location !== filters.location) return false;
    if (filters.platform) {
      const tokens = (tool.accepts || []).concat(tool.fits || []);
      if (tokens.indexOf('battery:' + filters.platform) < 0) return false;
    }
    if (filters.capability && (tool.capabilities || []).indexOf(filters.capability) < 0) return false;
    return true;
  };

  /* CSV round-trip: one row per tool, list fields pipe-separated. */
  model.CSV_COLUMNS = ['name', 'brand', 'modelNumber', 'category', 'status', 'condition',
    'powerSource', 'platform', 'quantity', 'size', 'sizes', 'setName', 'location', 'purchaseDate',
    'price', 'currency', 'serial', 'tags', 'capabilities', 'accepts', 'fits', 'notes'];

  model.toCsvRow = function (tool) {
    return model.CSV_COLUMNS.map(function (column) {
      const value = tool[column];
      return util.escapeCsv(Array.isArray(value) ? value.join('|') : value);
    }).join(',');
  };

  model.fromCsvRows = function (rows) {
    if (!rows.length) return [];
    const header = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (row) {
      const raw = {};
      header.forEach(function (column, index) {
        const value = (row[index] || '').trim();
        if (!value) return;
        raw[column] = ['tags', 'capabilities', 'accepts', 'fits', 'sizes'].indexOf(column) >= 0
          ? value.split(/[|;]/).map(function (s) { return s.trim(); }).filter(Boolean)
          : value;
      });
      raw.id = util.uid();
      return model.normalize(raw);
    });
  };

  App.model = model;
})(window.App = window.App || {});
