import { state } from './state.js';
import { els } from './dom.js';
import { ICON_CHOICES } from './constants.js';
import { clone, escapeHtml, escapeAttr, uniqueStrings } from './utils.js';
import { validateTree, validateSingleNode, validateSingleResult, getTreeValidationWarnings, formatTreeValidationWarningSummary } from './validation.js';
// Circular imports resolved via ES module live bindings.
import { renderNode, renderResult, updateButtons, clearMissingRuleForm, hideResultView, setSaveStatus } from './assessment.js';
import { refreshTreeView, refreshMiniTreeView, syncMiniTreeView, highlightCurrentTreeViewPayload, refreshTablesViewIfOpen, highlightCurrentMiniTreePayload } from './tree-view.js';
import { saveTreeJson, appendChangeLog } from './file-ops.js';

var pendingValidationProceed = null;
var pendingValidationCancel = null;

// --- State-dependent utilities (used primarily by the editor) ---

export function getScopePayload(scope) { return scope === 'create' ? state.createDraft : state.editorDraft; }

export function targetExists(targetId) { return !!(state.tree && targetId && (state.tree.nodes[targetId] || state.tree.results[targetId])); }

export function idExistsElsewhere(id) { return !!(state.tree && id && (state.tree.nodes[id] || state.tree.results[id])); }

export function suggestNextId(prefix) {
  if (!state.tree) return prefix + '_1';
  var all = Object.keys(state.tree.nodes).concat(Object.keys(state.tree.results));
  var index = 1;
  var candidate = prefix + '_' + index;
  while (all.indexOf(candidate) !== -1) { index += 1; candidate = prefix + '_' + index; }
  return candidate;
}

export function getTargetChoices() {
  if (!state.tree) return [];
  var choices = [];
  Object.keys(state.tree.nodes).sort().forEach(function (id) { choices.push({ id: id, label: id + ' — Question node' }); });
  Object.keys(state.tree.results).sort().forEach(function (id) { choices.push({ id: id, label: id + ' — Result' }); });
  return choices;
}

// --- Payload editor opening ---

export function openPayloadEditorForId(payloadId) {
  var payload = state.tree && (state.tree.nodes[payloadId] || state.tree.results[payloadId]);
  if (!payload) return;
  if (state.tree.nodes[payloadId]) {
    state.currentMode = 'node';
    state.currentPayload = payload;
    state.currentNodeId = payloadId;
    state.currentResult = null;
  } else {
    state.currentMode = 'result';
    state.currentPayload = payload;
    state.currentResult = payload;
  }
  openCurrentPayloadEditor();
}

export function openCurrentPayloadEditor() {
  if (!state.currentPayload) return;
  state.editorSurfaceMode = 'edit';
  state.editorDraft = clone(state.currentPayload);
  state.editorDraftBaseline = clone(state.currentPayload);
  els.editorModalTitle.textContent = state.currentMode === 'node' ? 'Edit current node' : 'Edit current result';
  els.deletePayloadBtn.textContent = state.currentMode === 'node' ? 'Delete this node' : 'Delete this result';
  els.editorMessage.textContent = '';
  els.editorMessage.className = 'footnote editor-message-top';
  els.nodeEditorText.value = JSON.stringify(state.editorDraft, null, 2);
  renderPayloadForm('edit');
  setEditorMode('form');
  closeCreatePayloadPanel({ force: true });
  setEditorSurfaceMode('edit');
  els.editorModalOverlay.classList.remove('hidden');
  updateEditorDirtyState();
  setTimeout(function () {
    var first = els.nodeEditorForm.querySelector('input:not([readonly]), textarea, select');
    if (first) first.focus();
  }, 0);
}

// --- Tree-view create panel (opened from tree view toolbar) ---

export function openTreeViewCreatePayloadPanel(mode) {
  if (!state.tree) return;
  state.editorSurfaceMode = 'create-only';
  state.editorDraft = null;
  state.editorDraftBaseline = null;
  state.createMode = mode === 'result' ? 'result' : 'node';
  state.createDraft = buildCreateDraft(state.createMode);
  state.createDraftBaseline = clone(state.createDraft);
  dockRenameButton();
  hideValidationSummary('edit');
  els.editorMessage.textContent = '';
  els.editorMessage.className = 'footnote editor-message-top';
  els.editorModalTitle.textContent = state.createMode === 'node' ? 'Create new question node' : 'Create new result node';
  setEditorSurfaceMode('create-only');
  openCreatePayloadPanel(state.createMode, { source: 'tree-view' });
  els.editorModalOverlay.classList.remove('hidden');
}

// --- Editor close / mode ---

export function closeEditor(options) {
  if (!canDismissEditor(options)) return;
  performCloseEditor();
}

