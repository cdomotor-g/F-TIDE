import { state } from './state.js';
import { els } from './dom.js';
import { STORAGE_KEY, SESSION_STORAGE_KEY, ASSESSMENT_HISTORY_KEY, DEFAULT_ICON } from './constants.js';
import { clone, escapeHtml, escapeAttr, slugify, sortKeysDeep, simpleHashFallback, downloadFile, padNumber, flashButtonText } from './utils.js';
import { validateTree, formatTreeValidationWarningSummary } from './validation.js';
import { setSaveStatus, clearMissingRuleForm, hideResultView, renderNode } from './assessment.js';
import { updateEditorDirtyState } from './editor.js';
import { buildTreeTablesHtml } from './tree-view.js';

export function handleJsonFileSelected(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      loadTreeFromText(file.name || 'tree.json', e.target.result);
    } catch (err) {
      els.loadStatus.textContent = 'Error loading JSON: ' + err.message;
      alert('Could not load tree.json\n' + err.message);
    }
  };
  reader.readAsText(file);
}

export function loadTreeFromText(fileName, rawText) {
  var parsed = JSON.parse(rawText);
  state.changeLog = Array.isArray(parsed.changeLog) ? parsed.changeLog : [];
  delete parsed.changeLog;
  var warnings = validateTree(parsed);
  state.tree = parsed;
  state.lastTreeSnapshot = JSON.stringify(parsed);
  state.loadedFileName = fileName || 'tree.json';
  state.currentNodeId = parsed.startNode;
  state.history = [];
  state.currentMode = 'node';
  state.currentPayload = parsed.nodes[parsed.startNode];
  state.currentResult = null;
  state.assessmentLinks = {};
  state.tree.branchId = sanitizeBranchId(state.tree.branchId || 'main');
  els.loadStatus.textContent = 'Loaded: ' + state.loadedFileName + (warnings && warnings.length ? ' — ' + formatTreeValidationWarningSummary(parsed) : '');
  els.toolVersion.textContent = formatRuleSetLabel(state.tree);
  els.startupNotice.classList.add('hidden');
  els.assessmentMetaCard.classList.remove('hidden');
  els.currentNodeCard.classList.remove('hidden');
  clearMissingRuleForm();
  setSaveStatus('Loaded successfully. Save tree.json downloads an updated copy.');
  updateEditorDirtyState();
  hideResultView();
  startNewAssessmentRun();
  renderNode();
}

export async function saveTreeJson() {
  if (!state.tree) return;
  state.tree.branchId = sanitizeBranchId(state.tree.branchId || 'main');
  var previousHash = state.tree.versionHash || null;
  state.tree.parentVersionHash = previousHash;
  state.tree.version = incrementVersionString(state.tree.version || 'v0.0');
  state.tree.versionHash = await computeTreeVersionHash(state.tree);
  appendChangeLog({
    type: 'treeSaved',
    treeVersion: state.tree.version,
    versionHash: state.tree.versionHash,
    parentVersionHash: previousHash,
    branchId: state.tree.branchId
  });
  els.toolVersion.textContent = formatRuleSetLabel(state.tree);
  var treeContent = JSON.stringify(state.tree, null, 2);
  downloadFile(treeContent, 'tree.json', 'application/json');
  var changelogContent = buildChangelogJson();
  downloadFile(changelogContent, 'changelog.json', 'application/json');
  state.lastTreeSnapshot = JSON.stringify(state.tree);
  updateEditorDirtyState();
  setSaveStatus('Downloaded tree.json and changelog.json with version hash.');
}

export function buildChangelogJson() {
  var versionChain = state.changeLog
    .filter(function (e) { return e.type === 'treeSaved'; })
    .map(function (e) { return { version: e.treeVersion || '', versionHash: e.versionHash || null, parentVersionHash: e.parentVersionHash || null, branchId: e.branchId || 'main', savedAt: e.changedAt || '' }; });
  return JSON.stringify({ versionChain: versionChain, entries: state.changeLog }, null, 2);
}

