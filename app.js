import { state } from './modules/state.js';
import { els } from './modules/dom.js';
import { setSaveStatus, updateButtons, renderCurrentPayloadJson, renderOptionTargetRows, updateProgress, restart, goBack, copyCurrentId, applyMissingRuleSelection, saveMissingRuleCase } from './modules/runner.js';
import { setEditorMode, openCurrentPayloadEditor, closeEditor, openCreatePayloadPanel, closeCreatePayloadPanel, createPayloadFromDraft, openTreeViewCreatePayloadPanel, handlePayloadFormInput, handlePayloadFormClick, deleteCurrentPayload, renameCurrentPayloadId, applyCurrentPayloadEdits, closeIconPicker, chooseIconForScope, cancelValidationWarningModal, proceedValidationWarningModal } from './modules/editor.js';
import { openTreeView, closeTreeView, autoArrangeTreeView, toggleTreeViewQuestionsOnly, filterTreeViewNodes, openTablesView, closeTablesView, handleTablesContentClick, zoomFitTreeView } from './modules/tree-view.js';
import { handleJsonFileSelected, saveTreeJson, exportReport, saveCurrentSession, readPreviousSessionIds, renderPreviousSessionOptions, openSessionsModal, closeSessionsModal, exportSessionsJson, handleImportSessionsFile, generateSessionId } from './modules/file-ops.js';

init();

function init() {
  bindEvents();
  updateButtons();
  state.previousSessionIds = readPreviousSessionIds();
  renderPreviousSessionOptions();
  renderCurrentPayloadJson(null);
  renderOptionTargetRows(null);
  updateProgress();
  setSaveStatus('');
  setEditorMode('form');
  renderBuildId();
}

function renderBuildId() {
  var el = document.getElementById('buildId');
  if (!el) return;
  var ts = window.BUILD_TIMESTAMP;
  var commit = window.BUILD_COMMIT;
  if (!ts) return;
  var d = new Date(ts);
  var pad = function(n) { return String(n).padStart(2, '0'); };
  var label = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())
    + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  if (commit) label += ' · ' + commit;
  el.textContent = 'Build: ' + label;
}

