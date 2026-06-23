import { state } from './state.js';
import { els } from './dom.js';
import { STORAGE_KEY, SESSION_STORAGE_KEY, SESSION_HISTORY_KEY, DEFAULT_ICON } from './constants.js';
import { clone, escapeHtml, escapeAttr, slugify, sortKeysDeep, simpleHashFallback, downloadFile, padNumber, flashButtonText } from './utils.js';
import { validateTree, formatTreeValidationWarningSummary } from './validation.js';
import { setSaveStatus, clearMissingRuleForm, hideResultView, renderNode, renderResult } from './runner.js';
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
  state.sessionLinks = {};
  els.loadStatus.textContent = 'Loaded: ' + state.loadedFileName + (warnings && warnings.length ? ' — ' + formatTreeValidationWarningSummary(parsed) : '');
  els.toolVersion.textContent = formatRuleSetLabel(state.tree);
  els.startupNotice.classList.add('hidden');
  els.sessionMetaCard.classList.remove('hidden');
  els.currentNodeCard.classList.remove('hidden');
  clearMissingRuleForm();
  setSaveStatus('Loaded successfully. Save tree.json downloads an updated copy.');
  updateEditorDirtyState();
  hideResultView();
  startNewSession();
  renderNode();
}

export async function saveTreeJson() {
  if (!state.tree) return;
  var previousHash = state.tree.versionHash || null;
  state.tree.parentVersionHash = previousHash;
  state.tree.version = incrementVersionString(state.tree.version || 'v0.0');
  state.tree.versionHash = await computeTreeVersionHash(state.tree);
  appendChangeLog({
    type: 'treeSaved',
    treeVersion: state.tree.version,
    versionHash: state.tree.versionHash,
    parentVersionHash: previousHash
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
    .map(function (e) { return { version: e.treeVersion || '', versionHash: e.versionHash || null, parentVersionHash: e.parentVersionHash || null, savedAt: e.changedAt || '' }; });
  return JSON.stringify({ versionChain: versionChain, entries: state.changeLog }, null, 2);
}


export function getShortVersionHash(hashValue) {
  var value = String(hashValue || '').trim();
  if (!value) return '';
  return value.length > 20 ? value.slice(0, 20) + '…' : value;
}

export function formatRuleSetLabel(tree) {
  if (!tree) return 'Rule set: -';
  var parts = [tree.version || '-'];
  if (tree.versionHash) parts.push(getShortVersionHash(tree.versionHash));
  return 'Rule set: ' + parts.join(' · ');
}

export function buildVersionHashTreeSnapshot(tree) {
  var snapshot = clone(tree || {});
  delete snapshot.version;
  delete snapshot.versionHash;
  delete snapshot.parentVersionHash;
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

export function exportReport() {
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
    (state.sessionId || 'run')
  );
  downloadFile(reportHtml, fileStem + '_outcome_report.html', 'text/html');
  storeSessionMetadata();
  flashButtonText(els.exportReportBtn, 'Session + report saved');
}

export function saveCurrentSession() {
  if (!state.tree) return;
  var id = els.sessionIdInput.value || ('RUN-' + Date.now());
  var session = {
    id: id,
    savedAt: new Date().toISOString(),
    sessionId: id,
    treeTitle: state.tree.title || '',
    treeVersion: state.tree.version || '',
    treeVersionHash: state.tree.versionHash || '',
    stationNumber: els.stationNumberInput.value.trim(),
    stationName: els.stationNameInput.value.trim(),
    assessorInitials: els.assessorInitialsInput.value.trim(),
    path: state.history.map(function (step, index) { return { step: index + 1, nodeId: step.nodeId, question: step.question, answer: step.answer, comment: step.comment, next: step.next, icon: step.icon }; }),
    currentNodeId: state.currentNodeId,
    currentMode: state.currentMode,
    currentPayload: state.currentPayload
  };
  var sessions = readAllSessions();
  var existingIndex = sessions.findIndex(function (s) { return s.id === id; });
  if (existingIndex !== -1) sessions[existingIndex] = session; else sessions.push(session);
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions, null, 2));
    if (els.saveSessionModalBtn) flashButtonText(els.saveSessionModalBtn, 'Saved');
    if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'Session saved.';
    renderSessionsList();
  } catch (_err) {
    if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'Save failed.';
  }
}

