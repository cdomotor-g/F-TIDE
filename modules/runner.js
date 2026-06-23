import { state } from './state.js';
import { els } from './dom.js';
import { DEFAULT_ICON, STORAGE_KEY } from './constants.js';
import { clone, escapeHtml, flashButtonText } from './utils.js';
// Circular imports resolved via ES module live bindings — functions are only
// called at runtime after all modules have finished evaluating.
import { highlightCurrentTreeViewPayload, syncMiniTreeView } from './tree-view.js';
import { appendChangeLog } from './file-ops.js';

export function hideResultView() {
  els.questionView.classList.remove('hidden');
  els.resultView.classList.add('hidden');
}

export function setSaveStatus(message) {
  els.saveStatus.textContent = message || '';
  els.saveStatus.className = 'footnote';
  updateButtons();
}

export function getIcon(payload) {
  return payload && String(payload.icon || DEFAULT_ICON).trim() ? String(payload.icon || DEFAULT_ICON).trim() : DEFAULT_ICON;
}

export function estimateRemainingSteps(currentNodeId, visiting) {
  if (!state.tree || !currentNodeId) return 0;
  if (state.tree.results[currentNodeId]) return 0;
  var node = state.tree.nodes[currentNodeId];
  if (!node) return 0;
  var seen = visiting || new Set();
  if (seen.has(currentNodeId)) return 0;
  seen.add(currentNodeId);
  var distances = node.options.map(function (option) {
    if (state.tree.results[option.next]) return 1;
    if (state.tree.nodes[option.next]) return 1 + estimateRemainingSteps(option.next, new Set(seen));
    return 1;
  });
  return distances.length ? Math.min.apply(null, distances) : 0;
}

export function updateProgress() {
  var completed = state.history.length;
  var remaining = state.currentMode === 'result' ? 0 : estimateRemainingSteps(state.currentNodeId);
  var total = Math.max(completed + remaining, 1);
  var pct = state.currentMode === 'result' ? 100 : Math.round((completed / total) * 100);
  var summary = 'Answered ' + completed + ' step' + (completed === 1 ? '' : 's');
  var remainText = state.currentMode === 'result' ? 'Complete' : 'Approx. ' + remaining + ' step' + (remaining === 1 ? '' : 's') + ' remaining';
  els.progressSummaryQ.textContent = summary;
  els.progressRemainingQ.textContent = remainText;
  els.progressFillQ.style.width = pct + '%';
  els.progressSummaryR.textContent = summary;
  els.progressRemainingR.textContent = remainText;
  els.progressFillR.style.width = pct + '%';
}

export function updateButtons() {
  var hasTree = !!state.tree;
  var canGoBack = hasTree && state.history.length > 0;
  var canExport = hasTree && (state.history.length > 0 || !!state.currentResult);
  var canEdit = hasTree && !!state.currentPayload;
  if (els.saveTreeBtn) els.saveTreeBtn.disabled = !hasTree;
  if (els.saveSessionModalBtn) els.saveSessionModalBtn.disabled = !hasTree;
  if (els.openTablesBtn) els.openTablesBtn.disabled = !hasTree;
  els.restartBtn.disabled = !hasTree;
  els.restartResultBtn.disabled = !hasTree;
  els.copyNodeIdBtn.disabled = !hasTree;
  els.backBtn.disabled = !canGoBack;
  els.backResultBtn.disabled = !canGoBack;
  els.editNodeBtn.disabled = !canEdit;
  els.exportReportBtn.disabled = !canExport;
  els.exportReportBtn.classList.toggle('ready', hasTree && state.currentMode === 'result' && !!state.currentResult);
  els.applyMissingRuleBtn.disabled = !(hasTree && state.currentResult && state.currentResult.isMissingRule);
  els.saveMissingRuleBtn.disabled = !(hasTree && state.currentResult && state.currentResult.isMissingRule);
  els.openCreateQuestionBtn.disabled = !hasTree;
  els.openCreateResultBtn.disabled = !hasTree;
  els.treeViewCreateQuestionBtn.disabled = !hasTree;
  els.treeViewCreateResultBtn.disabled = !hasTree;
}

