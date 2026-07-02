import { state } from './state.js';
import { els } from './dom.js';
import { escapeHtml, escapeAttr, uniqueStrings } from './utils.js';
import { getOrphanNodeIds } from './validation.js';
import { setSaveStatus, renderNode } from './runner.js';
import { openPayloadEditorForId, updateEditorDirtyState } from './editor.js';
import { appendChangeLog } from './file-ops.js';

var treeViewCy = null;
var treeViewSelectedId = null;
var treeViewQuestionsOnly = false;
var treeViewLinking = null; // { sourceId, optionIndex } while picking a target for an answer
var treeViewMenuEl = null;
var treeViewBannerEl = null;
var newPayloadDropOffset = 0;

function formatEdgeLabel(option) {
  var label = option && option.label || '';
  if (option && typeof option.riskScore === 'number') {
    label += ' (' + option.riskScore + ')';
  }
  return label;
}

export function getCurrentPayloadId() {
  return state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
}

export function getDecisionPathState() {
  var nodeIds = [];
  var edgeIds = [];
  if (!state.tree) return { nodeIds: nodeIds, edgeIds: edgeIds };
  state.history.forEach(function (step) {
    if (step.nodeId) nodeIds.push(step.nodeId);
    if (step.next) nodeIds.push(step.next);
    var sourceNode = state.tree.nodes[step.nodeId];
    if (sourceNode && Array.isArray(sourceNode.options)) {
      var matchIndex = -1;
      sourceNode.options.some(function (option, index) {
        var sameNext = String(option && option.next || '') === String(step.next || '');
        var sameLabel = String(option && option.label || '') === String(step.answer || '');
        if (sameNext && sameLabel) { matchIndex = index; return true; }
        return false;
      });
      if (matchIndex !== -1) edgeIds.push(step.nodeId + '__' + matchIndex);
    }
  });
  if (state.currentMode === 'node' && state.currentNodeId) nodeIds.push(state.currentNodeId);
  if (state.currentMode === 'result' && state.currentResult && state.currentResult.id) nodeIds.push(state.currentResult.id);
  return { nodeIds: uniqueStrings(nodeIds), edgeIds: uniqueStrings(edgeIds) };
}

export function openTreeView() {
  if (!state.tree) {
    alert('Load a tree first to view the full map.');
    return;
  }
  if (!window.cytoscape) {
    alert('Tree View requires Cytoscape to load. Check your internet connection.');
    return;
  }
  els.treeViewOverlay.classList.remove('hidden');
  setTimeout(function () {
    refreshTreeView();
    els.treeViewSearchInput.focus();
  }, 0);
}

export function closeTreeView() {
  cancelTreeViewLinking();
  hideTreeViewContextMenu();
  els.treeViewOverlay.classList.add('hidden');
  treeViewSelectedId = null;
  treeViewQuestionsOnly = false;
  els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
  els.treeViewQuestionsOnlyBtn.style.borderColor = '';
  if (treeViewCy) {
    treeViewCy.elements().removeClass('tree-selected tree-match tree-dim tree-path tree-path-current edge-path tree-link-source');
  }
}

export function zoomFitTreeView() {
  if (treeViewCy) treeViewCy.fit(treeViewCy.elements(':visible'), 40);
}