export function readAllSessions() {
  try {
    var raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) { return []; }
}

export function openSessionsModal() {
  if (els.saveSessionModalBtn) els.saveSessionModalBtn.disabled = !state.tree;
  if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = '';
  renderSessionsList();
  if (els.sessionsModalOverlay) els.sessionsModalOverlay.classList.remove('hidden');
  setTimeout(function () { if (els.closeSessionsBtn) els.closeSessionsBtn.focus(); }, 0);
}

export function closeSessionsModal() {
  if (els.sessionsModalOverlay) els.sessionsModalOverlay.classList.add('hidden');
}

export function renderSessionsList() {
  if (!els.sessionsListContainer) return;
  var sessions = readAllSessions().slice().sort(function (a, b) {
    return new Date(b.savedAt) - new Date(a.savedAt);
  });
  if (!sessions.length) {
    els.sessionsListContainer.innerHTML = '<p class="sessions-empty">No saved sessions yet.</p>';
    return;
  }
  els.sessionsListContainer.innerHTML = '';
  var list = document.createElement('div');
  list.className = 'sessions-list';
  sessions.forEach(function (session) {
    var item = document.createElement('div');
    item.className = 'session-item';
    var header = document.createElement('div');
    header.className = 'session-item-header';
    var left = document.createElement('div');
    var idEl = document.createElement('div');
    idEl.className = 'session-item-id';
    idEl.textContent = session.id || session.sessionId || '—';
    var metaParts = [];
    if (session.treeTitle) metaParts.push(session.treeTitle);
    if (session.treeVersion) metaParts.push(session.treeVersion);
    if (session.stationNumber) metaParts.push('Station ' + session.stationNumber);
    if (session.stationName) metaParts.push(session.stationName);
    if (session.assessorInitials) metaParts.push(session.assessorInitials);
    if (session.savedAt) metaParts.push(new Date(session.savedAt).toLocaleString());
    var metaEl = document.createElement('div');
    metaEl.className = 'session-item-meta';
    metaEl.textContent = metaParts.join(' · ');
    left.appendChild(idEl);
    left.appendChild(metaEl);
    var actions = document.createElement('div');
    actions.className = 'session-item-actions';
    var loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn-small';
    loadBtn.textContent = 'Load';
    loadBtn.disabled = !state.tree;
    loadBtn.addEventListener('click', function () { loadSession(session); });
    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-small';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      if (confirm('Delete session ' + (session.id || session.sessionId) + '?')) {
        deleteSession(session.id || session.sessionId);
      }
    });
    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(left);
    header.appendChild(actions);
    item.appendChild(header);
    var stepCount = Array.isArray(session.path) ? session.path.length : 0;
    var stepsEl = document.createElement('div');
    stepsEl.className = 'session-item-meta';
    stepsEl.textContent = stepCount + ' step' + (stepCount === 1 ? '' : 's') + ' · ' + (session.currentMode === 'result' ? 'Reached outcome' : 'In progress');
    item.appendChild(stepsEl);
    list.appendChild(item);
  });
  els.sessionsListContainer.appendChild(list);
}

export function deleteSession(id) {
  var sessions = readAllSessions().filter(function (s) { return (s.id || s.sessionId) !== id; });
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions, null, 2));
  } catch (_err) { }
  renderSessionsList();
}