export async function forkCurrentTreeBranch() {
  if (!state.tree) return;
  var sourceBranch = sanitizeBranchId(state.tree.branchId || 'main');
  var existingHash = state.tree.versionHash || await computeTreeVersionHash(state.tree);
  state.tree.versionHash = existingHash;
  var suggested = generateForkBranchId(sourceBranch);
  var requested = String(prompt('Enter branch ID for the new fork:', suggested) || '').trim();
  if (!requested) return;
  var nextBranchId = sanitizeBranchId(requested);
  if (!nextBranchId) return;
  state.tree.branchId = nextBranchId;
  state.tree.parentVersionHash = existingHash;
  appendChangeLog({
    type: 'treeForked',
    branchId: nextBranchId,
    sourceBranchId: sourceBranch,
    versionHash: existingHash,
    parentVersionHash: existingHash
  });
  els.toolVersion.textContent = formatRuleSetLabel(state.tree);
  setSaveStatus('Forked tree to branch ' + nextBranchId + '. Save tree.json to persist the fork.');
}

export function generateForkBranchId(sourceBranch) {
  return sanitizeBranchId((sourceBranch || 'main') + '-fork-' + new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 12));
}

export function sanitizeBranchId(branchId) {
  var clean = slugify(String(branchId || '').trim()).replace(/^-+|-+$/g, '');
  return clean || 'main';
}

export function getShortVersionHash(hashValue) {
  var value = String(hashValue || '').trim();
  if (!value) return '';
  return value.length > 20 ? value.slice(0, 20) + '…' : value;
}

export function formatRuleSetLabel(tree) {
  if (!tree) return 'Rule set: -';
  var parts = [tree.version || '-'];
  var branchId = sanitizeBranchId(tree.branchId || 'main');
  if (branchId) parts.push('branch:' + branchId);
  if (tree.versionHash) parts.push(getShortVersionHash(tree.versionHash));
  return 'Rule set: ' + parts.join(' · ');
}

export function buildVersionHashTreeSnapshot(tree) {
  var snapshot = clone(tree || {});
  delete snapshot.version;
  delete snapshot.versionHash;
  delete snapshot.parentVersionHash;
  delete snapshot.branchId;
  delete snapshot.changeLog;
  Object.keys(snapshot.nodes || {}).forEach(function (id) { delete snapshot.nodes[id].x; delete snapshot.nodes[id].y; });
  Object.keys(snapshot.results || {}).forEach(function (id) { delete snapshot.results[id].x; delete snapshot.results[id].y; });
  return sortKeysDeep(snapshot);
}

export async function computeTreeVersionHash(tree) {
  var snapshot = buildVersionHashTreeSnapshot(tree);
  var canonical = JSON.stringify(snapshot);
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    var bytes = new TextEncoder().encode(canonical);
    var digest = await window.crypto.subtle.digest('SHA-256', bytes);
    var hex = Array.prototype.map.call(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return 'sha256:' + hex;
  }
  return 'sha256:' + simpleHashFallback(canonical);
}

export function appendChangeLog(entry) {
  if (!state.tree) return;
  var payload = clone(entry || {});
  payload.changedAt = payload.changedAt || new Date().toISOString();
  if (typeof payload.treeVersion === 'undefined' && state.tree.version) payload.treeVersion = state.tree.version;
  if (typeof payload.versionHash === 'undefined') payload.versionHash = state.tree.versionHash || null;
  if (typeof payload.parentVersionHash === 'undefined') payload.parentVersionHash = state.tree.parentVersionHash || null;
  if (typeof payload.branchId === 'undefined') payload.branchId = sanitizeBranchId(state.tree.branchId || 'main');
  state.changeLog.push(payload);
}

export function incrementVersionString(version) {
  var text = String(version || '').trim();
  var match = text.match(/^(.*?)(\d+(?:\.\d+)?)(.*?)$/);
  if (!match) return 'v1.0';
  var prefix = match[1] || '';
  var numeric = parseFloat(match[2]);
  var suffix = match[3] || '';
  var decimals = (match[2].split('.')[1] || '').length;
  var places = Math.max(decimals, 1);
  return prefix + (numeric + 1).toFixed(places) + suffix;
}

export function validateReportInputs() {
  var missing = [];
  if (!els.assessorInitialsInput.value.trim()) missing.push({ label: 'assessor initials', el: els.assessorInitialsInput });
  if (!els.stationNumberInput.value.trim()) missing.push({ label: 'station number', el: els.stationNumberInput });
  if (!els.stationNameInput.value.trim()) missing.push({ label: 'station name', el: els.stationNameInput });
  return missing;
}