export function updateRiskScoreBar() {
  if (!els.riskGaugeCard) return;
  if (!state.tree || !Array.isArray(state.tree.riskBands) || !state.tree.riskBands.length) {
    els.riskGaugeCard.classList.add('hidden');
    return;
  }
  els.riskGaugeCard.classList.remove('hidden');
  var bands = state.tree.riskBands;
  var score = state.currentScore || 0;
  var lastNamedMax = 0;
  for (var i = 0; i < bands.length; i++) {
    if (typeof bands[i].max === 'number' && bands[i].max > lastNamedMax) lastNamedMax = bands[i].max;
  }
  var totalRange = lastNamedMax + Math.max(Math.ceil(lastNamedMax * 0.5), 5);
  var band = null;
  for (var j = 0; j < bands.length; j++) {
    var b = bands[j];
    if (typeof b.max === 'undefined' || score <= b.max) { band = b; break; }
  }
  if (els.riskGaugeNumber) els.riskGaugeNumber.textContent = String(score);
  if (els.riskGaugeBandPill) {
    if (band) {
      els.riskGaugeBandPill.textContent = band.label;
      els.riskGaugeBandPill.className = 'risk-band-pill ' + band.label.toLowerCase();
    } else {
      els.riskGaugeBandPill.textContent = '-';
      els.riskGaugeBandPill.className = 'risk-band-pill';
    }
  }
  var bandColors = { low: '#34d399', medium: '#fbbf24', high: '#f97316', critical: '#f87171' };
  var defaultColors = ['#34d399', '#fbbf24', '#f97316', '#f87171'];
  var stops = [];
  var labelEls = [];
  var prevPct = 0;
  bands.forEach(function (bnd, idx) {
    var color = (bnd.label && bandColors[bnd.label.toLowerCase()]) || defaultColors[idx] || '#f87171';
    var endPct = typeof bnd.max === 'number' ? Math.min(bnd.max / totalRange, 1) * 100 : 100;
    stops.push(color + ' ' + prevPct.toFixed(1) + '%');
    stops.push(color + ' ' + endPct.toFixed(1) + '%');
    var span = document.createElement('span');
    span.className = 'risk-gauge-label';
    span.textContent = bnd.label;
    span.style.width = (endPct - prevPct).toFixed(1) + '%';
    labelEls.push(span);
    prevPct = endPct;
  });
  if (els.riskGaugeTrack) els.riskGaugeTrack.style.background = 'linear-gradient(to right, ' + stops.join(', ') + ')';
  if (els.riskGaugeLabels) {
    els.riskGaugeLabels.innerHTML = '';
    labelEls.forEach(function (el) { els.riskGaugeLabels.appendChild(el); });
  }
  if (els.riskGaugeCursor) els.riskGaugeCursor.style.left = Math.min(score / totalRange, 1) * 100 + '%';
}

export function renderCurrentPayloadJson(payload) {
  els.currentNodeJson.textContent = payload ? JSON.stringify(payload, null, 2) : 'No tree loaded yet.';
}

export function renderCurrentPayload(payload) {
  els.currentNodeIdPill.textContent = payload && payload.id ? payload.id : '-';
  renderCurrentPayloadJson(payload);
  highlightCurrentTreeViewPayload();
  syncMiniTreeView();
}