export function loadSession(session) {
  if (!state.tree) {
    if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'Load a tree.json first.';
    return;
  }
  if (session.treeVersionHash && state.tree.versionHash && session.treeVersionHash !== state.tree.versionHash) {
    if (!confirm('This session was saved with a different tree version (' + (session.treeVersion || '?') + ' vs current ' + (state.tree.version || '?') + '). Loading may not match exactly. Continue?')) return;
  }
  state.comments = {};
  (session.path || []).forEach(function (step) {
    if (step.nodeId && step.comment) state.comments[step.nodeId] = step.comment;
  });
  state.sessionId = session.sessionId || session.id || '';
  state.supersedesSessionId = session.supersedesSessionId || '';
  state.sessionLinks = {};
  if (els.assessorInitialsInput) els.assessorInitialsInput.value = session.assessorInitials || '';
  if (els.stationNumberInput) els.stationNumberInput.value = session.stationNumber || '';
  if (els.stationNameInput) els.stationNameInput.value = session.stationName || '';
  renderSessionMetadata();
  state.history = (session.path || []).map(function (step) {
    return { nodeId: step.nodeId, question: step.question, answer: step.answer, next: step.next, icon: step.icon || DEFAULT_ICON, comment: step.comment || '' };
  });
  if (session.currentMode === 'result') {
    var lastStep = state.history[state.history.length - 1];
    var resultId = lastStep && lastStep.next && state.tree.results[lastStep.next] ? lastStep.next : null;
    var result = resultId ? state.tree.results[resultId] : (session.currentPayload || null);
    state.currentNodeId = session.currentNodeId || state.tree.startNode;
    if (result) { renderResult(result); } else { renderNode(); }
  } else {
    state.currentNodeId = session.currentNodeId || state.tree.startNode;
    renderNode();
  }
  closeSessionsModal();
}

export function exportSessionsJson() {
  var sessions = readAllSessions();
  downloadFile(JSON.stringify({ sessions: sessions }, null, 2), 'sessions.json', 'application/json');
}

