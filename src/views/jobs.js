/* Jobs: what you can do today, what you're one purchase away from. */
(function (App) {
  'use strict';

  const h = App.util.h;
  const util = App.util;
  const ui = App.ui;
  const model = App.model;
  const tax = App.taxonomy;
  const jobsApi = App.jobs;

  const view = {};

  function planCard(plan) {
    const missing = plan.missing.length;
    return h('article.job-card' + (plan.ready ? '.job-card--ready' : ''), {
      onclick: function () { App.navigate('#/job/' + plan.job.id); },
      tabindex: 0,
      onkeydown: function (e) { if (e.key === 'Enter') App.navigate('#/job/' + plan.job.id); }
    }, [
      h('div.job-card__head', [
        h('h3.job-card__title', { text: plan.job.name }),
        plan.ready
          ? ui.chip('Ready', { tone: 'good' })
          : ui.chip(missing === 1 ? '1 missing' : missing + ' missing', { tone: missing === 1 ? 'warn' : 'danger' })
      ]),
      ui.meter(plan.coverage),
      h('p.job-card__meta', {
        text: [
          plan.job.minutes ? util.formatDuration(plan.job.minutes) : null,
          plan.job.custom ? 'Your job' : null,
          plan.ready
            ? 'All required tools on hand'
            : 'Missing: ' + plan.missing.map(function (line) { return jobsApi.requirementLabel(line.requirement); }).join(', ')
        ].filter(Boolean).join(' · ')
      })
    ]);
  }

  function customJobForm() {
    const draft = { id: 'custom-' + util.uid(), name: '', minutes: '', requires: [], custom: true };

    const requirementList = h('div.chips');
    const redraw = function () {
      util.clear(requirementList);
      util.append(requirementList, draft.requires.map(function (requirement, index) {
        return ui.chip(jobsApi.requirementLabel(requirement) + (requirement.optional ? ' (optional)' : ''), {
          removable: true,
          onClick: function () { draft.requires.splice(index, 1); redraw(); }
        });
      }));
    };
    redraw();

    const nameInput = ui.input({ placeholder: 'e.g. Fit a new tap', onInput: function (e) { draft.name = e.target.value; } });

    const capabilityPicker = ui.select(tax.CAPABILITIES, '', function (value) {
      if (!value) return;
      draft.requires.push({ capability: value, label: tax.capabilityName(value) });
      redraw();
    }, '+ Needs the ability to…');

    const categoryPicker = ui.groupedSelect(tax.CATEGORIES, '', function (value) {
      if (!value) return;
      draft.requires.push({ category: value, label: tax.categoryName(value) });
      redraw();
    }, '+ Needs a specific kind of tool…');

    ui.modal('New job', [
      ui.field('Job name', nameInput),
      ui.field('Rough time (minutes)', ui.input({ type: 'number', min: '5', onInput: function (e) { draft.minutes = Number(e.target.value) || 0; } })),
      h('div.field', [h('span.field__label', { text: 'Needs' }), requirementList, capabilityPicker, categoryPicker])
    ], [
      ui.button('Cancel', { onClick: ui.closeModal }),
      ui.button('Save job', {
        variant: 'primary',
        onClick: function () {
          if (!draft.name.trim()) { ui.toast('Give the job a name', 'danger'); return; }
          if (!draft.requires.length) { ui.toast('Add at least one requirement', 'danger'); return; }
          jobsApi.loadCustom().then(function (custom) {
            return jobsApi.saveCustom(custom.concat([draft]));
          }).then(function () {
            ui.closeModal();
            ui.toast('Job saved');
            return App.refresh();
          });
        }
      })
    ]);
  }

  view.render = function (container) {
    const plans = jobsApi.sortPlans(App.state.plans);
    const ready = plans.filter(function (plan) { return plan.ready; });
    const nearly = plans.filter(function (plan) { return !plan.ready && plan.missing.length === 1; });
    const rest = plans.filter(function (plan) { return !plan.ready && plan.missing.length > 1; });

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('h1.view__title', { text: 'Jobs' }),
          h('p.view__subtitle', {
            text: App.state.tools.length
              ? ready.length + ' of ' + plans.length + ' jobs you can start right now'
              : 'Add tools to see which jobs you are equipped for'
          })
        ]),
        ui.button('New job', { icon: 'plus', onClick: customJobForm })
      ]),
      ready.length ? ui.section('Ready to go', h('div.job-grid', ready.map(planCard))) : null,
      nearly.length ? ui.section('One tool away', h('div.job-grid', nearly.map(planCard)),
        'Buy or borrow one item and these open up.') : null,
      rest.length ? ui.section('Needs more kit', h('div.job-grid', rest.map(planCard))) : null
    ]);
  };

  view.renderDetail = function (container, params) {
    const plan = App.state.plans.filter(function (p) { return p.job.id === params.id; })[0];
    if (!plan) {
      util.append(container, ui.empty('Job not found', null,
        ui.button('All jobs', { onClick: function () { App.navigate('#/jobs'); } })));
      return;
    }

    const line = function (entry) {
      const label = jobsApi.requirementLabel(entry.requirement);
      return h('li.requirement' + (entry.covered ? '.requirement--ok' : entry.optional ? '.requirement--optional' : '.requirement--missing'), [
        h('div.requirement__head', [
          h('span.requirement__mark', entry.covered ? ui.icon('check') : ui.icon('warn')),
          h('span.requirement__label', { text: label }),
          entry.optional ? ui.chip('optional', { tone: 'quiet' }) : null
        ]),
        entry.covered
          ? h('div.requirement__matches', entry.matches.slice(0, 6).map(function (tool) {
              return ui.chip(model.displayName(tool), {
                tone: 'good',
                onClick: function () { App.navigate('#/tool/' + tool.id); }
              });
            }))
          : h('p.requirement__hint', {
              text: entry.requirement.size
                ? 'Nothing in your inventory covers ' + util.formatSize(entry.requirement.size.value, entry.requirement.size.system) + '.'
                : 'Nothing in your inventory covers this.'
            })
      ]);
    };

    util.append(container, [
      h('div.view__head', [
        h('div', [
          h('button.back', { onclick: function () { App.navigate('#/jobs'); } },
            [ui.icon('back'), h('span', { text: 'Jobs' })]),
          h('h1.view__title', { text: plan.job.name }),
          h('p.view__subtitle', {
            text: [
              plan.job.minutes ? util.formatDuration(plan.job.minutes) : null,
              plan.ready ? 'You have everything required' : util.plural(plan.missing.length, 'tool') + ' missing'
            ].filter(Boolean).join(' · ')
          })
        ]),
        plan.job.custom
          ? ui.button('Delete job', {
              variant: 'danger',
              onClick: function () {
                ui.confirm('Delete this job?', plan.job.name + ' will be removed.', function () {
                  jobsApi.loadCustom().then(function (custom) {
                    return jobsApi.saveCustom(custom.filter(function (job) { return job.id !== plan.job.id; }));
                  }).then(function () { return App.refresh(); })
                    .then(function () { App.navigate('#/jobs'); });
                });
              }
            })
          : null
      ]),
      ui.meter(plan.coverage),
      ui.section('Checklist', h('ul.requirements', plan.lines.map(line))),
      plan.missing.length
        ? ui.section('To be ready for this', h('ul.buy-list', plan.missing.map(function (entry) {
            return h('li.buy-list__item', [
              h('span.buy-list__label', { text: jobsApi.requirementLabel(entry.requirement) }),
              h('span.buy-list__why', { text: alsoUnlocks(entry, plan) })
            ]);
          })))
        : null
    ]);
  };

  /* "also needed for 3 other jobs" — makes a purchase easier to justify. */
  function alsoUnlocks(entry, currentPlan) {
    const key = entry.requirement.capability || entry.requirement.category;
    if (!key) return '';
    const others = App.state.plans.filter(function (plan) {
      if (plan.job.id === currentPlan.job.id) return false;
      return plan.missing.some(function (line) {
        return (line.requirement.capability || line.requirement.category) === key;
      });
    });
    return others.length ? 'Also blocks ' + util.plural(others.length, 'other job') : '';
  }

  App.views = App.views || {};
  App.views.jobs = view;
})(window.App = window.App || {});