export function renderSupportLinks(node) {
  els.supportLinks.innerHTML = '';
  var links = node && Array.isArray(node.links) ? node.links : [];
  if (!links.length) { els.supportLinks.classList.add('hidden'); return; }
  var heading = document.createElement('p');
  heading.className = 'card-title';
  heading.style.margin = '0 0 10px 0';
  heading.textContent = 'Links';
  els.supportLinks.appendChild(heading);
  var list = document.createElement('div');
  list.className = 'support-link-list';
  links.forEach(function (link, idx) {
    var row = document.createElement('div');
    row.className = 'support-link-row';
    var label = document.createElement('div');
    label.className = 'support-link-label';
    label.textContent = (link.label || 'Supporting document');
    row.appendChild(label);
    var currentRuntime = (state.sessionLinks[node.id] && state.sessionLinks[node.id][idx]) || '';
    var defaultUrl = String(link.url || '').trim();
    var input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = defaultUrl ? 'Use default or enter station-specific URL...' : 'Enter URL for this site...';
    input.style.minWidth = '260px';
    input.value = currentRuntime || defaultUrl;
    var actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'btn-small';
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-small';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', function () {
      if (state.sessionLinks[node.id]) state.sessionLinks[node.id][idx] = '';
      renderSupportLinks(node);
    });
    if (currentRuntime) {
      input.readOnly = true;
      actionBtn.textContent = 'Edit';
      actionBtn.addEventListener('click', function () {
        if (input.readOnly) {
          input.readOnly = false;
          input.focus();
          actionBtn.textContent = 'Save';
          return;
        }
        var val = String(input.value || '').trim();
        if (!val) return;
        if (!state.sessionLinks[node.id]) state.sessionLinks[node.id] = [];
        state.sessionLinks[node.id][idx] = val;
        setSaveStatus('Link updated for this session (not persisted to tree.json).');
        renderSupportLinks(node);
      });
      var openBtn = document.createElement('a');
      openBtn.className = 'support-link';
      openBtn.href = currentRuntime;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener noreferrer';
      openBtn.textContent = 'Open saved link ↗';
      row.appendChild(input);
      row.appendChild(openBtn);
      row.appendChild(actionBtn);
      row.appendChild(clearBtn);
    } else {
      actionBtn.textContent = 'Save';
      actionBtn.addEventListener('click', function () {
        var val = String(input.value || '').trim();
        if (!val) return;
        if (!state.sessionLinks[node.id]) state.sessionLinks[node.id] = [];
        state.sessionLinks[node.id][idx] = val;
        setSaveStatus('Link saved for this session (not persisted to tree.json).');
        renderSupportLinks(node);
      });
      row.appendChild(input);
      row.appendChild(actionBtn);
      if (defaultUrl) {
        var openDefault = document.createElement('a');
        openDefault.className = 'support-link';
        openDefault.href = defaultUrl;
        openDefault.target = '_blank';
        openDefault.rel = 'noopener noreferrer';
        openDefault.textContent = 'Open default link ↗';
        row.appendChild(openDefault);
      }
    }
    list.appendChild(row);
  });
  els.supportLinks.appendChild(list);
  els.supportLinks.classList.remove('hidden');
}

export function renderOptionTargetRows(node) {
  els.optionTargetGrid.innerHTML = '';
  if (!node || !Array.isArray(node.options) || node.options.length === 0) {
    els.emptyTargets.classList.remove('hidden');
    return;
  }
  els.emptyTargets.classList.add('hidden');
  node.options.forEach(function (option) {
    var row = document.createElement('div');
    row.className = 'option-target-row';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = option.label;
    button.addEventListener('click', function () { selectOption(node, option); });
    var target = document.createElement('div');
    target.className = 'target-cell';
    var id = document.createElement('div');
    id.className = 'target-id';
    id.textContent = option.next;
    var meta = document.createElement('div');
    meta.className = 'target-meta';
    meta.textContent = state.tree.nodes[option.next] ? 'Question node' : (state.tree.results[option.next] ? 'Result' : 'Unknown');
    target.appendChild(id);
    target.appendChild(meta);
    row.appendChild(button);
    row.appendChild(target);
    els.optionTargetGrid.appendChild(row);
  });
}

export function renderPathTable(result) {
  els.pathTableBody.innerHTML = '';
  if (state.history.length === 0 && !result) { els.emptyTrail.classList.remove('hidden'); return; }
  els.emptyTrail.classList.add('hidden');
  state.history.forEach(function (step, index) {
    var tr = document.createElement('tr');
    var tdIndex = document.createElement('td'); tdIndex.className = 'index-col'; tdIndex.textContent = String(index + 1);
    var tdQuestion = document.createElement('td');
    var wrap = document.createElement('div'); wrap.className = 'path-question-cell';
    var icon = document.createElement('span'); icon.className = 'path-icon'; icon.textContent = step.icon || DEFAULT_ICON;
    var text = document.createElement('div'); text.textContent = step.question;
    wrap.appendChild(icon); wrap.appendChild(text); tdQuestion.appendChild(wrap);
    var tdAnswer = document.createElement('td'); tdAnswer.textContent = step.answer;
    var tdComment = document.createElement('td'); tdComment.textContent = step.comment || '';
    tr.appendChild(tdIndex); tr.appendChild(tdQuestion); tr.appendChild(tdAnswer); tr.appendChild(tdComment);
    els.pathTableBody.appendChild(tr);
  });
  if (result) {
    var tr = document.createElement('tr');
    var a = document.createElement('td'); a.className = 'index-col'; a.textContent = String(state.history.length + 1);
    var b = document.createElement('td'); b.textContent = 'Outcome';
    var c = document.createElement('td'); c.textContent = result.title || 'Recommendation unavailable';
    tr.appendChild(a); tr.appendChild(b); tr.appendChild(c);
    els.pathTableBody.appendChild(tr);
  }
}