export function handleImportSessionsFile(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var parsed = JSON.parse(e.target.result);
      var incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.sessions) ? parsed.sessions : []);
      if (!incoming.length) {
        if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'No sessions found in file.';
        return;
      }
      var existing = readAllSessions();
      incoming.forEach(function (s) {
        var sid = s.id || s.sessionId;
        var idx = existing.findIndex(function (ex) { return (ex.id || ex.sessionId) === sid; });
        if (idx !== -1) existing[idx] = s; else existing.push(s);
      });
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(existing, null, 2));
      renderSessionsList();
      if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'Imported ' + incoming.length + ' session' + (incoming.length === 1 ? '' : 's') + '.';
    } catch (err) {
      if (els.sessionsModalMessage) els.sessionsModalMessage.textContent = 'Import failed: ' + err.message;
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

export function buildReportHtml(meta) {
  var dateText = meta.generatedAt.toLocaleString();
  var supersedesText = state.supersedesSessionId ? escapeHtml(state.supersedesSessionId) : '-';
  var rows = state.history.map(function (step, index) {
    var answerHtml = escapeHtml(step.answer);
    if (state.tree && state.tree.nodes && state.tree.nodes[step.nodeId]) {
      var node = state.tree.nodes[step.nodeId];
      var linkRows = [];
      if (Array.isArray(node.links)) {
        node.links.forEach(function (link, linkIndex) {
          var saved = state.sessionLinks && state.sessionLinks[node.id] ? state.sessionLinks[node.id][linkIndex] : '';
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
  var riskScoreBlock = '';
  if (state.currentResult && !state.currentResult.isMissingRule && state.tree && Array.isArray(state.tree.riskBands) && state.tree.riskBands.length) {
    var rScore = state.currentScore || 0;
    var rBand = null;
    for (var ri = 0; ri < state.tree.riskBands.length; ri++) {
      var rb = state.tree.riskBands[ri];
      if (typeof rb.max === 'undefined' || rScore <= rb.max) { rBand = rb; break; }
    }
    if (rBand) riskScoreBlock = '<p><strong>Delivery Risk Score:</strong> ' + rScore + ' — ' + escapeHtml(rBand.label) + '</p>';
  }
  var rationaleBlock = state.currentResult ? '<section class="box"><h2>Recommendation</h2><p><strong>' + escapeHtml(state.currentResult.title || 'Recommendation unavailable') + '</strong></p><p>' + escapeHtml(state.currentResult.rationale || '') + '</p>' + riskScoreBlock + '</section>' : '';
  var treeTablesBlock = '<section class="box tree-snapshot"><h2>Current tree.json snapshot</h2><p class="tree-version"><strong>Tree version:</strong> ' + escapeHtml(state.tree.version || '-') + '</p><p class="tree-version"><strong>Version hash:</strong> ' + escapeHtml(state.tree.versionHash || '-') + '</p>' + buildTreeTablesHtml({ editable: false, headingLevel: 3 }) + '</section>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<title>' + escapeHtml((state.tree.title || 'FWIN-ONSM-Matrix') + ' - ' + meta.stationName) + '</title>' +
    '<style>' + (window.REPORT_CSS || '') + '</style></head><body>' +
    '<h1>' + escapeHtml(state.tree.title || 'FWIN-ONSM-Matrix') + '</h1>' +
    '<p>Generated ' + escapeHtml(dateText) + '</p>' +
    '<section class="box"><h2>Session details</h2><div class="meta">' +
    '<div><strong>Assessor initials:</strong> ' + escapeHtml(meta.assessorInitials) + '</div>' +
    '<div><strong>Station number:</strong> ' + escapeHtml(meta.stationNumber) + '</div>' +
    '<div><strong>Station name:</strong> ' + escapeHtml(meta.stationName) + '</div>' +
    '<div><strong>Session ID:</strong> ' + escapeHtml(state.sessionId || '-') + '</div>' +
    '<div><strong>Supersedes:</strong> ' + supersedesText + '</div>' +
    '<div><strong>Rule set:</strong> ' + escapeHtml(state.tree.version || '-') + '</div>' +
    '</div></section>' +
    '<section class="box"><h2>Decision path</h2><table><thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Comments</th></tr></thead><tbody>' + rows + outcomeRow + '</tbody></table></section>' +
    rationaleBlock + treeTablesBlock + '<p class="foot">Open this report in a browser and print to PDF.</p>' + '</body></html>';
}

export function startNewSession() {
  state.sessionId = generateSessionId();
  state.supersedesSessionId = '';
  renderSessionMetadata();
}

export function generateSessionId() {
  var now = new Date();
  return 'RUN-' + padNumber(now.getFullYear(), 4) + padNumber(now.getMonth() + 1, 2) + padNumber(now.getDate(), 2) + '-' + padNumber(now.getHours(), 2) + padNumber(now.getMinutes(), 2) + padNumber(now.getSeconds(), 2) + '-' + Math.floor(1000 + Math.random() * 9000);
}

export function renderSessionMetadata() {
  if (els.sessionIdInput) els.sessionIdInput.value = state.sessionId || '';
  if (els.supersedesSessionInput) els.supersedesSessionInput.value = state.supersedesSessionId || '';
  renderPreviousSessionOptions();
}

export function renderPreviousSessionOptions() {
  if (!els.previousSessionIdsDatalist) return;
  els.previousSessionIdsDatalist.innerHTML = (state.previousSessionIds || []).map(function (id) {
    return '<option value="' + escapeAttr(id) + '"></option>';
  }).join('');
}

export function readPreviousSessionIds() {
  try {
    var raw = localStorage.getItem(SESSION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}

export function savePreviousSessionIds(ids) {
  try {
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(ids));
  } catch (_err) {
    // ignore storage failures
  }
}

export function storeSessionMetadata() {
  if (!state.sessionId) return;
  var entries = readPreviousSessionIds();
  var currentId = String(state.sessionId || '').trim();
  if (!currentId) return;
  if (entries.indexOf(currentId) === -1) {
    entries.unshift(currentId);
    if (entries.length > 50) entries.length = 50;
    savePreviousSessionIds(entries);
    state.previousSessionIds = entries;
    renderPreviousSessionOptions();
  }
}