export function exportAssessmentReport() {
  if (!state.tree || (state.history.length === 0 && !state.currentResult)) return;
  var missing = validateReportInputs();
  if (missing.length) {
    alert('Please go back and enter: ' + missing.map(function (item) { return item.label; }).join(', ') + '.');
    if (missing[0] && missing[0].el) missing[0].el.focus();
    return;
  }
  saveCurrentSession();
  var now = new Date();
  var reportHtml = buildReportHtml({ generatedAt: now, assessorInitials: els.assessorInitialsInput.value.trim(), stationNumber: els.stationNumberInput.value.trim(), stationName: els.stationNameInput.value.trim() });
  var fileStem = slugify(
    (els.stationNumberInput.value.trim() || 'station') + '_' +
    (els.stationNameInput.value.trim() || 'site') + '_' +
    (state.assessmentId || 'run')
  );
  downloadFile(reportHtml, fileStem + '_outcome_report.html', 'text/html');
  storeAssessmentRunMetadata();
  flashButtonText(els.exportAssessmentBtn, 'Session + report saved');
}

export function saveCurrentSession() {
  if (!state.tree) return;
  var id = els.assessmentIdInput.value || ('ASMT-' + Date.now());
  var session = {
    id: id,
    savedAt: new Date().toISOString(),
    assessmentId: id,
    treeTitle: state.tree.title || '',
    treeVersion: state.tree.version || '',
    treeVersionHash: state.tree.versionHash || '',
    branchId: state.tree.branchId || 'main',
    stationNumber: els.stationNumberInput.value.trim(),
    stationName: els.stationNameInput.value.trim(),
    assessorInitials: els.assessorInitialsInput.value.trim(),
    path: state.history.map(function (step, index) { return { step: index + 1, nodeId: step.nodeId, question: step.question, answer: step.answer, comment: step.comment, next: step.next, icon: step.icon }; }),
    currentNodeId: state.currentNodeId,
    currentMode: state.currentMode,
    currentPayload: state.currentPayload
  };
  var sessions = [];
  try {
    var raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) sessions = JSON.parse(raw);
  } catch (_err) { sessions = []; }
  var existingIndex = sessions.findIndex(function (s) { return s.id === id; });
  if (existingIndex !== -1) sessions[existingIndex] = session; else sessions.push(session);
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions, null, 2));
    if (els.saveSessionBtn) flashButtonText(els.saveSessionBtn, 'Session saved');
  } catch (_err) {
    if (els.saveSessionBtn) els.saveSessionBtn.textContent = 'Save failed';
  }
}