export function renderNode() {
  if (!state.tree) return;
  var node = state.tree.nodes[state.currentNodeId];
  if (!node) {
    renderResult({ id: 'RESULT_NO_RULE', title: 'No current recommendation', rationale: "Node '" + state.currentNodeId + "' does not exist in the current tree.", isMissingRule: true });
    return;
  }
  state.currentMode = 'node';
  state.currentPayload = node;
  state.currentResult = null;
  els.questionView.classList.remove('hidden');
  els.resultView.classList.add('hidden');
  els.questionText.textContent = node.question;
  var commentEl = document.getElementById('nodeComment');
  if (commentEl) commentEl.value = state.comments[state.currentNodeId] || '';
  els.questionIcon.textContent = getIcon(node);
  renderSupportLinks(node);
  renderOptionTargetRows(node);
  renderCurrentPayload(node);
  renderPathTable();
  updateProgress();
  updateButtons();
  updateRiskScoreBar();
}

export function selectOption(node, option) {
  var score = typeof option.riskScore === 'number' ? option.riskScore : 0;
  state.currentScore = (state.currentScore || 0) + score;
  state.history.push({
    nodeId: node.id,
    question: node.question,
    answer: option.label,
    next: option.next,
    icon: getIcon(node),
    comment: state.comments[node.id] || '',
    riskScore: score
  });
  if (state.tree.nodes[option.next]) { state.currentNodeId = option.next; renderNode(); return; }
  if (state.tree.results[option.next]) { renderResult(state.tree.results[option.next]); return; }
  renderResult({ id: 'RESULT_NO_RULE', title: 'No current recommendation', rationale: "The selected option points to '" + option.next + "', which does not exist in nodes or results.", isMissingRule: true });
}

export function renderResult(result) {
  state.currentMode = 'result';
  state.currentPayload = result;
  state.currentResult = result;
  els.questionView.classList.add('hidden');
  els.resultView.classList.remove('hidden');
  els.resultRecommendation.textContent = result.title || 'Recommendation unavailable';
  els.resultRationale.textContent = result.rationale || '';
  if (result.isMissingRule) {
    els.resultBox.classList.add('warning');
    els.missingRuleBox.classList.remove('hidden');
    populateMissingRuleOptions();
  } else {
    els.resultBox.classList.remove('warning');
    els.missingRuleBox.classList.add('hidden');
    clearMissingRuleForm();
  }
  if (els.riskScoreWrap && !result.isMissingRule && state.tree && Array.isArray(state.tree.riskBands) && state.tree.riskBands.length) {
    var score = state.currentScore || 0;
    var band = null;
    for (var i = 0; i < state.tree.riskBands.length; i++) {
      var b = state.tree.riskBands[i];
      if (typeof b.max === 'undefined' || score <= b.max) { band = b; break; }
    }
    if (band) {
      els.riskScoreNumber.textContent = String(score);
      els.riskScoreBand.textContent = band.label;
      els.riskScoreBand.className = 'risk-band-pill ' + band.label.toLowerCase();
      els.riskScoreWrap.classList.remove('hidden');
    } else {
      els.riskScoreWrap.classList.add('hidden');
    }
  } else if (els.riskScoreWrap) {
    els.riskScoreWrap.classList.add('hidden');
  }
  renderCurrentPayload(result);
  renderPathTable(result);
  updateProgress();
  updateButtons();
  updateRiskScoreBar();
}

export function restart() {
  if (!state.tree) return;
  state.currentNodeId = state.tree.startNode;
  state.history = [];
  state.currentScore = 0;
  state.currentMode = 'node';
  state.currentPayload = state.tree.nodes[state.tree.startNode];
  state.currentResult = null;
  state.sessionLinks = {};
  clearMissingRuleForm();
  hideResultView();
  renderNode();
}