export function setEditorMode(mode) {
  var wasRaw = state.editorMode === 'raw';
  state.editorMode = mode === 'raw' ? 'raw' : 'form';
  var isForm = state.editorMode === 'form';
  if (isForm && wasRaw && els.nodeEditorText) {
    try {
      var parsed = JSON.parse(els.nodeEditorText.value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state.editorDraft = parsed;
    } catch (_e) { /* leave editorDraft unchanged if raw JSON is invalid */ }
  }
  els.editorFormTab.classList.toggle('active', isForm);
  els.editorRawTab.classList.toggle('active', !isForm);
  els.nodeEditorForm.classList.toggle('hidden', !isForm);
  els.nodeEditorRawWrap.classList.toggle('hidden', isForm);
  if (isForm) renderPayloadForm('edit');
  if (isForm) renderValidationSummary('edit'); else hideValidationSummary('edit');
  updateEditorDirtyState();
}

export function openCreatePayloadPanel(mode, options) {
  if (!state.tree) return;
  var opts = options || {};
  state.createMode = mode === 'result' ? 'result' : 'node';
  state.createDraft = buildCreateDraft(state.createMode);
  state.createDraftBaseline = clone(state.createDraft);
  els.createPayloadTitle.textContent = state.createMode === 'node' ? 'Create new question node' : 'Create new result node';
  els.editorModalTitle.textContent = state.createMode === 'node' ? 'Create new question node' : 'Create new result node';
  els.createPayloadMessage.textContent = '';
  els.createPayloadMessage.className = 'footnote';
  if (opts.source !== 'tree-view') {
    state.editorSurfaceMode = 'combined';
    setEditorSurfaceMode('combined');
  }
  els.createPayloadPanel.classList.remove('hidden');
  renderPayloadForm('create');
  updateEditorDirtyState();
  setTimeout(function () {
    var first = els.createPayloadForm.querySelector('input, textarea, select');
    if (first) first.focus();
  }, 0);
}

export function closeCreatePayloadPanel(options) {
  var opts = options || {};
  if (!opts.force && !canDismissCreatePanel()) return;
  if (state.editorSurfaceMode === 'create-only' && !opts.force) {
    closeEditor({ force: true });
    return;
  }
  state.createDraft = null;
  state.createDraftBaseline = null;
  state.createMode = null;
  els.createPayloadPanel.classList.add('hidden');
  els.createPayloadForm.innerHTML = '';
  els.createPayloadMessage.textContent = '';
  hideValidationSummary('create');
  if (state.editorSurfaceMode === 'combined') {
    state.editorSurfaceMode = 'edit';
    setEditorSurfaceMode('edit');
  }
  updateEditorDirtyState();
}

export function performCloseEditor() {
  els.editorModalOverlay.classList.add('hidden');
  dockRenameButton();
  els.editorMessage.textContent = '';
  els.editorMessage.className = 'footnote editor-message-top';
  hideValidationSummary('edit');
  closeCreatePayloadPanel({ force: true });
  state.editorDraft = null;
  state.editorDraftBaseline = null;
  state.editorSurfaceMode = 'edit';
  setEditorSurfaceMode('edit');
  updateEditorDirtyState();
}

export function setEditorSurfaceMode(mode) {
  var surfaceMode = mode === 'create-only' ? 'create-only' : (mode === 'combined' ? 'combined' : 'edit');
  state.editorSurfaceMode = surfaceMode;
  var showEditSurface = surfaceMode !== 'create-only';
  [
    els.editorFormTab,
    els.editorRawTab,
    els.editorValidationSummary,
    els.nodeEditorForm,
    els.nodeEditorRawWrap,
    els.openCreateQuestionBtn,
    els.openCreateResultBtn,
    els.deletePayloadBtn,
    els.applyNodeEditsBtn,
    els.applyAndSaveNodeEditsBtn,
    els.renamePayloadBtn,
    els.editorMessage
  ].forEach(function (el) {
    if (!el) return;
    el.classList.toggle('hidden', !showEditSurface);
  });
  var toolbar = els.applyNodeEditsBtn ? els.applyNodeEditsBtn.closest('.editor-toolbar') : null;
  if (toolbar) toolbar.classList.toggle('hidden', !showEditSurface);
  var tabs = els.editorFormTab ? els.editorFormTab.closest('.editor-tabs') : null;
  if (tabs) tabs.classList.toggle('hidden', !showEditSurface);
}

// --- Dirty / unsaved change detection ---

export function hasUnsavedTreeChanges() {
  return !!(state.tree && state.lastTreeSnapshot && JSON.stringify(state.tree) !== state.lastTreeSnapshot);
}

export function hasCreateDraftChanges() {
  if (!state.createDraft || !state.createDraftBaseline) return false;
  return JSON.stringify(state.createDraft) !== JSON.stringify(state.createDraftBaseline);
}

export function readCurrentEditorDraftSafely() {
  if (!state.currentPayload) return null;
  if (state.editorMode === 'raw') {
    try {
      return JSON.parse(els.nodeEditorText.value);
    } catch (_err) {
      return { __invalidJson: true, raw: els.nodeEditorText.value };
    }
  }
  return clone(state.editorDraft);
}

export function hasEditDraftChanges() {
  if (!state.currentPayload || !state.editorDraftBaseline) return false;
  var draft = readCurrentEditorDraftSafely();
  if (!draft) return false;
  if (draft.__invalidJson) return String(draft.raw || '').trim() !== JSON.stringify(state.currentPayload, null, 2).trim();
  return JSON.stringify(draft) !== JSON.stringify(state.currentPayload);
}

export function getEditorPendingChangeSummary() {
  var parts = [];
  if (hasEditDraftChanges()) parts.push('You have unapplied edits in this modal.');
  if (hasCreateDraftChanges()) parts.push('You have an unfinished new node/result in this modal.');
  if (hasUnsavedTreeChanges()) parts.push('The live tree has changes that have not been saved to tree.json.');
  return parts;
}

export function canDismissCreatePanel() {
  if (!hasCreateDraftChanges()) return true;
  return window.confirm('Discard this new node/result draft?');
}

export function canDismissEditor(options) {
  var opts = options || {};
  if (opts.force) return true;
  var parts = getEditorPendingChangeSummary();
  if (!parts.length) return true;
  return window.confirm(parts.join('\n') + '\n\nClose anyway?');
}

export function updateEditorDirtyState() {
  var modal = els.editorModal;
  var modalDirty = !!(hasEditDraftChanges() || hasCreateDraftChanges() || hasUnsavedTreeChanges());
  if (modal) modal.classList.toggle('modal-dirty', modalDirty);
  if (els.createPayloadPanel) els.createPayloadPanel.classList.toggle('editor-subpanel-dirty', hasCreateDraftChanges());
}

export function buildCreateDraft(mode) {
  return mode === 'node'
    ? { id: suggestNextId('NODE'), question: '', note: '', options: [{ label: '', next: '' }] }
    : { id: suggestNextId('RESULT'), title: '', rationale: '' };
}

// --- Form rendering ---

export function renderPayloadForm(scope) {
  var root = scope === 'create' ? els.createPayloadForm : els.nodeEditorForm;
  var payload = getScopePayload(scope);
  var mode = scope === 'create' ? state.createMode : state.currentMode;
  if (!root || !payload || !mode) {
    if (root) root.innerHTML = '';
    dockRenameButton();
    return;
  }
  root.innerHTML = buildPayloadFormHtml(scope, mode, payload, scope === 'create');
  attachRenameButton(scope);
  renderValidationSummary(scope);
  if (scope === 'edit') els.nodeEditorText.value = JSON.stringify(state.editorDraft, null, 2);
}

export function attachRenameButton(scope) {
  if (!els.renamePayloadBtn) return;
  if (scope !== 'edit') { dockRenameButton(); return; }
  var mount = els.nodeEditorForm ? els.nodeEditorForm.querySelector('[data-rename-button-mount="edit"]') : null;
  if (!mount) { dockRenameButton(); return; }
  els.renamePayloadBtn.classList.remove('hidden');
  mount.appendChild(els.renamePayloadBtn);
}

export function dockRenameButton() {
  if (!els.renamePayloadBtn) return;
  var dock = document.getElementById('renamePayloadBtnDock');
  if (!dock) return;
  els.renamePayloadBtn.classList.add('hidden');
  dock.appendChild(els.renamePayloadBtn);
}

// --- Form HTML builders ---

export function buildPayloadFormHtml(scope, mode, payload, isCreate) {
  var html = '';
  html += '<div class="editor-grid">';
  html += buildIdField(scope, payload.id || '', !isCreate, isCreate ? 'Must be unique across nodes and results.' : 'Locked to protect incoming references.', !isCreate);
  html += buildIconField(scope, payload.icon || '', 'Optional');
  html += '</div>';
  if (mode === 'node') {
    html += buildTextAreaField(scope, 'question', 'Question', payload.question || '', 'Question text');
    html += buildTextAreaField(scope, 'note', 'Note', payload.note || '', 'Optional internal note');
    html += '<section class="editor-block">';
    html += '<div class="editor-row-head"><div class="editor-row-title">Answer options</div><div class="editor-block-actions"><button type="button" class="btn-small" data-action="add-option" data-scope="' + scope + '">Add option</button></div></div>';
    html += '<div class="editor-list">';
    (payload.options || []).forEach(function (option, index) { html += buildOptionRow(scope, option, index, payload.options.length); });
    html += '</div></section>';
  } else {
    html += buildField(scope, 'title', 'Title', payload.title || '', false, 'Recommendation title');
    html += buildTextAreaField(scope, 'rationale', 'Rationale', payload.rationale || '', 'Explanation shown to the user');
    html += buildCheckboxField(scope, 'isMissingRule', 'Treat as missing rule result', !!payload.isMissingRule, 'Use this when no exact recommendation exists for this path. In result view, users will be told the case is unresolved and can map it to an existing result or save it for follow-up.');
  }
  html += '<section class="editor-block">';
  html += '<div class="editor-row-head"><div class="editor-row-title">Support links</div><div class="editor-block-actions"><button type="button" class="btn-small" data-action="add-link" data-scope="' + scope + '">Add link</button></div></div>';
  html += '<div class="editor-list">';
  (Array.isArray(payload.links) ? payload.links : []).forEach(function (link, index) { html += buildLinkRow(scope, link, index); });
  html += '</div><div class="editor-help">Links are optional. URL is required if a link row exists.</div></section>';
  return html;
}

export function buildField(scope, name, label, value, readonly, help) {
  return '<div class="editor-field">' +
    '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
    '<input id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" type="text" value="' + escapeAttr(value || '') + '"' + (readonly ? ' readonly' : '') + ' />' +
    (help ? '<div class="editor-help">' + escapeHtml(help) + '</div>' : '') +
    '</div>';
}

export function buildIdField(scope, value, readonly, help, showRenameButton) {
  var mount = showRenameButton ? '<div class="editor-inline-action" data-rename-button-mount="' + scope + '"></div>' : '';
  return '<div class="editor-field editor-field-inline">' +
    '<label for="' + scope + '_editor_id">ID</label>' +
    '<div class="editor-input-with-action">' +
      '<input id="' + scope + '_editor_id" data-scope="' + scope + '" data-field="id" type="text" value="' + escapeAttr(value || '') + '"' + (readonly ? ' readonly' : '') + ' />' +
      mount +
    '</div>' +
    (help ? '<div class="editor-help">' + escapeHtml(help) + '</div>' : '') +
    '</div>';
}

export function buildIconField(scope, value, help) {
  var html = '<div class="editor-field icon-picker-field">';
  html += '<label for="' + scope + '_editor_icon">Icon</label>';
  html += '<div class="icon-picker-row">';
  html += '<input id="' + scope + '_editor_icon" data-scope="' + scope + '" data-field="icon" type="text" value="' + escapeAttr(value || '') + '" placeholder="Emoji or symbol" />';
  html += '<div class="editor-button-row">';
  html += '<button type="button" class="btn-small" data-action="open-icon-picker" data-scope="' + scope + '">Change icon</button>';
  html += '<button type="button" class="btn-small" data-action="choose-icon" data-scope="' + scope + '" data-icon="">Clear</button>';
  html += '</div>';
  html += '</div>';
  if (help) html += '<div class="editor-help">' + escapeHtml(help) + ' Click "Change icon" to pick from a palette, or type your own.</div>';
  html += '</div>';
  return html;
}

export function buildTextAreaField(scope, name, label, value, placeholder) {
  return '<div class="editor-field">' +
    '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
    '<textarea id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" placeholder="' + escapeAttr(placeholder || '') + '">' + escapeHtml(value || '') + '</textarea>' +
    '</div>';
}

export function buildCheckboxField(scope, name, label, checked, help) {
  return '<div class="editor-field">' +
    '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
    '<div class="editor-checkbox-wrap">' +
      '<input id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" type="checkbox" ' + (checked ? 'checked' : '') + ' />' +
    '</div>' +
    (help ? '<div class="editor-help">' + escapeHtml(help) + '</div>' : '') +
    '</div>';
}

export function buildOptionRow(scope, option, index, total) {
  return '<div class="editor-row">' +
    '<div class="editor-row-head"><div class="editor-row-title">Option ' + (index + 1) + '</div><div class="editor-row-actions">' +
    '<button type="button" class="btn-small" data-action="move-option-up" data-scope="' + scope + '" data-index="' + index + '" ' + (index === 0 ? 'disabled' : '') + '>Up</button>' +
    '<button type="button" class="btn-small" data-action="move-option-down" data-scope="' + scope + '" data-index="' + index + '" ' + (index === total - 1 ? 'disabled' : '') + '>Down</button>' +
    '<button type="button" class="btn-small" data-action="remove-option" data-scope="' + scope + '" data-index="' + index + '">Remove</button>' +
    '</div></div>' +
    '<div class="editor-row-grid">' +
    '<div class="editor-field"><label>Label</label><input data-scope="' + scope + '" data-option-field="label" data-index="' + index + '" type="text" value="' + escapeAttr(option && option.label || '') + '" /></div>' +
    '<div class="editor-field"><label>Next target</label>' + buildTargetSelect(scope, index, option && option.next || '') + '<div class="editor-help">Question nodes and results are both listed.</div></div>' +
    '</div></div>';
}

export function buildTargetSelect(scope, index, value) {
  var options = '<option value="">Select target…</option>';
  getTargetChoices().forEach(function (item) {
    options += '<option value="' + escapeAttr(item.id) + '"' + (item.id === String(value || '') ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
  });
  return '<select data-scope="' + scope + '" data-option-field="next" data-index="' + index + '">' + options + '</select>';
}

export function buildLinkRow(scope, link, index) {
  return '<div class="editor-row">' +
    '<div class="editor-row-head"><div class="editor-row-title">Link ' + (index + 1) + '</div><div class="editor-row-actions"><button type="button" class="btn-small" data-action="remove-link" data-scope="' + scope + '" data-index="' + index + '">Remove</button></div></div>' +
    '<div class="editor-grid">' +
    '<div class="editor-field"><label>Label</label><input data-scope="' + scope + '" data-link-field="label" data-index="' + index + '" type="text" value="' + escapeAttr(link && link.label || '') + '" /></div>' +
    '<div class="editor-field"><label>URL</label><input data-scope="' + scope + '" data-link-field="url" data-index="' + index + '" type="text" value="' + escapeAttr(link && link.url || '') + '" /></div>' +
    '</div></div>';
}

// --- Form event handlers ---

export function handlePayloadFormInput(scope) {
  syncScopeDraftFromForm(scope);
  renderValidationSummary(scope);
  if (scope === 'edit' && state.editorDraft) els.nodeEditorText.value = JSON.stringify(state.editorDraft, null, 2);
  updateEditorDirtyState();
}

export function handlePayloadFormClick(event, scope) {
  var btn = event.target.closest('button[data-action][data-scope="' + scope + '"]');
  if (!btn) return;
  event.preventDefault();
  syncScopeDraftFromForm(scope);
  var payload = getScopePayload(scope);
  if (!payload) return;
  var action = btn.getAttribute('data-action');
  var index = Number(btn.getAttribute('data-index'));
  if (action === 'open-icon-picker') { openIconPicker(scope); return; }
  if (action === 'add-option') {
    if (!Array.isArray(payload.options)) payload.options = [];
    payload.options.push({ label: '', next: '' });
    renderPayloadForm(scope);
    focusLastOption(scope);
    return;
  }
  if (action === 'remove-option') {
    if (Array.isArray(payload.options)) payload.options.splice(index, 1);
    renderPayloadForm(scope);
    return;
  }
  if (action === 'move-option-up' || action === 'move-option-down') {
    if (!Array.isArray(payload.options)) return;
    var swapIndex = action === 'move-option-up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= payload.options.length) return;
    var tmp = payload.options[index]; payload.options[index] = payload.options[swapIndex]; payload.options[swapIndex] = tmp;
    renderPayloadForm(scope);
    return;
  }
  if (action === 'add-link') {
    if (!Array.isArray(payload.links)) payload.links = [];
    payload.links.push({ label: '', url: '' });
    renderPayloadForm(scope);
    return;
  }
  if (action === 'choose-icon') { var icon = btn.getAttribute('data-icon') || ''; chooseIconForScope(icon, scope); return; }
  if (action === 'remove-link') {
    if (Array.isArray(payload.links)) payload.links.splice(index, 1);
    renderPayloadForm(scope);
  }
}

export function focusLastOption(scope) {
  var root = scope === 'create' ? els.createPayloadForm : els.nodeEditorForm;
  var fields = root.querySelectorAll('[data-option-field="label"]');
  if (fields.length) fields[fields.length - 1].focus();
}

export function syncScopeDraftFromForm(scope) {
  var root = scope === 'create' ? els.createPayloadForm : els.nodeEditorForm;
  var mode = scope === 'create' ? state.createMode : state.currentMode;
  var payload = getScopePayload(scope);
  if (!root || !payload || !mode) return;
  if (scope === 'create') payload.id = readFieldValue(root, 'id');
  payload.icon = readFieldValue(root, 'icon');
  if (!payload.icon) delete payload.icon;
  if (mode === 'node') {
    payload.question = readFieldValue(root, 'question');
    var note = readFieldValue(root, 'note');
    if (note) payload.note = note; else delete payload.note;
    payload.options = [];
    var optionMap = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-option-field]'), function (el) {
      var idx = Number(el.getAttribute('data-index'));
      if (!optionMap[idx]) optionMap[idx] = { label: '', next: '' };
      optionMap[idx][el.getAttribute('data-option-field')] = el.value;
    });
    Object.keys(optionMap).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (key) {
      payload.options.push({ label: String(optionMap[key].label || '').trim(), next: String(optionMap[key].next || '').trim() });
    });
  } else {
    payload.title = readFieldValue(root, 'title');
    payload.rationale = readFieldValue(root, 'rationale');
    if (!payload.rationale) delete payload.rationale;
    var checkbox = root.querySelector('[data-field="isMissingRule"]');
    if (checkbox && checkbox.checked) payload.isMissingRule = true; else delete payload.isMissingRule;
  }
  var linkMap = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-link-field]'), function (el) {
    var idx = Number(el.getAttribute('data-index'));
    if (!linkMap[idx]) linkMap[idx] = { label: '', url: '' };
    linkMap[idx][el.getAttribute('data-link-field')] = el.value;
  });
  var links = [];
  Object.keys(linkMap).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (key) {
    var link = { label: String(linkMap[key].label || '').trim(), url: String(linkMap[key].url || '').trim() };
    if (link.label || link.url) links.push(link);
  });
  if (links.length) payload.links = links; else delete payload.links;
}