export function initTreeView() {
  if (treeViewCy || !window.cytoscape) return;
  treeViewCy = cytoscape({
    container: els.treeViewCanvas,
    wheelSensitivity: 0.2,
    minZoom: 0.2,
    maxZoom: 2,
    style: [
      { selector: 'node', style: { 'label': 'data(label)', 'text-wrap': 'wrap', 'text-max-width': 220, 'text-valign': 'center', 'text-halign': 'center', 'background-color': '#1e293b', 'color': '#ffffff', 'border-width': 2, 'border-color': '#334155', 'shape': 'roundrectangle', 'width': 'label', 'height': 'label', 'padding': '18px', 'font-size': 13, 'font-weight': 700, 'overlay-opacity': 0, 'shadow-blur': 20, 'shadow-color': '#000000', 'shadow-opacity': 0.28, 'text-background-opacity': 0, 'text-border-opacity': 0 } },
      { selector: 'node.question', style: { 'background-color': '#2563eb', 'border-color': '#93c5fd' } },
      { selector: 'node.result', style: { 'background-color': '#047857', 'border-color': '#86efac', 'shape': 'roundrectangle' } },
      { selector: 'node.start', style: { 'background-color': '#dc2626', 'border-color': '#fecaca', 'border-width': 4 } },
      { selector: 'node.orphan', style: { 'border-color': '#fbbf24', 'border-style': 'dashed', 'border-width': 4 } },
      { selector: 'node.tree-selected', style: { 'shadow-color': '#f97316', 'shadow-opacity': 0.65, 'shadow-blur': 32, 'shadow-offset-x': 0, 'shadow-offset-y': 0 } },
      { selector: 'node.tree-path', style: { 'border-color': '#f59e0b', 'border-width': 5, 'overlay-color': '#f59e0b', 'overlay-padding': '7px', 'overlay-opacity': 0.12 } },
      { selector: 'node.tree-path-current', style: { 'background-color': '#f97316', 'border-color': '#fde68a', 'border-width': 6, 'overlay-color': '#fde68a', 'overlay-padding': '10px', 'overlay-opacity': 0.2, 'shadow-color': '#f97316', 'shadow-opacity': 0.72, 'shadow-blur': 34 } },
      { selector: 'node.tree-match', style: { 'overlay-color': '#fcd34d', 'overlay-padding': '6px', 'overlay-opacity': 0.18 } },
      { selector: 'node.tree-dim', style: { 'opacity': 0.2 } },
      { selector: 'node.tree-link-source', style: { 'border-color': '#38bdf8', 'border-width': 5, 'border-style': 'dashed', 'overlay-color': '#38bdf8', 'overlay-padding': '8px', 'overlay-opacity': 0.16 } },
      { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'line-color': '#64748b', 'opacity': 0.85, 'width': 2, 'label': 'data(label)', 'font-size': 11, 'text-rotation': 'autorotate', 'text-margin-y': -10, 'color': '#e2e8f0', 'text-background-color': '#111827', 'text-background-opacity': 0.88, 'text-background-shape': 'roundrectangle', 'text-border-color': '#1e293b', 'text-border-width': 1, 'text-border-opacity': 0.85 } },
      { selector: 'edge.edge-path', style: { 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'width': 4, 'opacity': 1, 'color': '#fde68a', 'text-background-color': '#78350f', 'text-background-opacity': 0.96, 'text-border-color': '#f59e0b', 'text-border-width': 1.5 } }
    ]
  });
  treeViewCy.on('tap', 'node', function (event) {
    hideTreeViewContextMenu();
    var nodeId = event.target.id();
    if (treeViewLinking) {
      completeTreeViewLink(nodeId);
      return;
    }
    selectTreeViewNode(nodeId);
    openPayloadEditorForId(nodeId);
  });
  treeViewCy.on('tap', function (event) {
    if (event.target !== treeViewCy) return;
    hideTreeViewContextMenu();
    if (treeViewLinking) {
      cancelTreeViewLinking();
      return;
    }
    clearTreeViewSelection();
    updateTreeViewDecisionPathHighlight();
  });
  treeViewCy.on('cxttap', 'node', function (event) {
    if (treeViewLinking) cancelTreeViewLinking();
    showTreeViewNodeMenu(event.target.id(), event);
  });
  treeViewCy.on('cxttap', 'edge', function (event) {
    if (treeViewLinking) cancelTreeViewLinking();
    showTreeViewEdgeMenu(event.target.id(), event);
  });
  treeViewCy.on('pan zoom', function () { hideTreeViewContextMenu(); });
  els.treeViewCanvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  treeViewCy.on('dragfree', 'node', function () {
    persistTreeViewPositions({ message: 'Tree layout moved. Save tree.json to persist.' });
    refreshMiniTreeView();
    updateTreeViewDecisionPathHighlight();
  });
}

// --- Visual answer linking (right-click a node or edge to rewire options) ---

export function isTreeViewLinking() { return !!treeViewLinking; }

function ensureTreeViewChrome() {
  if (!treeViewMenuEl) {
    treeViewMenuEl = document.createElement('div');
    treeViewMenuEl.className = 'tree-view-context-menu hidden';
    els.treeViewCanvas.parentElement.appendChild(treeViewMenuEl);
  }
  if (!treeViewBannerEl) {
    treeViewBannerEl = document.createElement('div');
    treeViewBannerEl.className = 'tree-view-link-banner hidden';
    els.treeViewCanvas.parentElement.appendChild(treeViewBannerEl);
  }
}

export function hideTreeViewContextMenu() {
  if (treeViewMenuEl) treeViewMenuEl.classList.add('hidden');
}

function positionTreeViewContextMenu(event) {
  var canvasRect = els.treeViewCanvas.getBoundingClientRect();
  var parentRect = els.treeViewCanvas.parentElement.getBoundingClientRect();
  var clientX = event.originalEvent ? event.originalEvent.clientX : canvasRect.left;
  var clientY = event.originalEvent ? event.originalEvent.clientY : canvasRect.top;
  var x = clientX - parentRect.left;
  var y = clientY - parentRect.top;
  treeViewMenuEl.style.left = '0px';
  treeViewMenuEl.style.top = '0px';
  treeViewMenuEl.classList.remove('hidden');
  var menuRect = treeViewMenuEl.getBoundingClientRect();
  x = Math.min(x, parentRect.width - menuRect.width - 12);
  y = Math.min(y, parentRect.height - menuRect.height - 12);
  treeViewMenuEl.style.left = Math.max(6, x) + 'px';
  treeViewMenuEl.style.top = Math.max(6, y) + 'px';
}

