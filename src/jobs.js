/* Job planner: given a job's requirements, work out what you can cover from
   the inventory and what is missing. Requirements match on capability,
   category, a specific size, or a named tool. */
(function (App) {
  'use strict';

  const model = App.model;
  const util = App.util;
  const tax = App.taxonomy;

  const jobs = {};

  /* A tool satisfies a requirement when every stated constraint holds. */
  jobs.satisfies = function (tool, requirement) {
    if (!model.isOwned(tool)) return false;
    if (requirement.capability && (tool.capabilities || []).indexOf(requirement.capability) < 0) return false;
    if (requirement.category) {
      const category = tax.categoryById[tool.category];
      const groupMatch = category && category.group === requirement.category;
      if (tool.category !== requirement.category && !groupMatch) return false;
    }
    if (requirement.tag && (tool.tags || []).indexOf(requirement.tag) < 0) return false;
    if (requirement.interface) {
      const all = (tool.accepts || []).concat(tool.fits || []);
      if (all.indexOf(requirement.interface) < 0) return false;
    }
    if (requirement.size) {
      const size = tool.parsedSize || util.parseSize(tool.size);
      const range = jobs.parseRange(tool.sizeRange);
      const wanted = requirement.size;
      const inRange = range && range.system === wanted.system &&
        wanted.value >= range.min - 1e-9 && wanted.value <= range.max + 1e-9;
      const exact = size && size.system === wanted.system && Math.abs(size.value - wanted.value) < 1e-9;
      const listed = (tool.parsedSizes || []).some(function (parsed) {
        return parsed.system === wanted.system && Math.abs(parsed.value - wanted.value) < 1e-9;
      });
      if (!exact && !inRange && !listed) return false;
    }
    return true;
  };

  /* "8-19mm" or '1/4-1/2"' -> {system, min, max} */
  jobs.parseRange = function (text) {
    if (!text) return null;
    const parts = String(text).split(/\s*(?:-|–|to)\s*/);
    if (parts.length !== 2) return null;
    // Re-attach the unit from the upper bound so "8-19mm" parses both ends.
    const unit = (String(text).match(/(mm|"|in|inch)\s*$/) || [''])[0];
    const low = util.parseSize(/[a-z"]/i.test(parts[0]) ? parts[0] : parts[0] + unit);
    const high = util.parseSize(parts[1]);
    if (!low || !high || low.system !== high.system) return null;
    return { system: low.system, min: Math.min(low.value, high.value), max: Math.max(low.value, high.value) };
  };

  jobs.matchesFor = function (requirement, tools) {
    return tools.filter(function (tool) { return jobs.satisfies(tool, requirement); });
  };

  /* Plan one job against the inventory. */
  jobs.plan = function (job, tools) {
    const lines = (job.requires || []).map(function (requirement) {
      const matches = jobs.matchesFor(requirement, tools);
      return {
        requirement: requirement,
        matches: matches,
        covered: matches.length > 0,
        optional: !!requirement.optional
      };
    });

    const required = lines.filter(function (line) { return !line.optional; });
    const missing = required.filter(function (line) { return !line.covered; });
    const optionalMissing = lines.filter(function (line) { return line.optional && !line.covered; });

    return {
      job: job,
      lines: lines,
      missing: missing,
      optionalMissing: optionalMissing,
      ready: missing.length === 0,
      coverage: required.length ? (required.length - missing.length) / required.length : 1
    };
  };

  jobs.planAll = function (jobList, tools) {
    return jobList.map(function (job) { return jobs.plan(job, tools); });
  };

  /* Rank jobs you could do right now first, then near-misses. */
  jobs.sortPlans = function (plans) {
    return plans.slice().sort(function (a, b) {
      if (a.ready !== b.ready) return a.ready ? -1 : 1;
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
      return a.job.name.localeCompare(b.job.name);
    });
  };

  jobs.requirementLabel = function (requirement) {
    if (requirement.label) return requirement.label;
    if (requirement.capability) return tax.capabilityName(requirement.capability);
    if (requirement.category) return tax.categoryName(requirement.category);
    if (requirement.interface) return tax.interfaceName(requirement.interface);
    return 'Requirement';
  };

  /* Custom jobs live in settings so the built-in templates stay untouched. */
  jobs.loadCustom = function () {
    return App.store.getSetting('customJobs', []).then(function (list) {
      return (list || []).map(function (job) {
        job.custom = true;
        return job;
      });
    });
  };

  jobs.saveCustom = function (list) {
    return App.store.setSetting('customJobs', list);
  };

  jobs.all = function () {
    return jobs.loadCustom().then(function (custom) {
      return tax.JOB_TEMPLATES.concat(custom);
    });
  };

  App.jobs = jobs;
})(window.App = window.App || {});