export function readFieldValue(root, fieldName) {
  var field = root.querySelector('[data-field="' + fieldName + '"]');
  return field ? String(field.value || '').trim() : '';
}

// --- Icon picker ---

export function openIconPicker(scope) {
  state.iconPickerScope = scope === 'create' ? 'create' : 'edit';
  renderIconPickerGrid(scope);
  if (els.iconPickerOverlay) {
    els.iconPickerOverlay.classList.remove('hidden');
    setTimeout(function () { if (els.iconPickerCloseBtn) els.iconPickerCloseBtn.focus(); }, 0);
  }
}

export function closeIconPicker() {
  if (els.iconPickerOverlay) els.iconPickerOverlay.classList.add('hidden');
}

export function renderIconPickerGrid(scope) {
  if (!els.iconPickerGrid) return;
  var payload = getScopePayload(scope);
  var current = payload && payload.icon ? String(payload.icon) : '';
  var html = '';
  ICON_CHOICES.forEach(function (icon) {
    var active = String(icon) === current ? ' active' : '';
    html += '<button type="button" class="icon-picker-swatch' + active + '" data-icon="' + escapeAttr(icon) + '" aria-label="' + escapeAttr(icon) + '">' + escapeHtml(icon) + '</button>';
  });
  els.iconPickerGrid.innerHTML = html;
}