function menuItemButton(label, handler, danger) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tree-view-menu-item' + (danger ? ' danger' : '');
  btn.innerHTML = label;
  btn.addEventListener('click', function () {
    hideTreeViewContextMenu();
    handler();
  });
  return btn;
}

function describeOptionTarget(option) {
  var next = String(option && option.next || '').trim();
  if (!next) return '<span class="menu-target unset">no target yet</span>';
  return '<span class="menu-target">' + escapeHtml(next) + '</span>';
}

export function showTreeViewNodeMenu(payloadId, event) {
  if (!state.tree) return;
  ensureTreeViewChrome();
  treeViewMenuEl.innerHTML = '';
  var heading = document.createElement('div');
  heading.className = 'tree-view-menu-heading';
  var node = state.tree.nodes[payloadId];
  heading.textContent = payloadId;
  treeViewMenuEl.appendChild(heading);
  treeViewMenuEl.appendChild(menuItemButton('Open in editor', function () { selectTreeViewNode(payloadId); openPayloadEditorForId(payloadId); }));
  if (node) {
    (node.options || []).forEach(function (option, index) {
      var label = String(option && option.label || '').trim() || ('Option ' + (index + 1));
      treeViewMenuEl.appendChild(menuItemButton(
        'Link answer <strong>' + escapeHtml(label) + '</strong> &rarr; ' + describeOptionTarget(option),
        function () { startTreeViewLinking(payloadId, index); }
      ));
    });
    treeViewMenuEl.appendChild(menuItemButton('&#43; Add answer option&hellip;', function () { addOptionAndLink(payloadId); }));
  }
  positionTreeViewContextMenu(event);
}

export function showTreeViewEdgeMenu(edgeId, event) {
  if (!state.tree) return;
  var parts = String(edgeId).split('__');
  var optionIndex = Number(parts.pop());
  var nodeId = parts.join('__');
  var node = state.tree.nodes[nodeId];
  var option = node && Array.isArray(node.options) ? node.options[optionIndex] : null;
  if (!option) return;
  ensureTreeViewChrome();
  treeViewMenuEl.innerHTML = '';
  var heading = document.createElement('div');
  heading.className = 'tree-view-menu-heading';
  var label = String(option.label || '').trim() || ('Option ' + (optionIndex + 1));
  heading.textContent = nodeId + ' — ' + label;
  treeViewMenuEl.appendChild(heading);
  treeViewMenuEl.appendChild(menuItemButton('Retarget this answer&hellip;', function () { startTreeViewLinking(nodeId, optionIndex); }));
  treeViewMenuEl.appendChild(menuItemButton('Remove this answer option', function () { removeNodeOption(nodeId, optionIndex); }, true));
  positionTreeViewContextMenu(event);
}

export function startTreeViewLinking(sourceId, optionIndex) {
  if (!state.tree || !treeViewCy) return;
  var node = state.tree.nodes[sourceId];
  var option = node && Array.isArray(node.options) ? node.options[optionIndex] : null;
  if (!option) return;
  ensureTreeViewChrome();
  treeViewLinking = { sourceId: sourceId, optionIndex: optionIndex };
  treeViewCy.nodes().removeClass('tree-link-source');
  treeViewCy.getElementById(sourceId).addClass('tree-link-source');
  els.treeViewCanvas.classList.add('linking');
  var label = String(option.label || '').trim() || ('Option ' + (optionIndex + 1));
  treeViewBannerEl.innerHTML = 'Click the node this answer should lead to: <strong>' + escapeHtml(sourceId) + '</strong> &rarr; answer <strong>' + escapeHtml(label) + '</strong> &rarr; ? &nbsp;<span class="banner-hint">(Esc or click empty space to cancel)</span>';
  treeViewBannerEl.classList.remove('hidden');
}

export function cancelTreeViewLinking() {
  if (!treeViewLinking) return false;
  treeViewLinking = null;
  if (treeViewCy) treeViewCy.nodes().removeClass('tree-link-source');
  els.treeViewCanvas.classList.remove('linking');
  if (treeViewBannerEl) treeViewBannerEl.classList.add('hidden');
  return true;
}

