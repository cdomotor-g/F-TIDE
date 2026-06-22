import { state } from './state.js';
import { els } from './dom.js';
import { escapeHtml, escapeAttr, uniqueStrings } from './utils.js';
import { getOrphanNodeIds } from './validation.js';
import { setSaveStatus } from './runner.js';
import { openPayloadEditorForId } from './editor.js';

var treeViewCy = null;
var treeViewSelectedId = null;
var treeViewQuestionsOnly = false;

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
  els.treeViewOverlay.classList.add('hidden');
  treeViewSelectedId = null;
  treeViewQuestionsOnly = false;
  els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
  els.treeViewQuestionsOnlyBtn.style.borderColor = '';
  if (treeViewCy) {
    treeViewCy.elements().removeClass('tree-selected tree-match tree-dim tree-path tree-path-current edge-path');
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
      { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'line-color': '#64748b', 'opacity': 0.85, 'width': 2, 'label': 'data(label)', 'font-size': 11, 'text-rotation': 'autorotate', 'text-margin-y': -10, 'color': '#e2e8f0', 'text-background-color': '#111827', 'text-background-opacity': 0.88, 'text-background-shape': 'roundrectangle', 'text-border-color': '#1e293b', 'text-border-width': 1, 'text-border-opacity': 0.85 } },
      { selector: 'edge.edge-path', style: { 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'width': 4, 'opacity': 1, 'color': '#fde68a', 'text-background-color': '#78350f', 'text-background-opacity': 0.96, 'text-border-color': '#f59e0b', 'text-border-width': 1.5 } }
    ]
  });
  treeViewCy.on('tap', 'node', function (event) {
    var nodeId = event.target.id();
    selectTreeViewNode(nodeId);
    openPayloadEditorForId(nodeId);
  });
  treeViewCy.on('tap', function (event) {
    if (event.target !== treeViewCy) return;
    clearTreeViewSelection();
    updateTreeViewDecisionPathHighlight();
  });
  treeViewCy.on('dragfree', 'node', function () {
    persistTreeViewPositions({ message: 'Tree layout moved. Save tree.json to persist.' });
    refreshMiniTreeView();
    updateTreeViewDecisionPathHighlight();
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
      elements.push({ group: 'edges', data: { id: id + '__' + index, source: id, target: option.next, label: option.label || '' } });
    });
  });
  return elements;
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
  html += '<table><thead><tr><th>From Node</th><th>Option Label</th><th>To Node</th></tr></thead><tbody>';
  Object.keys(state.tree.nodes).forEach(function (id) {
    var node = state.tree.nodes[id];
    node.options.forEach(function (option) {
      html += '<tr' + buildTreeTableRowAttrs(id, editable) + '>';
      html += '<td>' + escapeHtml(id) + '</td>';
      html += '<td>' + escapeHtml(option.label || '(unlabeled)') + '</td>';
      html += '<td>' + escapeHtml(option.next || '') + '</td>';
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