export function chooseIconForScope(icon, scope) {
  var payload = getScopePayload(scope);
  if (!payload) return;
  if (icon) payload.icon = icon; else delete payload.icon;
  renderPayloadForm(scope);
  updateEditorDirtyState();
}

// --- Validation summary ---

export function renderValidationSummary(scope) {
  var payload = getScopePayload(scope);
  var mode = scope === 'create' ? state.createMode : state.currentMode;
  var summary = scope === 'create' ? els.createValidationSummary : els.editorValidationSummary;
  if (!summary || !payload || !mode) return;
  var errors = getPayloadValidationErrors(payload, mode, scope === 'create');
  var warnings = getPayloadValidationWarnings(payload, mode, scope === 'create');
  if (state.tree) {
    try {
      var previewTree = clone(state.tree);
      if (scope === 'create') {
        if (mode === 'node') previewTree.nodes[payload.id] = clone(payload);
        else previewTree.results[payload.id] = clone(payload);
      } else {
        if (mode === 'node') previewTree.nodes[state.currentPayload.id] = clone(payload);
        else previewTree.results[state.currentPayload.id] = clone(payload);
      }
      warnings = uniqueStrings(warnings.concat(getTreeValidationWarnings(previewTree) || []));
    } catch (_err) {
      warnings = uniqueStrings(warnings);
    }
  }
  if (!errors.length && !warnings.length) { hideValidationSummary(scope); return; }
  var html = '';
  if (errors.length) {
    html += '<strong>Fix before apply:</strong><ul class="editor-errors">' + errors.map(function (msg) { return '<li>' + escapeHtml(msg) + '</li>'; }).join('') + '</ul>';
  }
  if (warnings.length) {
    html += '<strong>Warnings if you apply now:</strong><ul class="editor-errors">' + warnings.map(function (msg) { return '<li>' + escapeHtml(msg) + '</li>'; }).join('') + '</ul>';
  }
  summary.innerHTML = html;
  summary.classList.remove('hidden');
}