export function completeTreeViewLink(targetId) {
  if (!treeViewLinking || !state.tree) return;
  var linking = treeViewLinking;
  var node = state.tree.nodes[linking.sourceId];
  var option = node && Array.isArray(node.options) ? node.options[linking.optionIndex] : null;
  if (!option) { cancelTreeViewLinking(); return; }
  if (targetId === linking.sourceId) {
    treeViewBannerEl.innerHTML = 'An answer cannot point back at its own question. Pick a different node, or press Esc to cancel.';
    return;
  }
  var previousTarget = String(option.next || '').trim() || null;
  option.next = targetId;
  appendChangeLog({ type: 'optionRetargeted', payloadType: 'node', payloadId: node.id, optionIndex: linking.optionIndex, optionLabel: option.label || '', previousTarget: previousTarget, newTarget: targetId });
  cancelTreeViewLinking();
  rebuildTreeViewEdgesForNode(node.id);
  updateTreeViewOrphanClasses();
  refreshMiniTreeView();
  refreshTablesViewIfOpen();
  if (state.currentMode === 'node' && state.currentNodeId === node.id) renderNode();
  updateEditorDirtyState();
  var label = String(option.label || '').trim() || ('Option ' + (linking.optionIndex + 1));
  setSaveStatus("Linked " + node.id + " — '" + label + "' → " + targetId + '. Save tree.json to persist.');
}

function addOptionAndLink(nodeId) {
  var node = state.tree && state.tree.nodes[nodeId];
  if (!node) return;
  var label = String(prompt('Label for the new answer (e.g. Yes):', '') || '').trim();
  if (!label) return;
  if (!Array.isArray(node.options)) node.options = [];
  node.options.push({ label: label, next: '' });
  appendChangeLog({ type: 'optionAdded', payloadType: 'node', payloadId: nodeId, optionLabel: label });
  refreshTablesViewIfOpen();
  if (state.currentMode === 'node' && state.currentNodeId === nodeId) renderNode();
  updateEditorDirtyState();
  startTreeViewLinking(nodeId, node.options.length - 1);
}

function removeNodeOption(nodeId, optionIndex) {
  var node = state.tree && state.tree.nodes[nodeId];
  if (!node || !Array.isArray(node.options) || !node.options[optionIndex]) return;
  var option = node.options[optionIndex];
  var label = String(option.label || '').trim() || ('Option ' + (optionIndex + 1));
  if (!confirm("Remove answer '" + label + "' from " + nodeId + '? This updates the live tree only until you save tree.json.')) return;
  node.options.splice(optionIndex, 1);
  appendChangeLog({ type: 'optionRemoved', payloadType: 'node', payloadId: nodeId, optionLabel: option.label || '', previousTarget: option.next || null });
  rebuildTreeViewEdgesForNode(nodeId);
  updateTreeViewOrphanClasses();
  refreshMiniTreeView();
  refreshTablesViewIfOpen();
  if (state.currentMode === 'node' && state.currentNodeId === nodeId) renderNode();
  updateEditorDirtyState();
  setSaveStatus("Removed answer '" + label + "' from " + nodeId + '. Save tree.json to persist.');
}

function rebuildTreeViewEdgesForNode(nodeId) {
  if (!treeViewCy || !state.tree) return;
  treeViewCy.edges('[source = "' + nodeId + '"]').remove();
  var node = state.tree.nodes[nodeId];
  if (!node) return;
  (node.options || []).forEach(function (option, index) {
    if (!option || !option.next || (!state.tree.nodes[option.next] && !state.tree.results[option.next])) return;
    treeViewCy.add({ group: 'edges', data: { id: nodeId + '__' + index, source: nodeId, target: option.next, label: formatEdgeLabel(option) } });
  });
  updateTreeViewDecisionPathHighlight();
}

function updateTreeViewOrphanClasses() {
  if (!treeViewCy || !state.tree) return;
  var orphanLookup = {};
  getOrphanNodeIds(state.tree).forEach(function (id) { orphanLookup[id] = true; });
  treeViewCy.nodes().forEach(function (cyNode) {
    cyNode.toggleClass('orphan', !!orphanLookup[cyNode.id()]);
    cyNode.data('orphan', !!orphanLookup[cyNode.id()]);
  });
}

export function refreshTreeView() {
  if (!state.tree) return;
  treeViewQuestionsOnly = false;
  els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
  els.treeViewQuestionsOnlyBtn.style.borderColor = '';
  els.treeViewSearchInput.value = '';
  initTreeView();
  if (!treeViewCy) return;
  treeViewCy.elements().remove();
  treeViewCy.add(buildTreeViewElements());
  var storedPositions = getStoredTreePositions(state.tree);
  if (Object.keys(storedPositions).length) {
    treeViewCy.layout({ name: 'preset', positions: storedPositions, fit: false, padding: 30 }).run();
    filterTreeViewNodes(els.treeViewSearchInput.value);
    highlightCurrentTreeViewPayload();
    updateTreeViewDecisionPathHighlight();
    treeViewCy.fit(treeViewCy.elements(':visible'), 40);
    return;
  }
  runAutoArrangeLayout({ fit: true, persistMessage: null });
}