export function goBack() {
  if (!state.tree || state.history.length === 0) return;
  var popped = state.history.pop();
  state.currentScore = Math.max(0, (state.currentScore || 0) - (popped.riskScore || 0));
  if (state.history.length === 0) state.currentNodeId = state.tree.startNode;
  else {
    var previous = state.history[state.history.length - 1];
    state.currentNodeId = state.tree.nodes[previous.next] ? previous.next : previous.nodeId;
  }
  state.currentMode = 'node';
  state.currentPayload = state.tree.nodes[state.currentNodeId];
  state.currentResult = null;
  clearMissingRuleForm();
  hideResultView();
  renderNode();
}

export function populateMissingRuleOptions() {
  els.missingRuleSelect.innerHTML = '';
  var ph = document.createElement('option'); ph.value = ''; ph.textContent = 'Select a result...'; els.missingRuleSelect.appendChild(ph);
  Object.values(state.tree.results)
    .filter(function (r) { return !r.isMissingRule; })
    .sort(function (a, b) { return String(a.title || a.id).localeCompare(String(b.title || b.id)); })
    .forEach(function (result) {
      var opt = document.createElement('option');
      opt.value = result.id;
      opt.textContent = (result.title || result.id) + ' — ' + result.id;
      els.missingRuleSelect.appendChild(opt);
    });
  els.missingRuleSelect.value = '';
}

export function applyMissingRuleSelection() {
  if (!state.tree) return;
  var selectedResultId = els.missingRuleSelect.value;
  if (!selectedResultId || !state.tree.results[selectedResultId]) { els.missingRuleSaveMessage.textContent = 'Select a result first.'; return; }
  var lastStep = state.history[state.history.length - 1];
  if (!lastStep) { els.missingRuleSaveMessage.textContent = 'No decision path available to update.'; return; }
  var sourceNode = state.tree.nodes[lastStep.nodeId];
  var sourceOption = sourceNode && Array.isArray(sourceNode.options) ? sourceNode.options.find(function (o) { return o.label === lastStep.answer; }) : null;
  if (!sourceNode || !sourceOption) { els.missingRuleSaveMessage.textContent = 'Could not find the source branch to update.'; return; }
  var prev = sourceOption.next;
  sourceOption.next = selectedResultId;
  appendChangeLog({ type: 'missingRuleMappedToExistingResult', sourceNodeId: sourceNode.id, optionLabel: sourceOption.label, previousTarget: prev, newTarget: selectedResultId, note: els.missingRuleText.value.trim() || null, payloadType: 'node', payloadId: sourceNode.id });
  els.missingRuleSaveMessage.textContent = 'Rule applied in the current session. Click Save tree.json to persist it.';
  renderResult(state.tree.results[selectedResultId]);
}

export function saveMissingRuleCase() {
  var note = els.missingRuleText.value.trim();
  if (!note) { els.missingRuleSaveMessage.textContent = 'Enter notes first, or pick a result and apply it.'; return; }
  var payload = {
    savedAt: new Date().toISOString(),
    treeTitle: state.tree ? (state.tree.title || '') : '',
    treeVersion: state.tree ? (state.tree.version || '') : '',
    treeVersionHash: state.tree ? (state.tree.versionHash || '') : '',
    path: state.history.map(function (step, index) { return { step: index + 1, nodeId: step.nodeId, question: step.question, answer: step.answer, comment: step.comment, next: step.next, icon: step.icon }; }),
    selectedResultId: els.missingRuleSelect.value || null,
    proposedRecommendation: note
  };
  var existing = readUnresolvedCases();
  existing.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing, null, 2));
  els.missingRuleSaveMessage.textContent = 'Unresolved case saved in this browser.';
}

export function readUnresolvedCases() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}

export function clearMissingRuleForm() {
  els.missingRuleSelect.innerHTML = '';
  els.missingRuleText.value = '';
  els.missingRuleSaveMessage.textContent = '';
}

export async function copyCurrentId() {
  var text = els.currentNodeIdPill.textContent || '';
  if (!text || text === '-') return;
  try {
    await navigator.clipboard.writeText(text);
    flashButtonText(els.copyNodeIdBtn, 'Copied');
  } catch (_err) {
    alert('Could not copy automatically.\nCurrent ID: ' + text);
  }
}
