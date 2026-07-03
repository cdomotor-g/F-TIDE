import { state } from './state.js';
import { els } from './dom.js';
import { escapeHtml, escapeAttr } from './utils.js';

// Module-scoped working set for the search modal.
var currentStationMatches = [];
var stationFocusSuppressUntil = 0;
var STATION_RESULT_LIMIT = 300;

// ---- CSV parsing ---------------------------------------------------------
// Handles quoted fields, escaped quotes (""), embedded commas and newlines,
// and both CRLF and LF line endings.
export function parseCsv(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;
  var i = 0;
  var len = text.length;
  while (i < len) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      row.push(field); field = ''; rows.push(row); row = []; i += 1; continue;
    }
    if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; i += 1; continue; }
    field += ch; i += 1;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function csvToObjects(text) {
  var rows = parseCsv(text);
  if (!rows.length) return [];
  var headers = rows[0].map(function (h) { return String(h == null ? '' : h).trim(); });
  var objs = [];
  for (var r = 1; r < rows.length; r += 1) {
    var cells = rows[r];
    if (!cells || (cells.length === 1 && String(cells[0]).trim() === '')) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c += 1) {
      obj[headers[c]] = cells[c] != null ? cells[c] : '';
    }
    objs.push(obj);
  }
  return objs;
}

// The "Site Assessment Report" column holds a raw HTML anchor. Extract the
// href and text without injecting arbitrary markup into the live document.
export function parseAssessmentReport(raw) {
  var value = String(raw == null ? '' : raw).trim();
  if (!value) return { url: '', label: '', raw: '' };
  try {
    if (typeof DOMParser !== 'undefined') {
      var doc = new DOMParser().parseFromString(value, 'text/html');
      var a = doc.querySelector('a');
      if (a) {
        return { url: a.getAttribute('href') || '', label: (a.textContent || '').trim(), raw: value };
      }
    }
  } catch (_e) { /* fall through to plain handling */ }
  if (/^https?:/i.test(value) || value.charAt(0) === '/') {
    return { url: value, label: value, raw: value };
  }
  var stripped = value.replace(/<[^>]*>/g, '').trim();
  return { url: '', label: stripped || value, raw: value };
}

function buildStationRecord(row) {
  return {
    stationName: String(row['Station Name'] || '').trim(),
    stationNumber: String(row['Station Number'] || '').trim(),
    type: String(row['Location Types'] || '').trim(),
    state: String(row['State'] || '').trim(),
    lga: String(row['LGA Name'] || '').trim(),
    owner: String(row['Station Owners'] || '').trim(),
    hub: String(row['Hub'] || '').trim(),
    assessmentReport: parseAssessmentReport(row['Site Assessment Report'])
  };
}