export function buildTreeViewElements() {
  var elements = [];
  if (!state.tree) return elements;
  var orphanLookup = {};
  getOrphanNodeIds(state.tree).forEach(function (id) { orphanLookup[id] = true; });
  Object.keys(state.tree.nodes).forEach(function (id) {
    var node = state.tree.nodes[id];
    var classes = 'question' + (id === state.tree.startNode ? ' start' : '') + (orphanLookup[id] ? ' orphan' : '');
    var label = (node.icon ? node.icon + ' ' : '') + (node.question || id);
    elements.push({ group: 'nodes', data: { id: id, label: label, type: 'question', orphan: !!orphanLookup[id] }, classes: classes });
  });
  Object.keys(state.tree.results).forEach(function (id) {
    var result = state.tree.results[id];
    var label = (result.icon ? result.icon + ' ' : '') + (result.title || id);
    elements.push({ group: 'nodes', data: { id: id, label: label, type: 'result' }, classes: 'result' });
  });
  Object.keys(state.tree.nodes).forEach(function (id) {
    var node = state.tree.nodes[id];
    node.options.forEach(function (option, index) {
      if (!option || !option.next || (!state.tree.nodes[option.next] && !state.tree.results[option.next])) return;
      elements.push({ group: 'edges', data: { id: id + '__' + index, source: id, target: option.next, label: formatEdgeLabel(option) } });
    });
  });
  return elements;
}

export function getSuggestedNewPayloadPosition() {
  // Drop new payloads somewhere visible instead of at the canvas origin,
  // staggering repeated creations so they don't stack on top of each other.
  if (!state.tree) return null;
  newPayloadDropOffset = (newPayloadDropOffset + 48) % 240;
  if (treeViewCy) {
    var extent = treeViewCy.extent();
    return {
      x: Math.round(extent.x1 + (extent.w / 2) + newPayloadDropOffset),
      y: Math.round(extent.y1 + (extent.h / 2) + newPayloadDropOffset)
    };
  }
  var stored = getStoredTreePositions(state.tree);
  var ids = Object.keys(stored);
  if (!ids.length) return null;
  var sumX = 0;
  var maxY = -Infinity;
  ids.forEach(function (id) {
    sumX += stored[id].x;
    if (stored[id].y > maxY) maxY = stored[id].y;
  });
  return { x: Math.round(sumX / ids.length) + newPayloadDropOffset, y: Math.round(maxY + 140) };
}

export function getStoredTreePositions(tree) {
  var positions = {};
  if (!tree) return positions;
  Object.keys(tree.nodes || {}).forEach(function (id) {
    var node = tree.nodes[id];
    var x = Number(node && node.x);
    var y = Number(node && node.y);
    if (isFinite(x) && isFinite(y)) positions[id] = { x: x, y: y };
  });
  Object.keys(tree.results || {}).forEach(function (id) {
    var result = tree.results[id];
    var x = Number(result && result.x);
    var y = Number(result && result.y);
    if (isFinite(x) && isFinite(y)) positions[id] = { x: x, y: y };
  });
  return positions;
}

export function persistTreeViewPositions(options) {
  if (!state.tree || !treeViewCy) return;
  treeViewCy.nodes().forEach(function (node) {
    var pos = node.position();
    var x = Number(pos.x.toFixed(2));
    var y = Number(pos.y.toFixed(2));
    var id = node.id();
    if (state.tree.nodes[id]) {
      state.tree.nodes[id].x = x;
      state.tree.nodes[id].y = y;
    } else if (state.tree.results[id]) {
      state.tree.results[id].x = x;
      state.tree.results[id].y = y;
    }
  });
  if (options && options.silent) return;
  setSaveStatus((options && options.message) || 'Tree layout updated. Save tree.json to persist.');
}

export function getTreeViewLayoutRoots() {
  var orphanIds = getOrphanNodeIds(state.tree);
  return [state.tree.startNode].concat(orphanIds.filter(function (id) { return id !== state.tree.startNode; }));
}

export function runAutoArrangeLayout(options) {
  if (!treeViewCy || !state.tree) return;
  var opts = options || {};
  var layout = treeViewCy.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30,
    spacingFactor: 1.8,
    circle: false,
    animate: false,
    roots: getTreeViewLayoutRoots()
  });
  layout.on('layoutstop', function () {
    orientTreeViewLeftToRight();
    persistTreeViewPositions({ silent: !opts.persistMessage, message: opts.persistMessage || 'Tree layout updated. Save tree.json to persist.' });
    filterTreeViewNodes(els.treeViewSearchInput.value);
    highlightCurrentTreeViewPayload();
    updateTreeViewDecisionPathHighlight();
    if (opts.fit !== false) treeViewCy.fit(treeViewCy.elements(':visible'), 40);
  });
  layout.run();
}

