(function () {
  'use strict';

  var STORAGE_KEY = 'floodDecisionTool_unresolvedCases';
  var SESSION_STORAGE_KEY = 'floodDecisionTool_analysisSessions';
  var ASSESSMENT_HISTORY_KEY = 'floodDecisionTool_assessmentHistory';
  var DEFAULT_ICON = '?';
  var ICON_CHOICES = ['❓', '🧭', '⚠️', '🌊', '🛠️', '🏗️', '📄', '🧱', '💰', '👀', '✅', '🚧', '📌', '🛰️', '🔧', '📍', '🗺️', '🧪', '📊', '📈', '📉', '📝', '📚', '🧰', '🪛', '🔩', '⛏️', '🪜', '🛡️', '🚨', '🔥', '💧', '🌧️', '⛈️', '🌫️', '🌱', '🏞️', '🏠', '🏢', '🛣️', '🚦', '🚜', '🚤', '🛶', '⛵', '🪙', '📡', '🖥️', '⌛', '⏱️', '🔍', '🧠', '🗂️', '📦', '📞', '📬', '🔒', '🔓', '🧯', '🪪'];
  var LINK_ENABLE_OPTION_LABEL = 'links-can-be-added-to-this-node';

  var state = {
    tree: null,
    currentNodeId: null,
    history: [],
    currentMode: 'node',
    currentPayload: null,
    currentResult: null,
    loadedFileName: 'tree.json',
    editorMode: 'form',
    editorDraft: null,
    createDraft: null,
    createMode: null,
    lastTreeSnapshot: null,
    assessmentLinks: {},
    assessmentId: '',
    supersedesAssessmentId: '',
    previousAssessmentIds: [],
    iconPickerScope: null,
    editorSurfaceMode: 'edit',
    editorDraftBaseline: null,
    createDraftBaseline: null
  };

  var els = {
    jsonFileInput: document.getElementById('jsonFileInput'),
    saveTreeBtn: document.getElementById('saveTreeBtn'),
    forkTreeBtn: document.getElementById('forkTreeBtn'),
    saveSessionBtn: document.getElementById('saveSessionBtn'),
    showSchemaBtn: document.getElementById('showSchemaBtn'),
    schemaModalOverlay: document.getElementById('schemaModalOverlay'),
    closeSchemaBtn: document.getElementById('closeSchemaBtn'),
    treeSchemaText: document.getElementById('treeSchemaText'),
    loadStatus: document.getElementById('loadStatus'),
    saveStatus: document.getElementById('saveStatus'),
    startupNotice: document.getElementById('startupNotice'),
    toolVersion: document.getElementById('toolVersion'),
    assessmentMetaCard: document.getElementById('assessmentMetaCard'),
    assessorInitialsInput: document.getElementById('assessorInitialsInput'),
    stationNumberInput: document.getElementById('stationNumberInput'),
    stationNameInput: document.getElementById('stationNameInput'),
    questionView: document.getElementById('questionView'),
    resultView: document.getElementById('resultView'),
    progressSummaryQ: document.getElementById('progressSummaryQ'),
    progressRemainingQ: document.getElementById('progressRemainingQ'),
    progressFillQ: document.getElementById('progressFillQ'),
    progressSummaryR: document.getElementById('progressSummaryR'),
    progressRemainingR: document.getElementById('progressRemainingR'),
    progressFillR: document.getElementById('progressFillR'),
    questionText: document.getElementById('questionText'),
    questionIcon: document.getElementById('questionIcon'),
    supportLinks: document.getElementById('supportLinks'),
    optionTargetGrid: document.getElementById('optionTargetGrid'),
    emptyTargets: document.getElementById('emptyTargets'),
    restartBtn: document.getElementById('restartBtn'),
    backBtn: document.getElementById('backBtn'),
    restartResultBtn: document.getElementById('restartResultBtn'),
    backResultBtn: document.getElementById('backResultBtn'),
    resultBox: document.getElementById('resultBox'),
    resultRecommendation: document.getElementById('resultRecommendation'),
    resultRationale: document.getElementById('resultRationale'),
    missingRuleBox: document.getElementById('missingRuleBox'),
    missingRuleSelect: document.getElementById('missingRuleSelect'),
    missingRuleText: document.getElementById('missingRuleText'),
    applyMissingRuleBtn: document.getElementById('applyMissingRuleBtn'),
    saveMissingRuleBtn: document.getElementById('saveMissingRuleBtn'),
    missingRuleSaveMessage: document.getElementById('missingRuleSaveMessage'),
    currentNodeCard: document.getElementById('currentNodeCard'),
    currentNodeIdPill: document.getElementById('currentNodeIdPill'),
    currentNodeJson: document.getElementById('currentNodeJson'),
    copyNodeIdBtn: document.getElementById('copyNodeIdBtn'),
    editNodeBtn: document.getElementById('editNodeBtn'),
    pathTableBody: document.getElementById('pathTableBody'),
    emptyTrail: document.getElementById('emptyTrail'),
    exportAssessmentBtn: document.getElementById('exportAssessmentBtn'),
    miniTreeCard: document.getElementById('miniTreeCard'),
    miniTreeCanvas: document.getElementById('miniTreeCanvas'),
    miniTreeCurrentPill: document.getElementById('miniTreeCurrentPill'),
    editorModalOverlay: document.getElementById('editorModalOverlay'),
    editorModal: document.getElementById('editorModal'),
    editorModalTitle: document.getElementById('editorModalTitle'),
    editorFormTab: document.getElementById('editorFormTab'),
    editorRawTab: document.getElementById('editorRawTab'),
    editorValidationSummary: document.getElementById('editorValidationSummary'),
    nodeEditorForm: document.getElementById('nodeEditorForm'),
    nodeEditorRawWrap: document.getElementById('nodeEditorRawWrap'),
    nodeEditorText: document.getElementById('nodeEditorText'),
    openCreateQuestionBtn: document.getElementById('openCreateQuestionBtn'),
    openCreateResultBtn: document.getElementById('openCreateResultBtn'),
    createPayloadPanel: document.getElementById('createPayloadPanel'),
    createPayloadTitle: document.getElementById('createPayloadTitle'),
    closeCreatePayloadBtn: document.getElementById('closeCreatePayloadBtn'),
    createValidationSummary: document.getElementById('createValidationSummary'),
    createPayloadForm: document.getElementById('createPayloadForm'),
    createPayloadMessage: document.getElementById('createPayloadMessage'),
    createPayloadBtn: document.getElementById('createPayloadBtn'),
    editorMessage: document.getElementById('editorMessage'),
    closeEditorBtn: document.getElementById('closeEditorBtn'),
    deletePayloadBtn: document.getElementById('deletePayloadBtn'),
    renamePayloadBtn: document.getElementById('renamePayloadBtn'),
    applyNodeEditsBtn: document.getElementById('applyNodeEditsBtn'),
    applyAndSaveNodeEditsBtn: document.getElementById('applyAndSaveNodeEditsBtn'),
    assessmentIdInput: document.getElementById('assessmentIdInput'),
    supersedesAssessmentInput: document.getElementById('supersedesAssessmentInput'),
    previousAssessmentIdsDatalist: document.getElementById('previousAssessmentIds'),
    openTreeViewBtn: document.getElementById('openTreeViewBtn'),
    openTablesBtn: document.getElementById('openTablesBtn'),
    treeViewOverlay: document.getElementById('treeViewOverlay'),
    treeViewCanvas: document.getElementById('treeViewCanvas'),
    treeViewCloseBtn: document.getElementById('treeViewCloseBtn'),
    treeViewCreateQuestionBtn: document.getElementById('treeViewCreateQuestionBtn'),
    treeViewCreateResultBtn: document.getElementById('treeViewCreateResultBtn'),
    treeViewQuestionsOnlyBtn: document.getElementById('treeViewQuestionsOnlyBtn'),
    treeViewAutoArrangeBtn: document.getElementById('treeViewAutoArrangeBtn'),
    treeViewZoomFitBtn: document.getElementById('treeViewZoomFitBtn'),
    treeViewSearchInput: document.getElementById('treeViewSearchInput'),
    tablesOverlay: document.getElementById('tablesOverlay'),
    tablesCloseBtn: document.getElementById('tablesCloseBtn'),
    tablesContent: document.getElementById('tablesContent'),
    iconPickerOverlay: document.getElementById('iconPickerOverlay'),
    iconPickerGrid: document.getElementById('iconPickerGrid'),
    iconPickerCloseBtn: document.getElementById('iconPickerCloseBtn'),
    iconPickerClearBtn: document.getElementById('iconPickerClearBtn'),
    validationWarningOverlay: document.getElementById('validationWarningOverlay'),
    validationWarningTitle: document.getElementById('validationWarningTitle'),
    validationWarningCopy: document.getElementById('validationWarningCopy'),
    validationWarningList: document.getElementById('validationWarningList'),
    validationWarningCancelBtn: document.getElementById('validationWarningCancelBtn'),
    validationWarningCancelBtnFooter: document.getElementById('validationWarningCancelBtnFooter'),
    validationWarningProceedBtn: document.getElementById('validationWarningProceedBtn')
  };

  init();

  function init() {
    bindEvents();
    updateButtons();
    state.previousAssessmentIds = readPreviousAssessmentIds();
    renderPreviousAssessmentOptions();
    renderCurrentPayloadJson(null);
    renderOptionTargetRows(null);
    updateProgress();
    setSaveStatus('');
    setEditorMode('form');
  }

  function bindEvents() {
    els.jsonFileInput.addEventListener('change', handleJsonFileSelected);
    if (els.saveTreeBtn) els.saveTreeBtn.addEventListener('click', saveTreeJson);
    if (els.forkTreeBtn) els.forkTreeBtn.addEventListener('click', forkCurrentTreeBranch);
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
      }
    });
    els.deletePayloadBtn.addEventListener('click', deleteCurrentPayload);
    els.renamePayloadBtn.addEventListener('click', renameCurrentPayloadId);
    els.applyNodeEditsBtn.addEventListener('click', function () { applyCurrentPayloadEdits(false); });
    els.applyAndSaveNodeEditsBtn.addEventListener('click', function () { applyCurrentPayloadEdits(true); });
    els.exportAssessmentBtn.addEventListener('click', exportAssessmentReport);
    els.saveSessionBtn.addEventListener('click', saveCurrentSession);
    els.showSchemaBtn.addEventListener('click', openSchemaModal);
    els.closeSchemaBtn.addEventListener('click', closeSchemaModal);
      // Built-in fallback schema (used when running from file:// where fetch is blocked)
      var FALLBACK_TREE_SCHEMA = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Decision Tree Schema v2",
        "type": "object",
        "required": [
          "startNode",
          "nodes",
          "results"
        ],
        "properties": {
          "title": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "versionHash": {
            "type": "string"
          },
          "parentVersionHash": {
            "type": [
              "string",
              "null"
            ]
          },
          "branchId": {
            "type": "string"
          },
          "startNode": {
            "type": "string",
            "description": "Must match a node ID"
          },
          "nodes": {
            "type": "object",
            "description": "Map of nodeId -> node",
            "additionalProperties": {
              "$ref": "#/definitions/node"
            }
          },
          "results": {
            "type": "object",
            "description": "Map of resultId -> result",
            "additionalProperties": {
              "$ref": "#/definitions/result"
            }
          },
          "changeLog": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/changeLogEntry"
            }
          },
          "layout": {
            "type": "object",
            "description": "Optional saved tree-view layout positions.",
            "additionalProperties": true,
            "properties": {
              "positions": {
                "type": "object",
                "additionalProperties": {
                  "type": "object",
                  "required": ["x", "y"],
                  "properties": {
                    "x": { "type": "number" },
                    "y": { "type": "number" }
                  }
                }
              }
            }
          }
        },
        "definitions": {
          "node": {
            "type": "object",
            "required": [
              "id",
              "question",
              "options"
            ],
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string"
              },
              "question": {
                "type": "string"
              },
              "note": {
                "type": "string"
              },
              "icon": {
                "type": "string"
              },
              "options": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "$ref": "#/definitions/option"
                }
              },
              "links": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "label",
                    "url"
                  ],
                  "additionalProperties": false,
                  "properties": {
                    "label": {
                      "type": "string"
                    },
                    "url": {
                      "type": "string",
                      "format": "uri"
                    }
                  }
                }
              }
            }
          },
          "option": {
            "type": "object",
            "required": [
              "label",
              "next"
            ],
            "additionalProperties": false,
            "properties": {
              "label": {
                "type": "string"
              },
              "next": {
                "type": "object",
                "required": [
                  "type",
                  "id"
                ],
                "additionalProperties": false,
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": [
                      "node",
                      "result"
                    ]
                  },
                  "id": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "result": {
            "type": "object",
            "required": [
              "id",
              "title"
            ],
            "additionalProperties": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "icon": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "rationale": {
                "type": "string"
              },
              "isMissingRule": {
                "type": "boolean"
              }
            }
          },
          "changeLogEntry": {
            "type": "object",
            "required": [
              "changedAt",
              "type"
            ],
            "additionalProperties": true,
            "properties": {
              "changedAt": {
                "type": "string",
                "format": "date-time"
              },
              "type": {
                "type": "string",
                "enum": [
                  "payloadEdited",
                  "payloadDeleted",
                  "payloadCreated",
                  "payloadRenamed",
                  "missingRuleMappedToExistingResult",
                  "treeForked",
                  "treeSaved"
                ]
              },
              "payloadType": {
                "type": "string",
                "enum": [
                  "node",
                  "result"
                ]
              },
              "payloadId": {
                "type": "string"
              },
              "editMode": {
                "type": "string"
              },
              "treeVersion": {
                "type": "string"
              },
              "versionHash": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "parentVersionHash": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "branchId": {
                "type": "string"
              }
            }
          }
        }
      };

      async function openSchemaModal() {
        if (!els.treeSchemaText) return;
        els.treeSchemaText.textContent = 'Loading schema…';
        var usedFallback = false;
        if (location.protocol === 'file:') {
          usedFallback = true;
          els.treeSchemaText.textContent = JSON.stringify(FALLBACK_TREE_SCHEMA, null, 2);
        } else {
          try {
            var resp = await fetch('tree_schema.json', { cache: 'no-cache' });
            if (!resp.ok) throw new Error('tree_schema.json not found');
            var schema = await resp.json();
            els.treeSchemaText.textContent = JSON.stringify(schema, null, 2);
          } catch (err) {
            usedFallback = true;
            els.treeSchemaText.textContent = JSON.stringify(FALLBACK_TREE_SCHEMA, null, 2) +
              "\n\n// Note: Could not load tree_schema.json (" + (err && err.message ? err.message : 'fetch failed') + ").\n// You're likely opening this HTML directly from your file system. Browsers block fetch() in file:// pages.\n// To load the external file, serve this folder via a local web server.";
          }
        }
        if (els.schemaModalOverlay) els.schemaModalOverlay.classList.remove('hidden');
        // Small accessibility nicety: move focus to the close button
        setTimeout(function(){ if (els.closeSchemaBtn) els.closeSchemaBtn.focus(); }, 0);
      }
      function closeSchemaModal() {
        if (els.schemaModalOverlay) els.schemaModalOverlay.classList.add('hidden');
      }

    els.openTreeViewBtn.addEventListener('click', openTreeView);
    els.miniTreeCard.addEventListener('click', openTreeView);
    els.miniTreeCard.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTreeView();
      }
    });
    els.supersedesAssessmentInput.addEventListener('input', function () { state.supersedesAssessmentId = els.supersedesAssessmentInput.value.trim(); });
    els.treeViewCloseBtn.addEventListener('click', closeTreeView);
    els.treeViewOverlay.addEventListener('click', function (e) { if (e.target === els.treeViewOverlay) closeTreeView(); });
    els.treeViewCreateQuestionBtn.addEventListener('click', function () { openTreeViewCreatePayloadPanel('node'); });
    els.treeViewCreateResultBtn.addEventListener('click', function () { openTreeViewCreatePayloadPanel('result'); });
    els.treeViewAutoArrangeBtn.addEventListener('click', autoArrangeTreeView);
    els.treeViewZoomFitBtn.addEventListener('click', function () { if (treeViewCy) treeViewCy.fit(treeViewCy.elements(':visible'), 40); });
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

  var treeViewCy = null;
  var treeViewSelectedId = null;
  var treeViewQuestionsOnly = false;
  var pendingValidationProceed = null;
  var pendingValidationCancel = null;
  function openTreeView() {
    if (!state.tree) {
      alert('Load a tree first to view the full map.');
      return;
    }
    if (!window.cytoscape) {
      alert('Tree View requires Cytoscape to load. Check your internet connection.');
      return;
    }
    ensureTreeLayoutState(state.tree);
    els.treeViewOverlay.classList.remove('hidden');
    setTimeout(function () {
      refreshTreeView();
      els.treeViewSearchInput.focus();
    }, 0);
  }
  function closeTreeView() {
    els.treeViewOverlay.classList.add('hidden');
    treeViewSelectedId = null;
    treeViewQuestionsOnly = false;
    els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
    els.treeViewQuestionsOnlyBtn.style.borderColor = '';
    if (treeViewCy) {
      treeViewCy.elements().removeClass('tree-selected tree-match tree-dim tree-path tree-path-current edge-path');
    }
  }
  function openTreeViewCreatePayloadPanel(mode) {
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
  function openTablesView() {
    if (!state.tree) {
      alert('Load a tree first to view the tables.');
      return;
    }
    renderTreeTables();
    els.tablesOverlay.classList.remove('hidden');
  }
  function closeTablesView() {
    els.tablesOverlay.classList.add('hidden');
  }
  function handleTablesContentClick(event) {
    var row = event.target.closest('tr[data-payload-id]');
    if (!row || !els.tablesContent.contains(row)) return;
    openPayloadEditorForId(row.getAttribute('data-payload-id'));
  }
  function renderTreeTables() {
    els.tablesContent.innerHTML = buildTreeTablesHtml({ editable: true, headingLevel: 3 });
  }
  function buildTreeTablesHtml(options) {
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
  function buildTreeTableRowAttrs(payloadId, editable) {
    return editable ? ' class="editable-table-row" data-payload-id="' + escapeAttr(payloadId) + '"' : '';
  }
  function refreshTablesViewIfOpen() {
    if (state.tree && !els.tablesOverlay.classList.contains('hidden')) renderTreeTables();
  }
  function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function (s) { return map[s]; });
  }
  function buildIncomingMapForTree(tree) {
    var incoming = {};
    if (!tree || !tree.nodes) return incoming;
    Object.keys(tree.nodes).forEach(function (nodeId) {
      var node = tree.nodes[nodeId];
      if (!node || !Array.isArray(node.options)) return;
      node.options.forEach(function (option) {
        var targetId = option && typeof option.next !== 'undefined' ? String(option.next || '').trim() : '';
        if (!targetId) return;
        if (!incoming[targetId]) incoming[targetId] = 0;
        incoming[targetId] += 1;
      });
    });
    return incoming;
  }
  function getOrphanNodeIds(tree) {
    if (!tree || !tree.nodes || !tree.startNode) return [];
    var incoming = buildIncomingMapForTree(tree);
    return Object.keys(tree.nodes).filter(function (id) {
      return id !== tree.startNode && !incoming[id];
    }).sort();
  }
  function getTreeValidationWarnings(tree) {
    if (!tree) return [];
    var warnings = [];
    getOrphanNodeIds(tree).forEach(function (id) {
      warnings.push("Orphan node '" + id + "' has no incoming references.");
    });
    Object.keys(tree.nodes || {}).forEach(function (nodeId) {
      var node = tree.nodes[nodeId] || {};
      if (!Array.isArray(node.options) || node.options.length === 0) {
        warnings.push("Node '" + nodeId + "' has no options.");
        return;
      }
      node.options.forEach(function (option, index) {
        var label = String(option && option.label || '').trim();
        var next = String(option && option.next || '').trim();
        if (!label && !next) {
          warnings.push("Node '" + nodeId + "' has an empty option row at position " + (index + 1) + ".");
          return;
        }
        if (!label) warnings.push("Node '" + nodeId + "' option " + (index + 1) + " is missing a label.");
        if (!next) {
          warnings.push("Node '" + nodeId + "' option '" + (label || ('Option ' + (index + 1))) + "' is missing a target.");
          return;
        }
        if (!tree.nodes[next] && !tree.results[next]) {
          warnings.push("Node '" + nodeId + "' option '" + (label || ('Option ' + (index + 1))) + "' points to missing target '" + next + "'.");
        }
      });
    });
    return uniqueStrings(warnings);
  }
  function ensureTreeLayoutState(tree) {
    if (!tree) return;
    if (!tree.layout || typeof tree.layout !== 'object' || Array.isArray(tree.layout)) tree.layout = {};
    if (!tree.layout.positions || typeof tree.layout.positions !== 'object' || Array.isArray(tree.layout.positions)) tree.layout.positions = {};
  }
  function getStoredTreePositions(tree) {
    var positions = {};
    if (!tree || !tree.layout || !tree.layout.positions) return positions;
    Object.keys(tree.layout.positions).forEach(function (id) {
      var pos = tree.layout.positions[id];
      if (!pos || typeof pos !== 'object') return;
      var x = Number(pos.x);
      var y = Number(pos.y);
      if (!isFinite(x) || !isFinite(y)) return;
      positions[id] = { x: x, y: y };
    });
    return positions;
  }
  function persistTreeViewPositions(options) {
    if (!state.tree || !treeViewCy) return;
    ensureTreeLayoutState(state.tree);
    var positions = {};
    treeViewCy.nodes().forEach(function (node) {
      var pos = node.position();
      positions[node.id()] = { x: Number(pos.x.toFixed(2)), y: Number(pos.y.toFixed(2)) };
    });
    state.tree.layout.positions = positions;
    if (options && options.silent) return;
    setSaveStatus((options && options.message) || 'Tree layout updated. Save tree.json to persist.');
  }
  function getTreeViewLayoutRoots() {
    var orphanIds = getOrphanNodeIds(state.tree);
    return [state.tree.startNode].concat(orphanIds.filter(function (id) { return id !== state.tree.startNode; }));
  }
  function runAutoArrangeLayout(options) {
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
  function autoArrangeTreeView() {
    if (!treeViewCy || !state.tree) return;
    runAutoArrangeLayout({ fit: true, persistMessage: 'Tree auto-arranged. Save tree.json to persist.' });
  }
  function initTreeView() {
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
  function refreshTreeView() {
    if (!state.tree) return;
    treeViewQuestionsOnly = false;
    els.treeViewQuestionsOnlyBtn.style.backgroundColor = '';
    els.treeViewQuestionsOnlyBtn.style.borderColor = '';
    els.treeViewSearchInput.value = '';
    ensureTreeLayoutState(state.tree);
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
  function orientTreeViewLeftToRight() {
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
  function buildTreeViewElements() {
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
  function getDecisionPathState() {
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
  function updateTreeViewDecisionPathHighlight() {
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
  function refreshMiniTreeView() {
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
  function getCurrentPayloadId() {
    return state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
  }
  function buildMiniTreePositions(width, height) {
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
  function buildMiniTreeDepthPositions(width, height) {
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
  function normalizeMiniTreePositions(sourcePositions, width, height) {
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
  function selectTreeViewNode(nodeId) {
    treeViewSelectedId = nodeId;
    if (!treeViewCy) return;
    treeViewCy.nodes().removeClass('tree-selected');
    var node = treeViewCy.getElementById(nodeId);
    if (node) node.addClass('tree-selected');
    updateTreeViewDecisionPathHighlight();
  }
  function clearTreeViewSelection() {
    treeViewSelectedId = null;
    if (treeViewCy) treeViewCy.nodes().removeClass('tree-selected');
  }
  function highlightCurrentTreeViewPayload() {
    var currentId = state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
    if (currentId) selectTreeViewNode(currentId);
    updateTreeViewDecisionPathHighlight();
  }
  function highlightCurrentMiniTreePayload() {
    var currentId = state.currentPayload && state.currentPayload.id ? state.currentPayload.id : state.currentNodeId;
    if (els.miniTreeCurrentPill) els.miniTreeCurrentPill.textContent = currentId || '-';
  }
  function syncMiniTreeView() {
    if (!state.tree) {
      if (els.miniTreeCurrentPill) els.miniTreeCurrentPill.textContent = '-';
      return;
    }
    refreshMiniTreeView();
  }
  function openPayloadEditorForId(payloadId) {
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
  function filterTreeViewNodes(query) {
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
  function toggleTreeViewQuestionsOnly() {
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
    if (treeViewQuestionsOnly) resultNodes.hide(); else resultNodes.show();
    treeViewCy.fit(treeViewCy.elements(':visible'), 40);
  }
  function handleJsonFileSelected(event) {
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

  function loadTreeFromText(fileName, rawText) {
    var parsed = JSON.parse(rawText);
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

  function validateTree(tree) {
    if (!tree || typeof tree !== 'object' || Array.isArray(tree)) throw new Error('JSON root must be an object.');
    if (!tree.startNode) throw new Error("Missing 'startNode'.");
    if (!tree.nodes || typeof tree.nodes !== 'object' || Array.isArray(tree.nodes)) throw new Error("Missing or invalid 'nodes'.");
    if (!tree.results || typeof tree.results !== 'object' || Array.isArray(tree.results)) throw new Error("Missing or invalid 'results'.");
    if (!tree.nodes[tree.startNode]) throw new Error("startNode '" + tree.startNode + "' does not exist in nodes.");

    var seenIds = new Set();
    Object.keys(tree.nodes).forEach(function (key) {
      var node = tree.nodes[key];
      validateSingleNode(node);
      if (node.id !== key) throw new Error("Node key '" + key + "' does not match node.id '" + node.id + "'.");
      if (seenIds.has(node.id)) throw new Error("Duplicate payload id '" + node.id + "'.");
      seenIds.add(node.id);
    });
    Object.keys(tree.results).forEach(function (key) {
      var result = tree.results[key];
      validateSingleResult(result);
      if (result.id !== key) throw new Error("Result key '" + key + "' does not match result.id '" + result.id + "'.");
      if (seenIds.has(result.id)) throw new Error("Duplicate payload id '" + result.id + "'.");
      seenIds.add(result.id);
    });
    Object.values(tree.nodes).forEach(function (node) {
      node.options.forEach(function (option) {
        if (!tree.nodes[option.next] && !tree.results[option.next]) {
          throw new Error("Node '" + node.id + "' option '" + option.label + "' points to missing target '" + option.next + "'.");
        }
      });
    });
    return getTreeValidationWarnings(tree);
  }

  function validateSingleNode(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error('Each node must be an object.');
    if (!node.id) throw new Error("Each node must have an 'id'.");
    if (!String(node.question || '').trim()) throw new Error("Node '" + node.id + "' is missing 'question'.");
    if (!Array.isArray(node.options)) throw new Error("Node '" + node.id + "' is missing 'options' array.");
    if (node.options.length === 0) throw new Error("Node '" + node.id + "' must have at least one option.");
    var seenLabels = new Set();
    node.options.forEach(function (option, idx) {
      if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error("Node '" + node.id + "' option " + (idx + 1) + ' must be an object.');
      var label = String(option.label || '').trim();
      var next = String(option.next || '').trim();
      if (!label) throw new Error("Node '" + node.id + "' option " + (idx + 1) + " is missing 'label'.");
      if (!next) throw new Error("Node '" + node.id + "' option '" + label + "' is missing 'next'.");
      if (seenLabels.has(label.toLowerCase())) throw new Error("Node '" + node.id + "' has duplicate option label '" + label + "'.");
      seenLabels.add(label.toLowerCase());
    });
    validateLinks(node);
  }

  function validateSingleResult(result) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Each result must be an object.');
    if (!result.id) throw new Error("Each result must have an 'id'.");
    if (!String(result.title || '').trim()) throw new Error("Result '" + result.id + "' is missing 'title'.");
    if (typeof result.rationale !== 'undefined' && typeof result.rationale !== 'string') throw new Error("Result '" + result.id + "' has invalid 'rationale'.");
    validateLinks(result);
  }

  function validateLinks(payload) {
    if (typeof payload.links === 'undefined') return;
    if (!Array.isArray(payload.links)) throw new Error("Payload '" + payload.id + "' has invalid 'links'. Use an array.");
    payload.links.forEach(function (link, idx) {
      if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error("Payload '" + payload.id + "' link " + (idx + 1) + ' must be an object.');
      if (typeof link.url !== 'undefined' && link.url !== null && typeof link.url !== 'string') {
        throw new Error("Payload '" + payload.id + "' link " + (idx + 1) + " has invalid 'url'.");
      }
    });
  }

  function restart() {
    if (!state.tree) return;
    state.currentNodeId = state.tree.startNode;
    state.history = [];
    state.currentMode = 'node';
    state.currentPayload = state.tree.nodes[state.tree.startNode];
    state.currentResult = null;
    state.assessmentLinks = {};
    clearMissingRuleForm();
    hideResultView();
    renderNode();
  }

  function goBack() {
    if (!state.tree || state.history.length === 0) return;
    state.history.pop();
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

  function renderNode() {
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
    els.questionIcon.textContent = getIcon(node);
    renderSupportLinks(node);
    renderOptionTargetRows(node);
    renderCurrentPayload(node);
    renderPathTable();
    updateProgress();
    updateButtons();
  }

  function selectOption(node, option) {
    state.history.push({ nodeId: node.id, question: node.question, answer: option.label, next: option.next, icon: getIcon(node) });
    if (state.tree.nodes[option.next]) { state.currentNodeId = option.next; renderNode(); return; }
    if (state.tree.results[option.next]) { renderResult(state.tree.results[option.next]); return; }
    renderResult({ id: 'RESULT_NO_RULE', title: 'No current recommendation', rationale: "The selected option points to '" + option.next + "', which does not exist in nodes or results.", isMissingRule: true });
  }

  function renderResult(result) {
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
    renderCurrentPayload(result);
    renderPathTable(result);
    updateProgress();
    updateButtons();
  }

  function renderCurrentPayload(payload) {
    els.currentNodeIdPill.textContent = payload && payload.id ? payload.id : '-';
    renderCurrentPayloadJson(payload);
    highlightCurrentTreeViewPayload();
    syncMiniTreeView();
  }

  function renderCurrentPayloadJson(payload) {
    els.currentNodeJson.textContent = payload ? JSON.stringify(payload, null, 2) : 'No tree loaded yet.';
  }
  function renderSupportLinks(node) {
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
      var currentRuntime = (state.assessmentLinks[node.id] && state.assessmentLinks[node.id][idx]) || '';
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
        if (state.assessmentLinks[node.id]) state.assessmentLinks[node.id][idx] = '';
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
          if (!state.assessmentLinks[node.id]) state.assessmentLinks[node.id] = [];
          state.assessmentLinks[node.id][idx] = val;
          setSaveStatus('Link updated for this assessment (not persisted to tree.json).');
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
          if (!state.assessmentLinks[node.id]) state.assessmentLinks[node.id] = [];
          state.assessmentLinks[node.id][idx] = val;
          setSaveStatus('Link saved for this assessment (not persisted to tree.json).');
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

  function renderOptionTargetRows(node) {
    els.optionTargetGrid.innerHTML = '';
    if (!node || !Array.isArray(node.options) || node.options.length === 0) { els.emptyTargets.classList.remove('hidden'); return; }
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

  function renderPathTable(result) {
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
      tr.appendChild(tdIndex); tr.appendChild(tdQuestion); tr.appendChild(tdAnswer);
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

  function getIcon(payload) {
    return payload && String(payload.icon || DEFAULT_ICON).trim() ? String(payload.icon || DEFAULT_ICON).trim() : DEFAULT_ICON;
  }

  function estimateRemainingSteps(currentNodeId, visiting) {
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

  function updateProgress() {
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

  function updateButtons() {
    var hasTree = !!state.tree;
    var canGoBack = hasTree && state.history.length > 0;
    var canExport = hasTree && (state.history.length > 0 || !!state.currentResult);
    var canEdit = hasTree && !!state.currentPayload;
    if (els.saveTreeBtn) els.saveTreeBtn.disabled = !hasTree;
    if (els.forkTreeBtn) els.forkTreeBtn.disabled = !hasTree;
    if (els.saveSessionBtn) els.saveSessionBtn.disabled = !hasTree;
    if (els.openTreeViewBtn) els.openTreeViewBtn.disabled = !hasTree;
    if (els.openTablesBtn) els.openTablesBtn.disabled = !hasTree;
    els.restartBtn.disabled = !hasTree;
    els.restartResultBtn.disabled = !hasTree;
    els.copyNodeIdBtn.disabled = !hasTree;
    els.backBtn.disabled = !canGoBack;
    els.backResultBtn.disabled = !canGoBack;
    els.editNodeBtn.disabled = !canEdit;
    els.exportAssessmentBtn.disabled = !canExport;
    els.exportAssessmentBtn.classList.toggle('ready', hasTree && state.currentMode === 'result' && !!state.currentResult);
    els.applyMissingRuleBtn.disabled = !(hasTree && state.currentResult && state.currentResult.isMissingRule);
    els.saveMissingRuleBtn.disabled = !(hasTree && state.currentResult && state.currentResult.isMissingRule);
    els.openCreateQuestionBtn.disabled = !hasTree;
    els.openCreateResultBtn.disabled = !hasTree;
    els.treeViewCreateQuestionBtn.disabled = !hasTree;
    els.treeViewCreateResultBtn.disabled = !hasTree;
  }

  function populateMissingRuleOptions() {
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

  function applyMissingRuleSelection() {
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
    if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
    appendChangeLog({ type: 'missingRuleMappedToExistingResult', sourceNodeId: sourceNode.id, optionLabel: sourceOption.label, previousTarget: prev, newTarget: selectedResultId, note: els.missingRuleText.value.trim() || null, payloadType: 'node', payloadId: sourceNode.id });
    els.missingRuleSaveMessage.textContent = 'Rule applied in the current session. Click Save tree.json to persist it.';
    renderResult(state.tree.results[selectedResultId]);
  }

  function saveMissingRuleCase() {
    var note = els.missingRuleText.value.trim();
    if (!note) { els.missingRuleSaveMessage.textContent = 'Enter notes first, or pick a result and apply it.'; return; }
    var payload = {
      savedAt: new Date().toISOString(),
      treeTitle: state.tree ? (state.tree.title || '') : '',
      treeVersion: state.tree ? (state.tree.version || '') : '',
      treeVersionHash: state.tree ? (state.tree.versionHash || '') : '',
      branchId: state.tree ? (state.tree.branchId || 'main') : 'main',
      path: state.history.map(function (step, index) { return { step: index + 1, nodeId: step.nodeId, question: step.question, answer: step.answer, next: step.next, icon: step.icon }; }),
      selectedResultId: els.missingRuleSelect.value || null,
      proposedRecommendation: note
    };
    var existing = readUnresolvedCases();
    existing.push(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing, null, 2));
    els.missingRuleSaveMessage.textContent = 'Unresolved case saved in this browser.';
  }

  function readUnresolvedCases() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_err) {
      return [];
    }
  }

  function clearMissingRuleForm() {
    els.missingRuleSelect.innerHTML = '';
    els.missingRuleText.value = '';
    els.missingRuleSaveMessage.textContent = '';
  }

  async function copyCurrentId() {
    var text = els.currentNodeIdPill.textContent || '';
    if (!text || text === '-') return;
    try {
      await navigator.clipboard.writeText(text);
      flashButtonText(els.copyNodeIdBtn, 'Copied');
    } catch (_err) {
      alert('Could not copy automatically.\nCurrent ID: ' + text);
    }
  }

  function openCurrentPayloadEditor() {
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

  function closeEditor(options) {
    if (!canDismissEditor(options)) return;
    performCloseEditor();
  }

  function setEditorMode(mode) {
    state.editorMode = mode === 'raw' ? 'raw' : 'form';
    var isForm = state.editorMode === 'form';
    els.editorFormTab.classList.toggle('active', isForm);
    els.editorRawTab.classList.toggle('active', !isForm);
    els.nodeEditorForm.classList.toggle('hidden', !isForm);
    els.nodeEditorRawWrap.classList.toggle('hidden', isForm);
    if (isForm) renderValidationSummary('edit'); else hideValidationSummary('edit');
    updateEditorDirtyState();
  }

  function openCreatePayloadPanel(mode, options) {
    if (!state.tree) return;
    var opts = options || {};
    state.createMode = mode === 'result' ? 'result' : 'node';
    state.createDraft = buildCreateDraft(state.createMode);
    state.createDraftBaseline = clone(state.createDraft);
    els.createPayloadTitle.textContent = state.createMode === 'node' ? 'Create new question node' : 'Create new result node';
    els.editorModalTitle.textContent = opts.source === 'tree-view'
      ? (state.createMode === 'node' ? 'Create new question node' : 'Create new result node')
      : (state.currentMode === 'node' ? 'Edit current node' : 'Edit current result');
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

  function closeCreatePayloadPanel(options) {
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

  function performCloseEditor() {
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

  function setEditorSurfaceMode(mode) {
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

  function hasUnsavedTreeChanges() {
    return !!(state.tree && state.lastTreeSnapshot && JSON.stringify(state.tree) !== state.lastTreeSnapshot);
  }

  function hasCreateDraftChanges() {
    if (!state.createDraft || !state.createDraftBaseline) return false;
    return JSON.stringify(state.createDraft) !== JSON.stringify(state.createDraftBaseline);
  }

  function readCurrentEditorDraftSafely() {
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

  function hasEditDraftChanges() {
    if (!state.currentPayload || !state.editorDraftBaseline) return false;
    var draft = readCurrentEditorDraftSafely();
    if (!draft) return false;
    if (draft.__invalidJson) return String(draft.raw || '').trim() !== JSON.stringify(state.currentPayload, null, 2).trim();
    return JSON.stringify(draft) !== JSON.stringify(state.currentPayload);
  }

  function getEditorPendingChangeSummary() {
    var parts = [];
    if (hasEditDraftChanges()) parts.push('You have unapplied edits in this modal.');
    if (hasCreateDraftChanges()) parts.push('You have an unfinished new node/result in this modal.');
    if (hasUnsavedTreeChanges()) parts.push('The live tree has changes that have not been saved to tree.json.');
    return parts;
  }

  function canDismissCreatePanel() {
    if (!hasCreateDraftChanges()) return true;
    return window.confirm('Discard this new node/result draft?');
  }

  function canDismissEditor(options) {
    var opts = options || {};
    if (opts.force) return true;
    var parts = getEditorPendingChangeSummary();
    if (!parts.length) return true;
    return window.confirm(parts.join('\n') + '\n\nClose anyway?');
  }

  function updateEditorDirtyState() {
    var modal = els.editorModal;
    var modalDirty = !!(hasEditDraftChanges() || hasCreateDraftChanges() || hasUnsavedTreeChanges());
    if (modal) modal.classList.toggle('modal-dirty', modalDirty);
    if (els.createPayloadPanel) els.createPayloadPanel.classList.toggle('editor-subpanel-dirty', hasCreateDraftChanges());
  }

  function buildCreateDraft(mode) {
    return mode === 'node' ? { id: suggestNextId('NODE'), question: '', note: '', options: [{ label: '', next: '' }] } : { id: suggestNextId('RESULT'), title: '', rationale: '' };
  }

  function renderPayloadForm(scope) {
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
  function attachRenameButton(scope) {
    if (!els.renamePayloadBtn) return;
    if (scope !== 'edit') {
      dockRenameButton();
      return;
    }
    var mount = els.nodeEditorForm ? els.nodeEditorForm.querySelector('[data-rename-button-mount="edit"]') : null;
    if (!mount) {
      dockRenameButton();
      return;
    }
    els.renamePayloadBtn.classList.remove('hidden');
    mount.appendChild(els.renamePayloadBtn);
  }
  function dockRenameButton() {
    if (!els.renamePayloadBtn) return;
    var dock = document.getElementById('renamePayloadBtnDock');
    if (!dock) return;
    els.renamePayloadBtn.classList.add('hidden');
    dock.appendChild(els.renamePayloadBtn);
  }

  function buildPayloadFormHtml(scope, mode, payload, isCreate) {
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

  function buildField(scope, name, label, value, readonly, help) {
    return '<div class="editor-field">' +
      '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
      '<input id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" type="text" value="' + escapeAttr(value || '') + '"' + (readonly ? ' readonly' : '') + ' />' +
      (help ? '<div class="editor-help">' + escapeHtml(help) + '</div>' : '') +
      '</div>';
  }
  function buildIdField(scope, value, readonly, help, showRenameButton) {
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

  function buildIconField(scope, value, help) {
    var html = '<div class="editor-field icon-picker-field">';
    html += '<label for="' + scope + '_editor_icon">Icon</label>';
    html += '<div class="icon-picker-row">';
    html += '<input id="' + scope + '_editor_icon" data-scope="' + scope + '" data-field="icon" type="text" value="' + escapeAttr(value || '') + '" placeholder="Emoji or symbol" />';
    html += '<div class="editor-button-row">';
    html += '<button type="button" class="btn-small" data-action="open-icon-picker" data-scope="' + scope + '">Change icon</button>';
    html += '<button type="button" class="btn-small" data-action="choose-icon" data-scope="' + scope + '" data-icon="">Clear</button>';
    html += '</div>';
    html += '</div>';
    if (help) html += '<div class="editor-help">' + escapeHtml(help) + ' Click “Change icon” to pick from a palette, or type your own.</div>';
    html += '</div>';
    return html;
  }

  function buildTextAreaField(scope, name, label, value, placeholder) {
    return '<div class="editor-field">' +
      '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
      '<textarea id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" placeholder="' + escapeAttr(placeholder || '') + '">' + escapeHtml(value || '') + '</textarea>' +
      '</div>';
  }

  function buildCheckboxField(scope, name, label, checked, help) {
    return '<div class="editor-field">' +
      '<label for="' + scope + '_editor_' + escapeAttr(name) + '">' + escapeHtml(label) + '</label>' +
      '<div class="editor-checkbox-wrap">' +
        '<input id="' + scope + '_editor_' + escapeAttr(name) + '" data-scope="' + scope + '" data-field="' + escapeAttr(name) + '" type="checkbox" ' + (checked ? 'checked' : '') + ' />' +
      '</div>' +
      (help ? '<div class="editor-help">' + escapeHtml(help) + '</div>' : '') +
      '</div>';
  }

  function buildOptionRow(scope, option, index, total) {
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

  function buildTargetSelect(scope, index, value) {
    var options = '<option value="">Select target…</option>';
    getTargetChoices().forEach(function (item) {
      options += '<option value="' + escapeAttr(item.id) + '"' + (item.id === String(value || '') ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
    });
    return '<select data-scope="' + scope + '" data-option-field="next" data-index="' + index + '">' + options + '</select>';
  }

  function buildLinkRow(scope, link, index) {
    return '<div class="editor-row">' +
      '<div class="editor-row-head"><div class="editor-row-title">Link ' + (index + 1) + '</div><div class="editor-row-actions"><button type="button" class="btn-small" data-action="remove-link" data-scope="' + scope + '" data-index="' + index + '">Remove</button></div></div>' +
      '<div class="editor-grid">' +
      '<div class="editor-field"><label>Label</label><input data-scope="' + scope + '" data-link-field="label" data-index="' + index + '" type="text" value="' + escapeAttr(link && link.label || '') + '" /></div>' +
      '<div class="editor-field"><label>URL</label><input data-scope="' + scope + '" data-link-field="url" data-index="' + index + '" type="text" value="' + escapeAttr(link && link.url || '') + '" /></div>' +
      '</div></div>';
  }

  function handlePayloadFormInput(scope) {
    syncScopeDraftFromForm(scope);
    renderValidationSummary(scope);
    if (scope === 'edit' && state.editorDraft) els.nodeEditorText.value = JSON.stringify(state.editorDraft, null, 2);
    updateEditorDirtyState();
  }

  function handlePayloadFormClick(event, scope) {
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

  function focusLastOption(scope) {
    var root = scope === 'create' ? els.createPayloadForm : els.nodeEditorForm;
    var fields = root.querySelectorAll('[data-option-field="label"]');
    if (fields.length) fields[fields.length - 1].focus();
  }

  function openIconPicker(scope) {
    state.iconPickerScope = scope === 'create' ? 'create' : 'edit';
    renderIconPickerGrid(scope);
    if (els.iconPickerOverlay) {
      els.iconPickerOverlay.classList.remove('hidden');
      setTimeout(function () { if (els.iconPickerCloseBtn) els.iconPickerCloseBtn.focus(); }, 0);
    }
  }

  function closeIconPicker() {
    if (els.iconPickerOverlay) els.iconPickerOverlay.classList.add('hidden');
  }

  function renderIconPickerGrid(scope) {
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

  function chooseIconForScope(icon, scope) {
    var payload = getScopePayload(scope);
    if (!payload) return;
    if (icon) payload.icon = icon; else delete payload.icon;
    renderPayloadForm(scope);
    updateEditorDirtyState();
  }

  function syncScopeDraftFromForm(scope) {
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

  function readFieldValue(root, fieldName) {
    var field = root.querySelector('[data-field="' + fieldName + '"]');
    return field ? String(field.value || '').trim() : '';
  }

  function renderValidationSummary(scope) {
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
      html += '<strong>' + (errors.length ? 'Warnings if you apply now:' : 'Warnings if you apply now:') + '</strong><ul class="editor-errors">' + warnings.map(function (msg) { return '<li>' + escapeHtml(msg) + '</li>'; }).join('') + '</ul>';
    }
    summary.innerHTML = html;
    summary.classList.remove('hidden');
  }

  function hideValidationSummary(scope) {
    var summary = scope === 'create' ? els.createValidationSummary : els.editorValidationSummary;
    if (!summary) return;
    summary.innerHTML = '';
    summary.classList.add('hidden');
  }

  function getPayloadValidationErrors(payload, mode, isCreate) {
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

  function getPayloadValidationWarnings(payload, mode, isCreate) {
    var warnings = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return warnings;
    if (mode === 'node') {
      var options = Array.isArray(payload.options) ? payload.options : [];
      if (!options.length) warnings.push("Node '" + (payload.id || 'new node') + "' has no options.");
      options.forEach(function (option, index) {
        var label = String(option && option.label || '').trim();
        var next = String(option && option.next || '').trim();
        if (!label && !next) {
          warnings.push('Option ' + (index + 1) + ' is empty.');
          return;
        }
        if (!label) warnings.push('Option ' + (index + 1) + ' is missing a label.');
        if (!next) {
          warnings.push("Option '" + (label || ('Option ' + (index + 1))) + "' is missing a target.");
          return;
        }
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

  function openValidationWarningModal(config) {
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

  function closeValidationWarningModal() {
    if (els.validationWarningOverlay) els.validationWarningOverlay.classList.add('hidden');
  }

  function cancelValidationWarningModal() {
    var onCancel = pendingValidationCancel;
    pendingValidationProceed = null;
    pendingValidationCancel = null;
    closeValidationWarningModal();
    if (typeof onCancel === 'function') onCancel();
  }

  function proceedValidationWarningModal() {
    var onProceed = pendingValidationProceed;
    pendingValidationProceed = null;
    pendingValidationCancel = null;
    closeValidationWarningModal();
    if (typeof onProceed === 'function') onProceed();
  }

  function getPreviewTreeForPayload(scope, mode, payload) {
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

  function finalizeAppliedPayloadEdit(edited, saveAfter, warnings) {
    if (state.currentMode === 'node') state.tree.nodes[edited.id] = edited; else state.tree.results[edited.id] = edited;
    if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
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

  function finalizeCreatedPayload(created, warnings) {
    if (state.createMode === 'node') state.tree.nodes[created.id] = created; else state.tree.results[created.id] = created;
    if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
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

  function applyCurrentPayloadEdits(saveAfter) {
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
        openValidationWarningModal({
          title: 'Apply changes with warnings?',
          message: 'These changes may break the tree. You can cancel and fix them first, or proceed anyway.',
          warnings: warnings,
          onProceed: proceed
        });
        return;
      }
      proceed();
    } catch (err) {
      els.editorMessage.textContent = (err && err.message) || String(err);
      els.editorMessage.className = 'footnote editor-message-top bad';
    }
  }

  function renameCurrentPayloadId() {
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

      if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
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

  function readEditorPayloadForRename(expectedId) {
    var payload = state.editorMode === 'form' ? clone(state.editorDraft) : JSON.parse(els.nodeEditorText.value);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Edited JSON must be an object.');
    if (payload.id !== expectedId) throw new Error("Apply or discard the current ID edit first. The payload id must still be '" + expectedId + "' before using Rename ID.");
    return payload;
  }

  function replaceTreeReferences(oldId, newId) {
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

  function deleteCurrentPayload() {
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
      if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
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

  function setEditorError(message) {
    els.editorMessage.textContent = message;
    els.editorMessage.className = 'footnote editor-message-top bad';
  }

  function findIncomingReferences(payloadId) {
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

  function createPayloadFromDraft() {
    if (!state.tree || !state.createDraft || !state.createMode) {
      console.error('Create failed: invalid state', {
        tree: !!state.tree,
        draft: state.createDraft,
        mode: state.createMode
      });
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
        openValidationWarningModal({
          title: 'Create payload with warnings?',
          message: 'This new payload may break the tree. You can cancel and fix it first, or proceed anyway.',
          warnings: warnings,
          onProceed: proceed
        });
        return;
      }
      proceed();
    } catch (err) {
      els.createPayloadMessage.textContent = (err && err.message) || String(err);
      els.createPayloadMessage.className = 'footnote bad';
    }
  }

  async function saveTreeJson() {
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
    var content = JSON.stringify(state.tree, null, 2);
    downloadFile(content, 'tree.json', 'application/json');
    state.lastTreeSnapshot = JSON.stringify(state.tree);
    updateEditorDirtyState();
    setSaveStatus('Downloaded updated tree.json with version hash.');
  }

  async function forkCurrentTreeBranch() {
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

  function generateForkBranchId(sourceBranch) {
    return sanitizeBranchId((sourceBranch || 'main') + '-fork-' + new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 12));
  }

  function sanitizeBranchId(branchId) {
    var clean = slugify(String(branchId || '').trim()).replace(/^-+|-+$/g, '');
    return clean || 'main';
  }

  function getShortVersionHash(hashValue) {
    var value = String(hashValue || '').trim();
    if (!value) return '';
    return value.length > 20 ? value.slice(0, 20) + '…' : value;
  }

  function formatRuleSetLabel(tree) {
    if (!tree) return 'Rule set: -';
    var parts = [tree.version || '-'];
    var branchId = sanitizeBranchId(tree.branchId || 'main');
    if (branchId) parts.push('branch:' + branchId);
    if (tree.versionHash) parts.push(getShortVersionHash(tree.versionHash));
    return 'Rule set: ' + parts.join(' · ');
  }

  function buildVersionHashTreeSnapshot(tree) {
    var snapshot = clone(tree || {});
    delete snapshot.version;
    delete snapshot.versionHash;
    delete snapshot.parentVersionHash;
    delete snapshot.branchId;
    delete snapshot.changeLog;
    delete snapshot.layout;
    return sortKeysDeep(snapshot);
  }

  function sortKeysDeep(value) {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).sort().forEach(function (key) {
        out[key] = sortKeysDeep(value[key]);
      });
      return out;
    }
    return value;
  }

  async function computeTreeVersionHash(tree) {
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

  function simpleHashFallback(text) {
    var h1 = 0xdeadbeef ^ text.length;
    var h2 = 0x41c6ce57 ^ text.length;
    for (var i = 0; i < text.length; i += 1) {
      var ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var hex = ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
    return hex + hex + hex + hex;
  }

  function appendChangeLog(entry) {
    if (!state.tree) return;
    if (!Array.isArray(state.tree.changeLog)) state.tree.changeLog = [];
    var payload = clone(entry || {});
    payload.changedAt = payload.changedAt || new Date().toISOString();
    if (typeof payload.treeVersion === 'undefined' && state.tree.version) payload.treeVersion = state.tree.version;
    if (typeof payload.versionHash === 'undefined') payload.versionHash = state.tree.versionHash || null;
    if (typeof payload.parentVersionHash === 'undefined') payload.parentVersionHash = state.tree.parentVersionHash || null;
    if (typeof payload.branchId === 'undefined') payload.branchId = sanitizeBranchId(state.tree.branchId || 'main');
    state.tree.changeLog.push(payload);
  }

  function incrementVersionString(version) {
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

  function setSaveStatus(message) {
    els.saveStatus.textContent = message || '';
    els.saveStatus.className = 'footnote';
    updateButtons();
  }
  function formatTreeValidationWarningSummary(tree) {
    var warnings = getTreeValidationWarnings(tree);
    if (!warnings.length) return '';
    if (warnings.length === 1) return warnings[0];
    return warnings.length + ' warnings: ' + warnings.join(' ');
  }

  function validateReportInputs() {
    var missing = [];
    if (!els.assessorInitialsInput.value.trim()) missing.push({ label: 'assessor initials', el: els.assessorInitialsInput });
    if (!els.stationNumberInput.value.trim()) missing.push({ label: 'station number', el: els.stationNumberInput });
    if (!els.stationNameInput.value.trim()) missing.push({ label: 'station name', el: els.stationNameInput });
    return missing;
  }

  function exportAssessmentReport() {
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
    var fileStem = slugify((els.stationNumberInput.value.trim() || 'station') + '_' + (els.stationNameInput.value.trim() || 'assessment') + '_' + (state.assessmentId || 'run'));
    downloadFile(reportHtml, fileStem + '_assessment_report.html', 'text/html');
    storeAssessmentRunMetadata();
    flashButtonText(els.exportAssessmentBtn, 'Session + report saved');
  }

  function saveCurrentSession() {
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
      path: state.history.map(function (step, index) { return { step: index + 1, nodeId: step.nodeId, question: step.question, answer: step.answer, next: step.next, icon: step.icon }; }),
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
    } catch (err) {
      if (els.saveSessionBtn) els.saveSessionBtn.textContent = 'Save failed';
    }
  }

  function buildReportHtml(meta) {
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
      return '<tr><td>' + (index + 1) + '</td><td><span class="icon">' + escapeHtml(step.icon || DEFAULT_ICON) + '</span> ' + escapeHtml(step.question) + '</td><td>' + answerHtml + '</td></tr>';
    }).join('');
    var outcomeRow = state.currentResult ? '<tr><td>' + (state.history.length + 1) + '</td><td>Outcome</td><td>' + escapeHtml(state.currentResult.title || 'Recommendation unavailable') + '</td></tr>' : '';
    var rationaleBlock = state.currentResult ? '<section class="box"><h2>Recommendation</h2><p><strong>' + escapeHtml(state.currentResult.title || 'Recommendation unavailable') + '</strong></p><p>' + escapeHtml(state.currentResult.rationale || '') + '</p></section>' : '';
    var treeTablesBlock = '<section class="box tree-snapshot"><h2>Current tree.json snapshot</h2><p class="tree-version"><strong>Tree version:</strong> ' + escapeHtml(state.tree.version || '-') + '</p><p class="tree-version"><strong>Version hash:</strong> ' + escapeHtml(state.tree.versionHash || '-') + '</p><p class="tree-version"><strong>Branch:</strong> ' + escapeHtml(state.tree.branchId || 'main') + '</p>' + buildTreeTablesHtml({ editable: false, headingLevel: 3 }) + '</section>';
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
      '<title>' + escapeHtml((state.tree.title || 'Assessment') + ' - ' + meta.stationName) + '</title>' +
      '<style>' +
      'body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#111827}' +
      'h1{margin-bottom:8px}h2{margin:0 0 8px 0;font-size:18px}' +
      '.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:24px}' +
      '.box{border:1px solid #d1d5db;border-radius:10px;padding:14px;margin-bottom:18px}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.25;table-layout:fixed}th,td{border:1px solid #d1d5db;text-align:left;padding:6px 7px;vertical-align:top;word-break:break-word}th{background:#f3f4f6;font-size:11px;line-height:1.2}' +
      '.table-section{margin-top:14px}.table-section h3{margin:0 0 6px 0;font-size:14px}.tree-version{margin:0 0 10px 0;color:#374151;font-size:12px}' +
      '.tree-snapshot table{font-size:11px}.tree-snapshot th,.tree-snapshot td{padding:4px 5px}.tree-snapshot h3{font-size:13px}' +
      '.icon{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;border:1px solid #cbd5e1;margin-right:6px;font-weight:700}' +
      '.report-link-list{margin-top:8px;font-size:13px;color:#1f2937}' +
      '.report-link-list div{margin-top:4px}' +
      '.report-link-list a{color:#2563eb;text-decoration:none}' +
      '.foot{margin-top:24px;color:#4b5563;font-size:12px}@media print{body{margin:14mm}}' +
      '</style></head><body>' +
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
      '<section class="box"><h2>Decision path</h2><table><thead><tr><th>#</th><th>Question</th><th>Answer</th></tr></thead><tbody>' + rows + outcomeRow + '</tbody></table></section>' +
        rationaleBlock + treeTablesBlock + '<p class="foot">Open this report in a browser and print to PDF.</p>' + '</body></html>';
  }

  function startNewAssessmentRun() {
    state.assessmentId = generateAssessmentId();
    state.supersedesAssessmentId = '';
    renderAssessmentMetadata();
  }

  function generateAssessmentId() {
    var now = new Date();
    return 'ASMT-' + padNumber(now.getFullYear(), 4) + padNumber(now.getMonth() + 1, 2) + padNumber(now.getDate(), 2) + '-' + padNumber(now.getHours(), 2) + padNumber(now.getMinutes(), 2) + padNumber(now.getSeconds(), 2) + '-' + Math.floor(1000 + Math.random() * 9000);
  }

  function padNumber(value, length) {
    var text = String(value);
    while (text.length < length) text = '0' + text;
    return text;
  }

  function renderAssessmentMetadata() {
    if (els.assessmentIdInput) els.assessmentIdInput.value = state.assessmentId || '';
    if (els.supersedesAssessmentInput) els.supersedesAssessmentInput.value = state.supersedesAssessmentId || '';
    renderPreviousAssessmentOptions();
  }

  function renderPreviousAssessmentOptions() {
    if (!els.previousAssessmentIdsDatalist) return;
    els.previousAssessmentIdsDatalist.innerHTML = (state.previousAssessmentIds || []).map(function (id) {
      return '<option value="' + escapeAttr(id) + '"></option>';
    }).join('');
  }

  function readPreviousAssessmentIds() {
    try {
      var raw = localStorage.getItem(ASSESSMENT_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_err) {
      return [];
    }
  }

  function savePreviousAssessmentIds(ids) {
    try {
      localStorage.setItem(ASSESSMENT_HISTORY_KEY, JSON.stringify(ids));
    } catch (_err) {
      // ignore storage failures
    }
  }

  function storeAssessmentRunMetadata() {
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

  function hideResultView() { els.questionView.classList.remove('hidden'); els.resultView.classList.add('hidden'); }
  function flashButtonText(button, temporaryText) { var original = button.textContent; button.textContent = temporaryText; setTimeout(function () { button.textContent = original; }, 1000); }
  function downloadFile(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 200);
  }
  function slugify(value) { return String(value || 'assessment').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'assessment'; }
  function getScopePayload(scope) { return scope === 'create' ? state.createDraft : state.editorDraft; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function targetExists(targetId) { return !!(state.tree && targetId && (state.tree.nodes[targetId] || state.tree.results[targetId])); }
  function idExistsElsewhere(id) { return !!(state.tree && id && (state.tree.nodes[id] || state.tree.results[id])); }
  function suggestNextId(prefix) {
    if (!state.tree) return prefix + '_1';
    var all = Object.keys(state.tree.nodes).concat(Object.keys(state.tree.results));
    var index = 1; var candidate = prefix + '_' + index;
    while (all.indexOf(candidate) !== -1) { index += 1; candidate = prefix + '_' + index; }
    return candidate;
  }
  function getTargetChoices() {
    if (!state.tree) return [];
    var choices = [];
    Object.keys(state.tree.nodes).sort().forEach(function (id) { choices.push({ id: id, label: id + ' — Question node' }); });
    Object.keys(state.tree.results).sort().forEach(function (id) { choices.push({ id: id, label: id + ' — Result' }); });
    return choices;
  }
  function uniqueStrings(values) {
    var seen = new Set();
    return values.filter(function (value) { var key = String(value || ''); if (!key || seen.has(key)) return false; seen.add(key); return true; });
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/\n/g, '&#10;'); }
})();