// ---- FReD file loading ---------------------------------------------------
export function handleFredFileSelected(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var objects = csvToObjects(e.target.result);
      var records = objects.map(buildStationRecord).filter(function (rec) {
        return rec.stationNumber || rec.stationName;
      });
      state.stationsData = records;
      state.stationsFileName = file.name || 'FReD.csv';
      updateFredStatus();
      openStationSearchModal();
    } catch (err) {
      if (els.fredStatus) els.fredStatus.textContent = 'Could not read FReD: ' + (err && err.message ? err.message : 'parse error');
      alert('Could not load FReD CSV\n' + (err && err.message ? err.message : 'parse error'));
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

export function updateFredStatus() {
  if (!els.fredStatus) return;
  var count = (state.stationsData || []).length;
  els.fredStatus.textContent = count ? ('FReD: ' + count + ' station' + (count === 1 ? '' : 's')) : '';
}

export function openFredFilePicker() {
  if (els.fredFileInput) els.fredFileInput.click();
}

// ---- Station number field focus -----------------------------------------
export function handleStationNumberFocus() {
  if (Date.now() < stationFocusSuppressUntil) return;
  if (state.stationsData && state.stationsData.length) {
    openStationSearchModal();
    return;
  }
  // No FReD loaded yet: prompt the user to load it.
  openFredFilePicker();
}

// ---- Search modal --------------------------------------------------------
export function openStationSearchModal() {
  if (!els.stationSearchOverlay) return;
  els.stationSearchOverlay.classList.remove('hidden');
  if (els.stationSearchMeta) {
    els.stationSearchMeta.textContent = state.stationsFileName
      ? ('Loaded from ' + state.stationsFileName + ' · ' + (state.stationsData || []).length + ' stations')
      : '';
  }
  if (els.stationSearchInput) els.stationSearchInput.value = '';
  renderStationResults('');
  setTimeout(function () { if (els.stationSearchInput) els.stationSearchInput.focus(); }, 0);
}

export function closeStationSearchModal() {
  if (!els.stationSearchOverlay) return;
  els.stationSearchOverlay.classList.add('hidden');
  // Focus returns to the station number field after the modal closes; suppress
  // the resulting focus event briefly so the modal does not immediately reopen.
  stationFocusSuppressUntil = Date.now() + 500;
}

export function renderStationResults(query) {
  if (!els.stationSearchResults) return;
  var q = String(query == null ? '' : query).trim().toLowerCase();
  var data = state.stationsData || [];
  var matches = q ? data.filter(function (s) {
    return (s.stationNumber || '').toLowerCase().indexOf(q) !== -1
      || (s.stationName || '').toLowerCase().indexOf(q) !== -1;
  }) : data;
  currentStationMatches = matches;
  if (els.stationSearchEmpty) {
    if (!data.length) {
      els.stationSearchEmpty.textContent = 'No stations loaded.';
      els.stationSearchEmpty.classList.remove('hidden');
    } else if (!matches.length) {
      els.stationSearchEmpty.textContent = 'No stations match "' + query + '".';
      els.stationSearchEmpty.classList.remove('hidden');
    } else {
      els.stationSearchEmpty.classList.add('hidden');
    }
  }
  var limited = matches.slice(0, STATION_RESULT_LIMIT);
  var html = limited.map(function (s, index) {
    return '<button type="button" class="station-result" data-index="' + index + '">'
      + '<span class="station-result-name">' + escapeHtml(s.stationName || '(no name)') + '</span>'
      + '<span class="station-result-number">' + escapeHtml(s.stationNumber || '-') + '</span>'
      + '<span class="station-result-meta">' + escapeHtml([s.state, s.lga, s.hub].filter(Boolean).join(' · ')) + '</span>'
      + '</button>';
  }).join('');
  if (matches.length > limited.length) {
    html += '<p class="station-result-more">Showing first ' + limited.length + ' of ' + matches.length + '. Refine your search to narrow the list.</p>';
  }
  els.stationSearchResults.innerHTML = html;
}

export function handleStationResultsClick(event) {
  var btn = event.target.closest ? event.target.closest('button.station-result') : null;
  if (!btn || !els.stationSearchResults.contains(btn)) return;
  var index = parseInt(btn.getAttribute('data-index'), 10);
  if (isNaN(index)) return;
  var station = currentStationMatches[index];
  if (station) selectStation(station);
}

export function selectStation(station) {
  if (els.stationNumberInput) els.stationNumberInput.value = station.stationNumber || '';
  if (els.stationNameInput) els.stationNameInput.value = station.stationName || '';
  if (els.stationTypeInput) els.stationTypeInput.value = station.type || '';
  if (els.stationStateInput) els.stationStateInput.value = station.state || '';
  if (els.stationLgaInput) els.stationLgaInput.value = station.lga || '';
  if (els.stationOwnerInput) els.stationOwnerInput.value = station.owner || '';
  if (els.stationHubInput) els.stationHubInput.value = station.hub || '';
  state.selectedStation = station;
  state.assessmentReport = station.assessmentReport || { url: '', label: '', raw: '' };
  renderAssessmentReport();
  closeStationSearchModal();
}

export function renderAssessmentReport() {
  var el = els.assessmentReportDisplay;
  if (!el) return;
  var rep = state.assessmentReport || {};
  if (rep.url) {
    el.innerHTML = '<a href="' + escapeAttr(rep.url) + '" target="_blank" rel="noopener noreferrer">'
      + escapeHtml(rep.label || rep.url) + '</a>';
  } else if (rep.label) {
    el.textContent = rep.label;
  } else {
    el.textContent = '-';
  }
}

export function clearStationDetails() {
  if (els.stationTypeInput) els.stationTypeInput.value = '';
  if (els.stationStateInput) els.stationStateInput.value = '';
  if (els.stationLgaInput) els.stationLgaInput.value = '';
  if (els.stationOwnerInput) els.stationOwnerInput.value = '';
  if (els.stationHubInput) els.stationHubInput.value = '';
  state.selectedStation = null;
  state.assessmentReport = { url: '', label: '', raw: '' };
  renderAssessmentReport();
}