export function autoArrangeTreeView() {
  if (!treeViewCy || !state.tree) return;
  runAutoArrangeLayout({ fit: true, persistMessage: 'Tree auto-arranged. Save tree.json to persist.' });
}

export function orientTreeViewLeftToRight() {
  if (!treeViewCy) return;
  var nodes = treeViewCy.nodes();
  if (!nodes.length) return;
  var positions = nodes.map(function (node) { return { id: node.id(), x: node.position('x'), y: node.position('y') }; });
  var minX = Math.min.apply(null, positions.map(function (pos) { return pos.x; }));
  var minY = Math.min.apply(null, positions.map(function (pos) { return pos.y; }));
  positions.forEach(function (pos) {
    treeViewCy.getElementById(pos.id).position({ x: pos.y - minY, y: pos.x - minX });
  });
}

export function filterTreeViewNodes(query) {
  if (!treeViewCy) return;
  var normalized = String(query || '').trim().toLowerCase();
  treeViewCy.nodes().removeClass('tree-match tree-dim');
  if (!normalized) return;
  var matches = treeViewCy.nodes().filter(function (node) {
    var label = String(node.data('label') || '').toLowerCase();
    var id = String(node.id() || '').toLowerCase();
    return label.indexOf(normalized) !== -1 || id.indexOf(normalized) !== -1;
  });
  var nonMatches = treeViewCy.nodes().difference(matches);
  matches.addClass('tree-match');
  nonMatches.addClass('tree-dim');
  if (matches.length) treeViewCy.fit(matches, 40);
}

export function toggleTreeViewQuestionsOnly() {
  if (!treeViewCy) return;
  treeViewQuestionsOnly = !treeViewQuestionsOnly;
  if (treeViewQuestionsOnly) {
    els.treeViewQuestionsOnlyBtn.style.backgroundColor = '#3b82f6';
    els.treeViewQuestionsOnlyBtn.style.borderColor = '#93c5fd';
  } else {
    els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
    els.treeViewQuestionsOnlyBtn.style.borderColor = '';
  }
  var resultNodes = treeViewCy.nodes().filter(function (node) { return node.hasClass('result'); });
  if (treeViewQuestionsOnly) {
    resultNodes.hide();
  } else {
    resultNodes.show();
    resultNodes.connectedEdges().show();
  }
  treeViewCy.fit(treeViewCy.elements(':visible'), 40);
}

export function selectTreeViewNode(nodeId) {
  treeViewSelectedId = nodeId;
  if (!treeViewCy) return;
  treeViewCy.nodes().removeClass('tree-selected');
  var node = treeViewCy.getElementById(nodeId);
  if (node) node.addClass('tree-selected');
  updateTreeViewDecisionPathHighlight();
}

export function clearTreeViewSelection() {
  treeViewSelectedId = null;
  if (treeViewCy) treeViewCy.nodes().removeClass('tree-selected');
}

export function highlightCurrentTreeViewPayload() {
  var currentId = state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
  if (currentId) selectTreeViewNode(currentId);
  updateTreeViewDecisionPathHighlight();
}

export function updateTreeViewDecisionPathHighlight() {
  if (!treeViewCy) return;
  treeViewCy.nodes().removeClass('tree-path tree-path-current');
  treeViewCy.edges().removeClass('edge-path');
  var pathState = getDecisionPathState();
  pathState.nodeIds.forEach(function (id) { var node = treeViewCy.getElementById(id); if (node) node.addClass('tree-path'); });
  pathState.edgeIds.forEach(function (id) { var edge = treeViewCy.getElementById(id); if (edge) edge.addClass('edge-path'); });
  var currentId = getCurrentPayloadId();
  if (currentId) { var currentNode = treeViewCy.getElementById(currentId); if (currentNode) currentNode.addClass('tree-path-current'); }
  if (treeViewSelectedId) { var selected = treeViewCy.getElementById(treeViewSelectedId); if (selected) selected.addClass('tree-selected'); }
}