export function hideValidationSummary(scope) {
  var summary = scope === 'create' ? els.createValidationSummary : els.editorValidationSummary;
  if (!summary) return;
  summary.innerHTML = '';
  summary.classList.add('hidden');
}

export function getPayloadValidationErrors(payload, mode, isCreate) {
  var errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['Payload must be an object.'];
  var payloadId = String(payload.id || '').trim();
  if (!payloadId) errors.push('ID is required.');
  if (isCreate && payloadId && idExistsElsewhere(payloadId)) errors.push("ID '" + payloadId + "' already exists.");
  if (!isCreate && payloadId !== state.currentPayload.id) errors.push("The payload id must remain '" + state.currentPayload.id + "'.");
  if (mode === 'node') {
    if (!String(payload.question || '').trim()) errors.push('Question is required.');
    if (!Array.isArray(payload.options)) errors.push('Options must be an array.');
  } else {
    if (!String(payload.title || '').trim()) errors.push('Title is required.');
  }
  if (typeof payload.links !== 'undefined' && !Array.isArray(payload.links)) errors.push('Links must be an array.');
  if (Array.isArray(payload.links)) {
    payload.links.forEach(function (link, index) {
      if (!link || typeof link !== 'object' || Array.isArray(link)) errors.push('Link ' + (index + 1) + ' must be an object.');
    });
  }
  return uniqueStrings(errors);
}