export function buildReportHtml(meta) {
  var dateText = meta.generatedAt.toLocaleString();
  var supersedesText = state.supersedesAssessmentId ? escapeHtml(state.supersedesAssessmentId) : '-';
  var rows = state.history.map(function (step, index) {
    var answerHtml = escapeHtml(step.answer);
    if (state.tree && state.tree.nodes && state.tree.nodes[step.nodeId]) {
      var node = state.tree.nodes[step.nodeId];
      var linkRows = [];
      if (Array.isArray(node.links)) {
        node.links.forEach(function (link, linkIndex) {
          var saved = state.assessmentLinks && state.assessmentLinks[node.id] ? state.assessmentLinks[node.id][linkIndex] : '';
          var url = String(saved || (link && link.url) || '').trim();
          if (url) {
            var label = (link && link.label) ? escapeHtml(link.label) : 'Supporting document';
            linkRows.push('<div><strong>' + label + ':</strong> <a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a></div>');
          }
        });
      }
      if (linkRows.length) answerHtml += '<div class="report-link-list">' + linkRows.join('') + '</div>';
    }
    return '<tr><td>' + (index + 1) + '</td>'
      + '<td><span class="icon">' + escapeHtml(step.icon || DEFAULT_ICON) + '</span> ' + escapeHtml(step.question) + '</td>'
      + '<td>' + answerHtml + '</td>'
      + '<td>' + escapeHtml(step.comment || '') + '</td>'
      + '</tr>';
  }).join('');
  var outcomeRow = state.currentResult ? '<tr><td>' + (state.history.length + 1) + '</td><td>Outcome</td><td>' + escapeHtml(state.currentResult.title || 'Recommendation unavailable') + '</td></tr>' : '';
  var rationaleBlock = state.currentResult ? '<section class="box"><h2>Recommendation</h2><p><strong>' + escapeHtml(state.currentResult.title || 'Recommendation unavailable') + '</strong></p><p>' + escapeHtml(state.currentResult.rationale || '') + '</p></section>' : '';
  var treeTablesBlock = '<section class="box tree-snapshot"><h2>Current tree.json snapshot</h2><p class="tree-version"><strong>Tree version:</strong> ' + escapeHtml(state.tree.version || '-') + '</p><p class="tree-version"><strong>Version hash:</strong> ' + escapeHtml(state.tree.versionHash || '-') + '</p><p class="tree-version"><strong>Branch:</strong> ' + escapeHtml(state.tree.branchId || 'main') + '</p>' + buildTreeTablesHtml({ editable: false, headingLevel: 3 }) + '</section>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<title>' + escapeHtml((state.tree.title || 'Assessment') + ' - ' + meta.stationName) + '</title>' +
    '<style>' + (window.REPORT_CSS || '') + '</style></head><body>' +
    '<h1>' + escapeHtml(state.tree.title || 'FWIN-TIDE Assessment') + '</h1>' +
    '<p>Generated ' + escapeHtml(dateText) + '</p>' +
    '<section class="box"><h2>Assessment details</h2><div class="meta">' +
    '<div><strong>Assessor initials:</strong> ' + escapeHtml(meta.assessorInitials) + '</div>' +
    '<div><strong>Station number:</strong> ' + escapeHtml(meta.stationNumber) + '</div>' +
    '<div><strong>Station name:</strong> ' + escapeHtml(meta.stationName) + '</div>' +
    '<div><strong>Assessment ID:</strong> ' + escapeHtml(state.assessmentId || '-') + '</div>' +
    '<div><strong>Supersedes:</strong> ' + supersedesText + '</div>' +
    '<div><strong>Rule set:</strong> ' + escapeHtml(state.tree.version || '-') + '</div>' +
    '</div></section>' +
    '<section class="box"><h2>Decision path</h2><table><thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Comments</th></tr></thead><tbody>' + rows + outcomeRow + '</tbody></table></section>' +
    rationaleBlock + treeTablesBlock + '<p class="foot">Open this report in a browser and print to PDF.</p>' + '</body></html>';
}

export function startNewAssessmentRun() {
  state.assessmentId = generateAssessmentId();
  state.supersedesAssessmentId = '';
  renderAssessmentMetadata();
}

export function generateAssessmentId() {
  var now = new Date();
  return 'ASMT-' + padNumber(now.getFullYear(), 4) + padNumber(now.getMonth() + 1, 2) + padNumber(now.getDate(), 2) + '-' + padNumber(now.getHours(), 2) + padNumber(now.getMinutes(), 2) + padNumber(now.getSeconds(), 2) + '-' + Math.floor(1000 + Math.random() * 9000);
}

export function renderAssessmentMetadata() {
  if (els.assessmentIdInput) els.assessmentIdInput.value = state.assessmentId || '';
  if (els.supersedesAssessmentInput) els.supersedesAssessmentInput.value = state.supersedesAssessmentId || '';
  renderPreviousAssessmentOptions();
}

export function renderPreviousAssessmentOptions() {
  if (!els.previousAssessmentIdsDatalist) return;
  els.previousAssessmentIdsDatalist.innerHTML = (state.previousAssessmentIds || []).map(function (id) {
    return '<option value="' + escapeAttr(id) + '"></option>';
  }).join('');
}

export function readPreviousAssessmentIds() {
  try {
    var raw = localStorage.getItem(ASSESSMENT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}

export function savePreviousAssessmentIds(ids) {
  try {
    localStorage.setItem(ASSESSMENT_HISTORY_KEY, JSON.stringify(ids));
  } catch (_err) {
    // ignore storage failures
  }
}

export function storeAssessmentRunMetadata() {
  if (!state.assessmentId) return;
  var entries = readPreviousAssessmentIds();
  var currentId = String(state.assessmentId || '').trim();
  if (!currentId) return;
  if (entries.indexOf(currentId) === -1) {
    entries.unshift(currentId);
    if (entries.length > 50) entries.length = 50;
    savePreviousAssessmentIds(entries);
    state.previousAssessmentIds = entries;
    renderPreviousAssessmentOptions();
  }
}
