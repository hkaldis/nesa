/* Gap analysis. Four independent signals, then one ranked shopping list:

   1. Kit coverage   - checklists per kind of work (automotive, woodworking...)
   2. Size series    - holes in a set: the missing 15 mm socket
   3. Compatibility  - accessories with no host, hosts with no accessories,
                       battery platforms with no charger
   4. Job readiness  - what unblocks the most jobs per item bought */
(function (App) {
  'use strict';

  const model = App.model;
  const util = App.util;
  const tax = App.taxonomy;
  const compat = App.compat;
  const jobsApi = App.jobs;

  const gaps = {};

  function ownedTools(tools) {
    return tools.filter(model.isOwned);
  }

  /* ------------------------------------------------------------- 1. kit coverage */
  gaps.kitCoverage = function (tools, kits) {
    const owned = ownedTools(tools);
    return (kits || tax.CORE_KITS).map(function (kit) {
      const items = kit.items.map(function (item) {
        const matches = owned.filter(function (tool) { return jobsApi.satisfies(tool, item); });
        return { item: item, matches: matches, have: matches.length > 0 };
      });
      const held = items.filter(function (i) { return i.have; }).length;
      return {
        kit: kit,
        items: items,
        held: held,
        total: items.length,
        missing: items.filter(function (i) { return !i.have; }),
        coverage: items.length ? held / items.length : 1
      };
    });
  };

  /* ------------------------------------------------------------ 2. size series */
  /* A tool contributes sizes from either a single `size` or a `sizeRange`
     ("8-19mm"), so a socket set counts as everything it spans. */
  function sizesOwned(tools, series) {
    const held = [];
    tools.forEach(function (tool) {
      if (tool.category !== series.category) return;
      const single = tool.parsedSize || util.parseSize(tool.size);
      if (single && single.system === series.system) held.push(single.value);
      // An itemised set contributes exactly what it lists, so the sizes it
      // skips still register as gaps.
      (tool.parsedSizes || []).forEach(function (parsed) {
        if (parsed.system === series.system) held.push(parsed.value);
      });
      const range = jobsApi.parseRange(tool.sizeRange);
      if (range && range.system === series.system) {
        series.sizes.forEach(function (size) {
          if (size >= range.min - 1e-9 && size <= range.max + 1e-9) held.push(size);
        });
      }
    });
    return util.unique(held);
  }

  gaps.seriesGaps = function (tools) {
    const owned = ownedTools(tools);
    return tax.STANDARD_SERIES.map(function (series) {
      const held = sizesOwned(owned, series);
      if (!held.length) return null;

      const min = Math.min.apply(null, held);
      const max = Math.max.apply(null, held);
      const insideRange = series.sizes.filter(function (size) { return size >= min && size <= max; });
      const missingInside = insideRange.filter(function (size) {
        return !held.some(function (h) { return Math.abs(h - size) < 1e-9; });
      });
      const missingCommon = (series.common || []).filter(function (size) {
        return !held.some(function (h) { return Math.abs(h - size) < 1e-9; });
      });

      return {
        series: series,
        held: held.sort(function (a, b) { return a - b; }),
        missingInside: missingInside,
        missingCommon: missingCommon,
        span: { min: min, max: max },
        label: function (size) { return util.formatSize(size, series.system); }
      };
    }).filter(Boolean).filter(function (row) {
      return row.missingInside.length || row.missingCommon.length;
    });
  };

  /* ------------------------------------------------------ 3. compatibility gaps */
  gaps.compatibilityGaps = function (tools) {
    const owned = ownedTools(tools);
    const findings = [];

    owned.forEach(function (tool) {
      const isAccessory = model.isAccessory(tool);
      const report = compat.report(tool, owned);

      if (isAccessory && !report.fitsInto.length && (tool.fits || []).length) {
        findings.push({
          kind: 'orphan-accessory',
          severity: 'high',
          tool: tool,
          title: model.displayName(tool) + ' has nothing to run it',
          detail: 'Needs a host that accepts ' + (tool.fits || []).map(tax.interfaceName).join(' or ') + '.'
        });
      }

      // Mains and battery inputs are not "accessories" anyone shops for, so
      // they are left out of the wording here.
      const attachmentPoints = (tool.accepts || []).filter(function (token) {
        const group = token.split(':')[0];
        return group !== 'mains' && group !== 'battery' && group !== 'air';
      });
      if (!isAccessory && attachmentPoints.length && !report.takes.length && !report.takesViaAdapter.length) {
        findings.push({
          kind: 'host-without-accessories',
          severity: 'medium',
          tool: tool,
          title: model.displayName(tool) + ' has no accessories',
          detail: 'Takes ' + attachmentPoints.map(tax.interfaceName).join(', ') + ' but you own nothing that fits.'
        });
      }

      const alreadyFlagged = findings.some(function (finding) {
        return finding.kind === 'host-without-accessories' && finding.tool === tool;
      });
      report.unusedInterfaces.forEach(function (token) {
        if (alreadyFlagged) return;
        const group = token.split(':')[0];
        if (group === 'battery' || group === 'mains' || group === 'air') return;
        findings.push({
          kind: 'unused-interface',
          severity: 'low',
          tool: tool,
          title: 'Nothing for the ' + tax.interfaceName(token) + ' on ' + model.displayName(tool),
          detail: 'This tool can take ' + tax.interfaceName(token) + ' attachments you do not own.'
        });
      });
    });

    compat.platformReport(tools).forEach(function (platform) {
      platform.issues.forEach(function (issue) {
        findings.push({
          kind: 'platform',
          severity: issue.indexOf('No ') === 0 ? 'high' : 'medium',
          title: platform.name + ': ' + issue,
          detail: util.plural(platform.tools.length, 'tool') + ', ' +
            util.plural(platform.batteryCount, 'battery', 'batteries') + ', ' +
            util.plural(platform.chargers.length, 'charger') + '.'
        });
      });
    });

    const order = { high: 0, medium: 1, low: 2 };
    return findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
  };

  /* --------------------------------------------------------- 4. job readiness */
  /* Group the missing requirements across all jobs so one purchase can be
     credited with everything it unblocks. */
  gaps.jobGaps = function (tools, jobList) {
    const plans = jobsApi.planAll(jobList, tools);
    const wanted = Object.create(null);

    plans.forEach(function (plan) {
      plan.missing.forEach(function (line) {
        // Group on capability where there is one - two jobs asking for
        // "a way to lift the car" are one purchase. Category requirements keep
        // their own label, so a caliper tool and an oil filter wrench stay
        // separate even though both are filed under automotive.
        const key = line.requirement.capability || jobsApi.requirementLabel(line.requirement);
        if (!wanted[key]) {
          wanted[key] = {
            key: key,
            label: jobsApi.requirementLabel(line.requirement),
            requirement: line.requirement,
            blocks: [],
            nearlyReady: 0
          };
        }
        if (wanted[key].blocks.indexOf(plan.job) < 0) {
          wanted[key].blocks.push(plan.job);
          if (plan.missing.length === 1) wanted[key].nearlyReady += 1;
        }
      });
    });

    return Object.keys(wanted).map(function (key) { return wanted[key]; })
      .sort(function (a, b) {
        if (b.nearlyReady !== a.nearlyReady) return b.nearlyReady - a.nearlyReady;
        return b.blocks.length - a.blocks.length;
      });
  };

  /* ------------------------------------------------------- ranked buy-next list */
  gaps.suggestions = function (tools, jobList, kits) {
    const suggestions = [];

    gaps.jobGaps(tools, jobList).forEach(function (row) {
      suggestions.push({
        label: row.label,
        why: row.nearlyReady
          ? 'Last thing missing for ' + util.plural(row.nearlyReady, 'job')
          : 'Blocks ' + util.plural(row.blocks.length, 'job'),
        detail: row.blocks.map(function (job) { return job.name; }).join(', '),
        score: row.nearlyReady * 10 + row.blocks.length * 3,
        source: 'jobs'
      });
    });

    gaps.compatibilityGaps(tools).forEach(function (finding) {
      if (finding.severity === 'low') return;
      suggestions.push({
        label: finding.title,
        why: finding.severity === 'high' ? 'Something you own is unusable' : 'Limits what you own',
        detail: finding.detail,
        score: finding.severity === 'high' ? 12 : 6,
        source: 'compatibility'
      });
    });

    gaps.seriesGaps(tools).forEach(function (row) {
      if (!row.missingInside.length) return;
      suggestions.push({
        label: row.series.name + ': missing ' + row.missingInside.map(row.label).join(', '),
        why: 'Hole in a set you already own',
        detail: 'You hold ' + row.label(row.span.min) + ' to ' + row.label(row.span.max) + '.',
        score: 4 + Math.min(row.missingInside.length, 4),
        source: 'series'
      });
    });

    gaps.kitCoverage(tools, kits).forEach(function (row) {
      if (row.coverage === 1 || !row.missing.length) return;
      // Only nag about kits you are clearly invested in already.
      if (row.coverage < 0.34) return;
      row.missing.forEach(function (entry) {
        suggestions.push({
          label: entry.item.label,
          why: 'Completes your ' + row.kit.name.toLowerCase() + ' kit',
          detail: row.held + ' of ' + row.total + ' already owned.',
          score: 2 + row.coverage * 3,
          source: 'kit'
        });
      });
    });

    // Same thing can be suggested by several signals; keep the strongest.
    const merged = Object.create(null);
    suggestions.forEach(function (suggestion) {
      const key = suggestion.label.toLowerCase();
      if (!merged[key] || merged[key].score < suggestion.score) merged[key] = suggestion;
    });

    return Object.keys(merged).map(function (key) { return merged[key]; })
      .sort(function (a, b) { return b.score - a.score; });
  };

  /* ------------------------------------------------------------- quick stats */
  gaps.stats = function (tools) {
    const owned = ownedTools(tools);
    const value = owned.reduce(function (sum, tool) {
      const price = Number(tool.price);
      return sum + (isNaN(price) ? 0 : price * (tool.quantity || 1));
    }, 0);
    return {
      total: owned.reduce(function (sum, tool) { return sum + (tool.quantity || 1); }, 0),
      records: owned.length,
      brands: util.unique(owned.map(function (t) { return t.brand; })).length,
      categories: util.unique(owned.map(function (t) { return t.category; })).length,
      photographed: owned.filter(function (t) { return (t.photos || []).length; }).length,
      value: value,
      currency: (owned[0] && owned[0].currency) || 'GBP',
      lentOut: tools.filter(function (t) { return t.status === 'lent out'; }).length,
      wishlist: tools.filter(function (t) { return t.status === 'wishlist'; }).length,
      needsRepair: owned.filter(function (t) { return t.condition === 'needs repair' || t.condition === 'broken'; }).length
    };
  };

  App.gaps = gaps;
})(window.App = window.App || {});