export function getPayloadValidationWarnings(payload, mode, isCreate) {
  var warnings = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return warnings;
  if (mode === 'node') {
    var options = Array.isArray(payload.options) ? payload.options : [];
    if (!options.length) warnings.push("Node '" + (payload.id || 'new node') + "' has no options.");
    options.forEach(function (option, index) {
      var label = String(option && option.label || '').trim();
      var next = String(option && option.next || '').trim();
      if (!label && !next) { warnings.push('Option ' + (index + 1) + ' is empty.'); return; }
      if (!label) warnings.push('Option ' + (index + 1) + ' is missing a label.');
      if (!next) { warnings.push("Option '" + (label || ('Option ' + (index + 1))) + "' is missing a target."); return; }
      if (state.tree && !targetExists(next) && !(isCreate && next === payload.id)) {
        warnings.push("Option '" + (label || ('Option ' + (index + 1))) + "' points to missing target '" + next + "'.");
      }
    });
  }
  if (Array.isArray(payload.links)) {
    payload.links.forEach(function (link, index) {
      var url = String(link && link.url || '').trim();
      if ((String(link && link.label || '').trim() || url) && !url) warnings.push('Link ' + (index + 1) + ' has no URL.');
    });
  }
  return uniqueStrings(warnings);
}

// --- Validation warning modal ---

export function openValidationWarningModal(config) {
  pendingValidationProceed = config && typeof config.onProceed === 'function' ? config.onProceed : null;
  pendingValidationCancel = config && typeof config.onCancel === 'function' ? config.onCancel : null;
  if (els.validationWarningTitle) els.validationWarningTitle.textContent = (config && config.title) || 'Validation warnings';
  if (els.validationWarningCopy) els.validationWarningCopy.textContent = (config && config.message) || 'Applying these changes may break the tree.';
  if (els.validationWarningList) {
    els.validationWarningList.innerHTML = ((config && config.warnings) || []).map(function (msg) { return '<li>' + escapeHtml(msg) + '</li>'; }).join('');
  }
  if (els.validationWarningOverlay) els.validationWarningOverlay.classList.remove('hidden');
  setTimeout(function () { if (els.validationWarningProceedBtn) els.validationWarningProceedBtn.focus(); }, 0);
}

export function closeValidationWarningModal() {
  if (els.validationWarningOverlay) els.validationWarningOverlay.classList.add('hidden');
}

export function cancelValidationWarningModal() {
  var onCancel = pendingValidationCancel;
  pendingValidationProceed = null;
  pendingValidationCancel = null;
  closeValidationWarningModal();
  if (typeof onCancel === 'function') onCancel();
}

export function proceedValidationWarningModal() {
  var onProceed = pendingValidationProceed;
  pendingValidationProceed = null;
  pendingValidationCancel = null;
  closeValidationWarningModal();
  if (typeof onProceed === 'function') onProceed();
}

// --- Payload apply / create / delete / rename helpers ---

export function getPreviewTreeForPayload(scope, mode, payload) {
  var previewTree = clone(state.tree);
  if (scope === 'create') {
    if (mode === 'node') previewTree.nodes[payload.id] = clone(payload);
    else previewTree.results[payload.id] = clone(payload);
  } else {
    if (mode === 'node') previewTree.nodes[state.currentPayload.id] = clone(payload);
    else previewTree.results[state.currentPayload.id] = clone(payload);
  }
  return previewTree;
}