function bindEvents() {
  els.jsonFileInput.addEventListener('change', handleJsonFileSelected);
  var commentEl = document.getElementById('nodeComment');
  if (commentEl) {
    commentEl.addEventListener('input', function () {
      if (state.currentNodeId) {
        state.comments[state.currentNodeId] = commentEl.value;
      }
    });
  }
  if (els.saveTreeBtn) els.saveTreeBtn.addEventListener('click', saveTreeJson);
els.restartBtn.addEventListener('click', restart);
  els.backBtn.addEventListener('click', goBack);
  els.restartResultBtn.addEventListener('click', restart);
  els.backResultBtn.addEventListener('click', goBack);
  els.copyNodeIdBtn.addEventListener('click', copyCurrentId);
  els.editNodeBtn.addEventListener('click', openCurrentPayloadEditor);
  els.closeEditorBtn.addEventListener('click', closeEditor);
  els.editorFormTab.addEventListener('click', function () { setEditorMode('form'); });
  els.editorRawTab.addEventListener('click', function () { setEditorMode('raw'); });
  els.nodeEditorForm.addEventListener('input', function () { handlePayloadFormInput('edit'); });
  els.nodeEditorForm.addEventListener('change', function () { handlePayloadFormInput('edit'); });
  els.nodeEditorForm.addEventListener('click', function (event) { handlePayloadFormClick(event, 'edit'); });
  els.createPayloadForm.addEventListener('input', function () { handlePayloadFormInput('create'); });
  els.createPayloadForm.addEventListener('change', function () { handlePayloadFormInput('create'); });
  els.createPayloadForm.addEventListener('click', function (event) { handlePayloadFormClick(event, 'create'); });
  els.openCreateQuestionBtn.addEventListener('click', function () { openCreatePayloadPanel('node'); });
  els.openCreateResultBtn.addEventListener('click', function () { openCreatePayloadPanel('result'); });
  els.closeCreatePayloadBtn.addEventListener('click', closeCreatePayloadPanel);
  els.createPayloadBtn.addEventListener('click', createPayloadFromDraft);
  els.editorModalOverlay.addEventListener('click', function (e) { if (e.target === els.editorModalOverlay) closeEditor(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (els.iconPickerOverlay && !els.iconPickerOverlay.classList.contains('hidden')) { closeIconPicker(); return; }
      if (els.validationWarningOverlay && !els.validationWarningOverlay.classList.contains('hidden')) { cancelValidationWarningModal(); return; }
      if (!els.editorModalOverlay.classList.contains('hidden')) { closeEditor(); return; }
      if (!els.treeViewOverlay.classList.contains('hidden')) { closeTreeView(); return; }
      if (els.sessionsModalOverlay && !els.sessionsModalOverlay.classList.contains('hidden')) { closeSessionsModal(); return; }
    }
  });
  els.deletePayloadBtn.addEventListener('click', deleteCurrentPayload);
  els.renamePayloadBtn.addEventListener('click', renameCurrentPayloadId);
  els.applyNodeEditsBtn.addEventListener('click', function () { applyCurrentPayloadEdits(false); });
  els.applyAndSaveNodeEditsBtn.addEventListener('click', function () { applyCurrentPayloadEdits(true); });
  els.exportReportBtn.addEventListener('click', exportReport);
  if (els.sessionsBtn) els.sessionsBtn.addEventListener('click', openSessionsModal);
  if (els.closeSessionsBtn) els.closeSessionsBtn.addEventListener('click', closeSessionsModal);
  if (els.saveSessionModalBtn) els.saveSessionModalBtn.addEventListener('click', saveCurrentSession);
  if (els.exportSessionsBtn) els.exportSessionsBtn.addEventListener('click', exportSessionsJson);
  if (els.importSessionsInput) els.importSessionsInput.addEventListener('change', handleImportSessionsFile);
  if (els.sessionsModalOverlay) els.sessionsModalOverlay.addEventListener('click', function (e) { if (e.target === els.sessionsModalOverlay) closeSessionsModal(); });
  els.showSchemaBtn.addEventListener('click', openSchemaModal);
  els.closeSchemaBtn.addEventListener('click', closeSchemaModal);
  els.openTreeViewBtn.addEventListener('click', openTreeView);
  els.miniTreeCard.addEventListener('click', openTreeView);
  els.miniTreeCard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTreeView();
    }
  });
  els.supersedesSessionInput.addEventListener('input', function () { state.supersedesSessionId = els.supersedesSessionInput.value.trim(); });
  if (els.newSessionIdBtn) els.newSessionIdBtn.addEventListener('click', function () {
    state.sessionId = generateSessionId();
    els.sessionIdInput.value = state.sessionId;
  });
  if (els.clearSessionMetaBtn) els.clearSessionMetaBtn.addEventListener('click', function () {
    els.assessorInitialsInput.value = '';
    els.stationNumberInput.value = '';
    els.stationNameInput.value = '';
    els.supersedesSessionInput.value = '';
    state.supersedesSessionId = '';
  });
  els.treeViewCloseBtn.addEventListener('click', closeTreeView);
  els.treeViewOverlay.addEventListener('click', function (e) { if (e.target === els.treeViewOverlay) closeTreeView(); });
  els.treeViewCreateQuestionBtn.addEventListener('click', function () { openTreeViewCreatePayloadPanel('node'); });
  els.treeViewCreateResultBtn.addEventListener('click', function () { openTreeViewCreatePayloadPanel('result'); });
  els.treeViewAutoArrangeBtn.addEventListener('click', autoArrangeTreeView);
  els.treeViewZoomFitBtn.addEventListener('click', zoomFitTreeView);
  els.treeViewQuestionsOnlyBtn.addEventListener('click', toggleTreeViewQuestionsOnly);
  els.treeViewSearchInput.addEventListener('input', function () { filterTreeViewNodes(els.treeViewSearchInput.value); });
  els.applyMissingRuleBtn.addEventListener('click', applyMissingRuleSelection);
  els.saveMissingRuleBtn.addEventListener('click', saveMissingRuleCase);
  els.openTablesBtn.addEventListener('click', openTablesView);
  els.tablesCloseBtn.addEventListener('click', closeTablesView);
  els.tablesOverlay.addEventListener('click', function (e) { if (e.target === els.tablesOverlay) closeTablesView(); });
  els.tablesContent.addEventListener('click', handleTablesContentClick);
  if (els.iconPickerCloseBtn) els.iconPickerCloseBtn.addEventListener('click', closeIconPicker);
  if (els.iconPickerClearBtn) els.iconPickerClearBtn.addEventListener('click', function () { chooseIconForScope('', state.iconPickerScope || 'edit'); closeIconPicker(); });
  if (els.iconPickerOverlay) els.iconPickerOverlay.addEventListener('click', function (e) { if (e.target === els.iconPickerOverlay) closeIconPicker(); });
  if (els.iconPickerGrid) els.iconPickerGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-icon]');
    if (!btn || !els.iconPickerGrid.contains(btn)) return;
    var icon = btn.getAttribute('data-icon') || '';
    chooseIconForScope(icon, state.iconPickerScope || 'edit');
    closeIconPicker();
  });
  if (els.validationWarningCancelBtn) els.validationWarningCancelBtn.addEventListener('click', cancelValidationWarningModal);
  if (els.validationWarningCancelBtnFooter) els.validationWarningCancelBtnFooter.addEventListener('click', cancelValidationWarningModal);
  if (els.validationWarningProceedBtn) els.validationWarningProceedBtn.addEventListener('click', proceedValidationWarningModal);
  if (els.validationWarningOverlay) els.validationWarningOverlay.addEventListener('click', function (e) { if (e.target === els.validationWarningOverlay) cancelValidationWarningModal(); });
}

async function openSchemaModal() {
  if (!els.treeSchemaText) return;
  els.treeSchemaText.textContent = 'Loading schema…';
  try {
    var resp = await fetch('tree_schema.json?' + Date.now());
    if (!resp.ok) throw new Error('tree_schema.json not found');
    var schema = await resp.json();
    els.treeSchemaText.textContent = JSON.stringify(schema, null, 2);
  } catch (err) {
    els.treeSchemaText.textContent = '// Could not load tree_schema.json: ' + (err && err.message ? err.message : 'fetch failed');
  }
  if (els.schemaModalOverlay) els.schemaModalOverlay.classList.remove('hidden');
  setTimeout(function () { if (els.closeSchemaBtn) els.closeSchemaBtn.focus(); }, 0);
}

function closeSchemaModal() {
  if (els.schemaModalOverlay) els.schemaModalOverlay.classList.add('hidden');
}