export function refreshMiniTreeView() {
  if (!state.tree || !els.miniTreeCanvas) return;
  var svgNs = 'http://www.w3.org/2000/svg';
  var width = 320;
  var height = 150;
  var positions = buildMiniTreePositions(width, height);
  var currentId = getCurrentPayloadId();
  var pathState = getDecisionPathState();
  var pathNodeLookup = {};
  var pathEdgeLookup = {};
  pathState.nodeIds.forEach(function (id) { pathNodeLookup[id] = true; });
  pathState.edgeIds.forEach(function (id) { pathEdgeLookup[id] = true; });
  els.miniTreeCanvas.innerHTML = '';
  var svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('class', 'mini-tree-svg');
  svg.setAttribute('aria-hidden', 'true');
  Object.keys(state.tree.nodes).forEach(function (id) {
    var source = positions[id];
    if (!source) return;
    state.tree.nodes[id].options.forEach(function (option, index) {
      var target = positions[option.next];
      if (!target) return;
      var line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', source.x);
      line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x);
      line.setAttribute('y2', target.y);
      line.setAttribute('class', 'mini-tree-edge' + (pathEdgeLookup[id + '__' + index] ? ' path' : ''));
      svg.appendChild(line);
    });
  });
  Object.keys(positions).forEach(function (id) {
    var pos = positions[id];
    var circle = document.createElementNS(svgNs, 'circle');
    var isResult = !!state.tree.results[id];
    var isPath = !!pathNodeLookup[id];
    var isCurrent = id === currentId;
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', isCurrent ? 7 : 4.5);
    circle.setAttribute('class', 'mini-tree-node ' + (isResult ? 'result' : 'question') + (id === state.tree.startNode ? ' start' : '') + (isPath ? ' path' : '') + (isCurrent ? ' current' : ''));
    var title = document.createElementNS(svgNs, 'title');
    title.textContent = id;
    circle.appendChild(title);
    svg.appendChild(circle);
  });
  els.miniTreeCanvas.appendChild(svg);
  highlightCurrentMiniTreePayload();
}

export function buildMiniTreePositions(width, height) {
  var fallback = buildMiniTreeDepthPositions(width, height);
  var stored = getStoredTreePositions(state.tree);
  if (!Object.keys(stored).length) return fallback;
  var source = {};
  uniqueStrings(Object.keys(fallback).concat(Object.keys(stored))).forEach(function (id) {
    if (stored[id]) source[id] = { x: stored[id].x, y: stored[id].y };
    else if (fallback[id]) source[id] = { x: fallback[id].x, y: fallback[id].y };
  });
  return normalizeMiniTreePositions(source, width, height);
}

export function buildMiniTreeDepthPositions(width, height) {
  var depths = {};
  var orphanIds = getOrphanNodeIds(state.tree);
  var queue = [{ id: state.tree.startNode, depth: 0 }].concat(orphanIds.map(function (id) { return { id: id, depth: 0 }; }));
  var maxDepth = 0;
  while (queue.length) {
    var item = queue.shift();
    if (typeof depths[item.id] !== 'undefined' && depths[item.id] <= item.depth) continue;
    depths[item.id] = item.depth;
    maxDepth = Math.max(maxDepth, item.depth);
    var node = state.tree.nodes[item.id];
    if (!node || !Array.isArray(node.options)) continue;
    node.options.forEach(function (option) {
      if (state.tree.nodes[option.next] || state.tree.results[option.next]) queue.push({ id: option.next, depth: item.depth + 1 });
    });
  }
  Object.keys(state.tree.nodes).forEach(function (id) { if (typeof depths[id] === 'undefined') depths[id] = 0; });
  Object.keys(state.tree.results).forEach(function (id) {
    if (typeof depths[id] === 'undefined') { depths[id] = maxDepth + 1; maxDepth = depths[id]; }
  });
  var levels = {};
  Object.keys(depths).forEach(function (id) {
    var depth = depths[id];
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
  });
  var positions = {};
  var xPad = 14;
  var yPad = 14;
  var depthCount = Math.max(maxDepth, 1);
  Object.keys(levels).forEach(function (depthKey) {
    var depth = Number(depthKey);
    var ids = levels[depthKey].sort();
    var x = xPad + ((width - (xPad * 2)) * (depth / depthCount));
    ids.forEach(function (id, index) {
      var step = ids.length > 1 ? (height - (yPad * 2)) / (ids.length - 1) : 0;
      positions[id] = { x: x, y: ids.length > 1 ? yPad + (step * index) : height / 2 };
    });
  });
  return positions;
}

export function normalizeMiniTreePositions(sourcePositions, width, height) {
  var ids = Object.keys(sourcePositions || {});
  if (!ids.length) return {};
  var minX = Math.min.apply(null, ids.map(function (id) { return sourcePositions[id].x; }));
  var maxX = Math.max.apply(null, ids.map(function (id) { return sourcePositions[id].x; }));
  var minY = Math.min.apply(null, ids.map(function (id) { return sourcePositions[id].y; }));
  var maxY = Math.max.apply(null, ids.map(function (id) { return sourcePositions[id].y; }));
  var xPad = 14;
  var yPad = 14;
  var usableWidth = Math.max(width - (xPad * 2), 1);
  var usableHeight = Math.max(height - (yPad * 2), 1);
  var rangeX = maxX - minX;
  var rangeY = maxY - minY;
  var normalized = {};
  ids.forEach(function (id) {
    var src = sourcePositions[id];
    var x = rangeX ? xPad + (((src.x - minX) / rangeX) * usableWidth) : width / 2;
    var y = rangeY ? yPad + (((src.y - minY) / rangeY) * usableHeight) : height / 2;
    normalized[id] = { x: x, y: y };
  });
  return normalized;
}