export function setEditorError(message) {
  els.editorMessage.textContent = message;
  els.editorMessage.className = 'footnote editor-message-top bad';
}

export function findIncomingReferences(payloadId) {
  var refs = [];
  if (!state.tree || !payloadId) return refs;
  Object.keys(state.tree.nodes).forEach(function (nodeId) {
    var node = state.tree.nodes[nodeId];
    (node.options || []).forEach(function (option) {
      if (option && option.next === payloadId) refs.push({ nodeId: nodeId, optionLabel: option.label || '(unlabeled)' });
    });
  });
  return refs;
}

export function finalizeAppliedPayloadEdit(edited, saveAfter, warnings) {
  if (state.currentMode === 'node') state.tree.nodes[edited.id] = edited; else state.tree.results[edited.id] = edited;
  appendChangeLog({ type: 'payloadEdited', payloadType: state.currentMode, payloadId: edited.id, editMode: state.editorMode });
  if (state.currentMode === 'node') { state.currentPayload = edited; renderNode(); }
  else { state.currentPayload = edited; state.currentResult = edited; renderResult(edited); }
  state.editorDraft = clone(edited);
  state.editorDraftBaseline = clone(edited);
  renderPayloadForm('edit');
  refreshTreeView();
  refreshMiniTreeView();
  refreshTablesViewIfOpen();
  updateEditorDirtyState();
  els.editorMessage.textContent = 'Edits applied to the live tree.' + (warnings && warnings.length ? ' ' + formatTreeValidationWarningSummary({ nodes: state.tree.nodes, results: state.tree.results, startNode: state.tree.startNode }) : '');
  els.editorMessage.className = 'footnote editor-message-top good';
  setSaveStatus('Live tree updated. Save tree.json to persist.');
  if (saveAfter) saveTreeJson();
}

export function finalizeCreatedPayload(created, warnings) {
  if (state.createMode === 'node') state.tree.nodes[created.id] = created; else state.tree.results[created.id] = created;
  appendChangeLog({ type: 'payloadCreated', payloadType: state.createMode, payloadId: created.id });
  els.createPayloadMessage.textContent = (state.createMode === 'node' ? 'Question node ' : 'Result node ') + created.id + ' created.' + (warnings && warnings.length ? ' ' + formatTreeValidationWarningSummary(state.tree) : '');
  els.createPayloadMessage.className = 'footnote good';
  state.createDraft = buildCreateDraft(state.createMode);
  state.createDraftBaseline = clone(state.createDraft);
  renderPayloadForm('create');
  if (state.currentPayload) {
    state.editorDraft = clone(state.currentPayload);
    renderPayloadForm('edit');
  }
  refreshTreeView();
  refreshMiniTreeView();
  refreshTablesViewIfOpen();
  updateEditorDirtyState();
  setSaveStatus('Live tree updated. Save tree.json to persist.');
}

export function applyCurrentPayloadEdits(saveAfter) {
  if (!state.tree || !state.currentPayload) return;
  try {
    var edited = state.editorMode === 'form' ? clone(state.editorDraft) : JSON.parse(els.nodeEditorText.value);
    if (!edited || typeof edited !== 'object' || Array.isArray(edited)) throw new Error('Edited JSON must be an object.');
    var errors = getPayloadValidationErrors(edited, state.currentMode, false);
    if (errors.length) throw new Error(errors[0]);
    var previewTree = getPreviewTreeForPayload('edit', state.currentMode, edited);
    var warnings = uniqueStrings(getPayloadValidationWarnings(edited, state.currentMode, false).concat(getTreeValidationWarnings(previewTree)));
    var proceed = function () { finalizeAppliedPayloadEdit(edited, saveAfter, warnings); };
    if (warnings.length) {
      openValidationWarningModal({ title: 'Apply changes with warnings?', message: 'These changes may break the tree. You can cancel and fix them first, or proceed anyway.', warnings: warnings, onProceed: proceed });
      return;
    }
    proceed();
  } catch (err) {
    els.editorMessage.textContent = (err && err.message) || String(err);
    els.editorMessage.className = 'footnote editor-message-top bad';
  }
}

export function readEditorPayloadForRename(expectedId) {
  var payload = state.editorMode === 'form' ? clone(state.editorDraft) : JSON.parse(els.nodeEditorText.value);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Edited JSON must be an object.');
  if (payload.id !== expectedId) throw new Error("Apply or discard the current ID edit first. The payload id must still be '" + expectedId + "' before using Rename ID.");
  return payload;
}

export function replaceTreeReferences(oldId, newId) {
  Object.keys(state.tree.nodes).forEach(function (nodeId) {
    var node = state.tree.nodes[nodeId];
    (node.options || []).forEach(function (option) {
      if (option && option.next === oldId) option.next = newId;
    });
  });
  state.history.forEach(function (step) {
    if (step.nodeId === oldId) step.nodeId = newId;
    if (step.next === oldId) step.next = newId;
  });
  if (state.assessmentLinks[oldId]) {
    state.assessmentLinks[newId] = state.assessmentLinks[oldId];
    delete state.assessmentLinks[oldId];
  }
}

