/* Compatibility engine.

   Model: every tool declares `accepts` (what can plug into it) and `fits`
   (what it plugs into), as namespaced tokens like `drive:1/2`. Tool A takes
   tool B when A.accepts and B.fits share a token.

   Adapters are tools that both accept and fit, so the same rule chains: a
   1/2" ratchet reaches your 3/8" sockets through a 1/2"F-3/8"M adapter with
   no special-casing. We search up to MAX_HOPS links and report the path. */
(function (App) {
  'use strict';

  const model = App.model;
  const tax = App.taxonomy;
  const MAX_HOPS = 3;

  const compat = {};

  function tokens(tool, side) {
    return (tool[side] || []).filter(Boolean);
  }

  function sharedTokens(host, accessory) {
    const accepted = tokens(host, 'accepts');
    return tokens(accessory, 'fits').filter(function (token) { return accepted.indexOf(token) >= 0; });
  }

  compat.sharedTokens = sharedTokens;

  /* Does `host` take `accessory` directly? Returns the tokens they share. */
  compat.direct = function (host, accessory) {
    if (!host || !accessory || host.id === accessory.id) return [];
    return sharedTokens(host, accessory);
  };

  /* Everything in `tools` that plugs straight into `tool`. */
  compat.accessoriesFor = function (tool, tools) {
    return tools.reduce(function (out, candidate) {
      const via = compat.direct(tool, candidate);
      if (via.length) out.push({ tool: candidate, via: via, hops: 1, path: [] });
      return out;
    }, []);
  };

  /* Everything in `tools` that `tool` plugs into. */
  compat.hostsFor = function (tool, tools) {
    return tools.reduce(function (out, candidate) {
      const via = compat.direct(candidate, tool);
      if (via.length) out.push({ tool: candidate, via: via, hops: 1, path: [] });
      return out;
    }, []);
  };

  /* Breadth-first walk from a host outward, hopping through adapters.
     Returns matches keyed by tool id, each with the shortest path found. */
  compat.reachableFrom = function (tool, tools) {
    const results = Object.create(null);
    const seen = Object.create(null);
    seen[tool.id] = true;

    let frontier = [{ tool: tool, path: [] }];
    for (let hop = 1; hop <= MAX_HOPS && frontier.length; hop += 1) {
      const next = [];
      frontier.forEach(function (node) {
        tools.forEach(function (candidate) {
          if (seen[candidate.id]) return;
          const via = compat.direct(node.tool, candidate);
          if (!via.length) return;
          seen[candidate.id] = true;
          const entry = { tool: candidate, via: via, hops: hop, path: node.path };
          results[candidate.id] = entry;
          // Only adapters extend the chain: they accept something onward.
          if (tokens(candidate, 'accepts').length && hop < MAX_HOPS) {
            next.push({ tool: candidate, path: node.path.concat([{ tool: candidate, via: via }]) });
          }
        });
      });
      frontier = next;
    }

    return Object.keys(results).map(function (id) { return results[id]; });
  };

  /* Full picture for one tool: what fits it, what it fits, and what it needs. */
  compat.report = function (tool, tools) {
    const owned = tools.filter(function (t) { return model.isOwned(t) && t.id !== tool.id; });
    const reachable = compat.reachableFrom(tool, owned);

    return {
      takes: reachable.filter(function (m) { return m.hops === 1; }),
      takesViaAdapter: reachable.filter(function (m) { return m.hops > 1; }),
      fitsInto: compat.hostsFor(tool, owned),
      unusedInterfaces: tokens(tool, 'accepts').filter(function (token) {
        return !owned.some(function (other) { return tokens(other, 'fits').indexOf(token) >= 0; });
      }),
      orphanedInterfaces: tokens(tool, 'fits').filter(function (token) {
        return !owned.some(function (other) { return tokens(other, 'accepts').indexOf(token) >= 0; });
      })
    };
  };

  /* Does A work with B, in either direction, directly or through an adapter?
     Used by the "will these two work together?" checker. */
  compat.check = function (a, b, tools) {
    const directAB = compat.direct(a, b);
    if (directAB.length) return { compatible: true, direction: 'host-accessory', via: directAB, hops: 1, path: [] };
    const directBA = compat.direct(b, a);
    if (directBA.length) return { compatible: true, direction: 'accessory-host', via: directBA, hops: 1, path: [] };

    const owned = tools.filter(function (t) { return model.isOwned(t); });
    const fromA = compat.reachableFrom(a, owned).filter(function (m) { return m.tool.id === b.id; })[0];
    if (fromA) return { compatible: true, direction: 'host-accessory', via: fromA.via, hops: fromA.hops, path: fromA.path };
    const fromB = compat.reachableFrom(b, owned).filter(function (m) { return m.tool.id === a.id; })[0];
    if (fromB) return { compatible: true, direction: 'accessory-host', via: fromB.via, hops: fromB.hops, path: fromB.path };

    return {
      compatible: false,
      reason: describeMismatch(a, b),
      needed: neededAdapter(a, b)
    };
  };

  function describeMismatch(a, b) {
    const groupsOf = function (tool, side) {
      return App.util.unique(tokens(tool, side).map(function (t) { return t.split(':')[0]; }));
    };
    const shared = groupsOf(a, 'accepts').filter(function (g) { return groupsOf(b, 'fits').indexOf(g) >= 0; })
      .concat(groupsOf(b, 'accepts').filter(function (g) { return groupsOf(a, 'fits').indexOf(g) >= 0; }));
    if (shared.length) {
      const group = tax.interfaceGroupById[shared[0]];
      return 'Same kind of connection (' + (group ? group.name.toLowerCase() : shared[0]) + ') but different sizes.';
    }
    if (!tokens(a, 'accepts').length && !tokens(b, 'accepts').length) {
      return 'Neither item is a host — nothing here accepts an attachment.';
    }
    if (!tokens(a, 'fits').length && !tokens(b, 'fits').length) {
      return 'Neither item is an attachment — both are hosts.';
    }
    return 'No connection in common.';
  }

  /* If a mismatch is size-only within one interface group, name the adapter to buy. */
  function neededAdapter(a, b) {
    const pairs = [];
    [[a, b], [b, a]].forEach(function (pair) {
      tokens(pair[0], 'accepts').forEach(function (hostToken) {
        tokens(pair[1], 'fits').forEach(function (fitToken) {
          const hostGroup = hostToken.split(':')[0];
          if (hostGroup !== fitToken.split(':')[0] || hostToken === fitToken) return;
          pairs.push({
            from: fitToken,
            to: hostToken,
            label: tax.interfaceName(fitToken) + ' → ' + tax.interfaceName(hostToken) + ' adapter'
          });
        });
      });
    });
    return pairs.slice(0, 4);
  }

  /* Battery platform view: how invested you are in each system, and whether
     each has enough batteries and a charger to actually be usable. */
  compat.platformReport = function (tools) {
    const owned = tools.filter(model.isOwned);
    const platforms = Object.create(null);

    owned.forEach(function (tool) {
      tokens(tool, 'accepts').concat(tokens(tool, 'fits')).forEach(function (token) {
        if (token.split(':')[0] !== 'battery') return;
        const id = token.split(':')[1];
        if (!platforms[id]) {
          platforms[id] = { id: id, name: tax.interfaceName(token), token: token, tools: [], batteries: [], chargers: [] };
        }
        const entry = platforms[id];
        if (tool.category === 'battery') { if (entry.batteries.indexOf(tool) < 0) entry.batteries.push(tool); }
        else if (tool.category === 'charger') { if (entry.chargers.indexOf(tool) < 0) entry.chargers.push(tool); }
        else if (entry.tools.indexOf(tool) < 0) entry.tools.push(tool);
      });
    });

    return Object.keys(platforms).map(function (id) {
      const entry = platforms[id];
      const batteryCount = entry.batteries.reduce(function (sum, b) { return sum + (b.quantity || 1); }, 0);
      entry.batteryCount = batteryCount;
      entry.issues = [];
      if (entry.tools.length && batteryCount === 0) entry.issues.push('No battery for this platform');
      if (entry.tools.length && !entry.chargers.length) entry.issues.push('No charger for this platform');
      if (entry.tools.length > 2 && batteryCount === 1) entry.issues.push('Only one battery across ' + entry.tools.length + ' tools');
      if (!entry.tools.length && (batteryCount || entry.chargers.length)) entry.issues.push('Batteries or charger with no tools to use them');
      return entry;
    }).sort(function (a, b) { return b.tools.length - a.tools.length; });
  };

  App.compat = compat;
})(window.App = window.App || {});