export function highlightCurrentMiniTreePayload() {
  var currentId = state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
  if (els.miniTreeCurrentPill) els.miniTreeCurrentPill.textContent = currentId || '-';
}

export function syncMiniTreeView() {
  if (!state.tree) {
    if (els.miniTreeCurrentPill) els.miniTreeCurrentPill.textContent = '-';
    return;
  }
  refreshMiniTreeView();
}

export function openTablesView() {
  if (!state.tree) {
    alert('Load a tree first to view the tables.');
    return;
  }
  renderTreeTables();
  els.tablesOverlay.classList.remove('hidden');
}

export function closeTablesView() {
  els.tablesOverlay.classList.add('hidden');
}

export function handleTablesContentClick(event) {
  var row = event.target.closest('tr[data-payload-id]');
  if (!row || !els.tablesContent.contains(row)) return;
  openPayloadEditorForId(row.getAttribute('data-payload-id'));
}

export function renderTreeTables() {
  els.tablesContent.innerHTML = buildTreeTablesHtml({ editable: true, headingLevel: 3 });
}

export function buildTreeTablesHtml(options) {
  if (!state.tree) return '';
  var opts = options || {};
  var headingLevel = opts.headingLevel || 3;
  var headingTag = 'h' + headingLevel;
  var editable = !!opts.editable;
  var html = '';
  html += '<div class="table-section"><' + headingTag + '>Questions / Nodes</' + headingTag + '>';
  html += '<table><thead><tr><th>ID</th><th>Question</th><th>Icon</th><th>Options</th></tr></thead><tbody>';
  Object.keys(state.tree.nodes).forEach(function (id) {
    var node = state.tree.nodes[id];
    var optionsStr = node.options.map(function (o) { return o.label || '(unlabeled)'; }).join('; ') || '-';
    html += '<tr' + buildTreeTableRowAttrs(id, editable) + '>';
    html += '<td>' + escapeHtml(id) + '</td>';
    html += '<td>' + escapeHtml(node.question || '') + '</td>';
    html += '<td>' + escapeHtml(node.icon || '') + '</td>';
    html += '<td>' + escapeHtml(optionsStr) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<div class="table-section"><' + headingTag + '>Results / Outcomes</' + headingTag + '>';
  html += '<table><thead><tr><th>ID</th><th>Title</th><th>Description</th><th>Icon</th></tr></thead><tbody>';
  Object.keys(state.tree.results).forEach(function (id) {
    var result = state.tree.results[id];
    html += '<tr' + buildTreeTableRowAttrs(id, editable) + '>';
    html += '<td>' + escapeHtml(id) + '</td>';
    html += '<td>' + escapeHtml(result.title || '') + '</td>';
    html += '<td>' + escapeHtml(result.description || result.rationale || '') + '</td>';
    html += '<td>' + escapeHtml(result.icon || '') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<div class="table-section"><' + headingTag + '>Decision Paths (Node &rarr; Next Node)</' + headingTag + '>';
  html += '<table><thead><tr><th>From Node</th><th>Option Label</th><th>To Node</th><th>Risk Score</th><th>Recommendation</th></tr></thead><tbody>';
  Object.keys(state.tree.nodes).forEach(function (id) {
    var node = state.tree.nodes[id];
    node.options.forEach(function (option) {
      var rs = typeof option.riskScore === 'number' ? (option.riskScore > 0 ? '+' + option.riskScore : String(option.riskScore)) : '—';
      html += '<tr' + buildTreeTableRowAttrs(id, editable) + '>';
      html += '<td>' + escapeHtml(id) + '</td>';
      html += '<td>' + escapeHtml(option.label || '(unlabeled)') + '</td>';
      html += '<td>' + escapeHtml(option.next || '') + '</td>';
      html += '<td class="table-risk-score">' + escapeHtml(rs) + '</td>';
      html += '<td>' + escapeHtml(option.recommendation || '') + '</td>';
      html += '</tr>';
    });
  });
  html += '</tbody></table></div>';
  return html;
}

export function buildTreeTableRowAttrs(payloadId, editable) {
  return editable ? ' class="editable-table-row" data-payload-id="' + escapeAttr(payloadId) + '"' : '';
}

export function refreshTablesViewIfOpen() {
  if (state.tree && !els.tablesOverlay.classList.contains('hidden')) renderTreeTables();
}