export function renameCurrentPayloadId() {
  if (!state.tree || !state.currentPayload || !state.currentPayload.id) return;
  try {
    var oldId = state.currentPayload.id;
    var payloadType = state.currentMode === 'node' ? 'node' : 'result';
    var newId = String(prompt('Enter the new ID for ' + oldId + ':', oldId) || '').trim();
    if (!newId || newId === oldId) return;
    if (idExistsElsewhere(newId)) throw new Error("ID '" + newId + "' already exists.");
    var edited = readEditorPayloadForRename(oldId);
    edited.id = newId;
    if (payloadType === 'node') validateSingleNode(edited); else validateSingleResult(edited);
    if (payloadType === 'node') {
      delete state.tree.nodes[oldId];
      state.tree.nodes[newId] = edited;
    } else {
      delete state.tree.results[oldId];
      state.tree.results[newId] = edited;
    }
    replaceTreeReferences(oldId, newId);
    if (state.tree.startNode === oldId) state.tree.startNode = newId;
    var warnings = validateTree(state.tree);
    appendChangeLog({ type: 'payloadRenamed', payloadType: payloadType, payloadId: newId, previousPayloadId: oldId, newPayloadId: newId });
    if (payloadType === 'node') {
      state.currentNodeId = newId;
      state.currentPayload = state.tree.nodes[newId];
      state.currentResult = null;
      renderNode();
    } else {
      state.currentPayload = state.tree.results[newId];
      state.currentResult = state.currentPayload;
      renderResult(state.currentPayload);
    }
    state.editorDraft = clone(state.currentPayload);
    els.nodeEditorText.value = JSON.stringify(state.editorDraft, null, 2);
    renderPayloadForm('edit');
    refreshTreeView();
    refreshMiniTreeView();
    refreshTablesViewIfOpen();
    updateEditorDirtyState();
    els.editorMessage.textContent = "Renamed '" + oldId + "' to '" + newId + "' and updated tree references." + (warnings && warnings.length ? ' ' + formatTreeValidationWarningSummary(state.tree) : '');
    els.editorMessage.className = 'footnote editor-message-top good';
    setSaveStatus("Renamed '" + oldId + "' to '" + newId + "'. Save tree.json to persist.");
  } catch (err) {
    els.editorMessage.textContent = (err && err.message) || String(err);
    els.editorMessage.className = 'footnote editor-message-top bad';
  }
}

export function deleteCurrentPayload() {
  if (!state.tree || !state.currentPayload || !state.currentPayload.id) return;
  var payloadId = state.currentPayload.id;
  var payloadType = state.currentMode === 'node' ? 'node' : 'result';
  if (payloadType === 'node' && payloadId === state.tree.startNode) {
    setEditorError('The start node cannot be deleted. Choose a different startNode first.');
    return;
  }
  var incoming = findIncomingReferences(payloadId);
  if (incoming.length) {
    setEditorError("Cannot delete '" + payloadId + "' while it is still used by: " + incoming.map(function (ref) { return ref.nodeId + " -> " + ref.optionLabel; }).join('; ') + '. Retarget or remove those options first.');
    return;
  }
  var label = payloadType === 'node' ? 'question node' : 'result';
  if (!confirm("Delete " + label + " '" + payloadId + "'? This updates the live tree only until you save tree.json.")) return;
  if (payloadType === 'node') delete state.tree.nodes[payloadId]; else delete state.tree.results[payloadId];
  try {
    var warnings = validateTree(state.tree);
    appendChangeLog({ type: 'payloadDeleted', payloadType: payloadType, payloadId: payloadId });
    state.history = [];
    state.currentNodeId = state.tree.startNode;
    state.currentMode = 'node';
    state.currentPayload = state.tree.nodes[state.tree.startNode];
    state.currentResult = null;
    closeEditor();
    clearMissingRuleForm();
    hideResultView();
    renderNode();
    refreshTreeView();
    refreshMiniTreeView();
    refreshTablesViewIfOpen();
    updateEditorDirtyState();
    setSaveStatus("Deleted '" + payloadId + "' from the live tree. Save tree.json to persist." + (warnings && warnings.length ? ' ' + formatTreeValidationWarningSummary(state.tree) : ''));
  } catch (err) {
    if (payloadType === 'node') state.tree.nodes[payloadId] = state.currentPayload;
    else state.tree.results[payloadId] = state.currentPayload;
    setEditorError((err && err.message) || String(err));
  }
}

export function createPayloadFromDraft() {
  if (!state.tree || !state.createDraft || !state.createMode) {
    console.error('Create failed: invalid state', { tree: !!state.tree, draft: state.createDraft, mode: state.createMode });
    return;
  }
  try {
    syncScopeDraftFromForm('create');
    var created = clone(state.createDraft);
    var errors = getPayloadValidationErrors(created, state.createMode, true);
    if (errors.length) throw new Error(errors[0]);
    var previewTree = getPreviewTreeForPayload('create', state.createMode, created);
    var warnings = uniqueStrings(getPayloadValidationWarnings(created, state.createMode, true).concat(getTreeValidationWarnings(previewTree)));
    var proceed = function () { finalizeCreatedPayload(created, warnings); };
    if (warnings.length) {
      openValidationWarningModal({ title: 'Create payload with warnings?', message: 'This new payload may break the tree. You can cancel and fix it first, or proceed anyway.', warnings: warnings, onProceed: proceed });
      return;
    }
    proceed();
  } catch (err) {
    els.createPayloadMessage.textContent = (err && err.message) || String(err);
    els.createPayloadMessage.className = 'footnote bad';
  }
}
