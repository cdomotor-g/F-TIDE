export function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeAttr(value) { return escapeHtml(value).replace(/\n/g, '&#10;'); }

export function slugify(value) {
  return String(value || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

export function uniqueStrings(values) {
  var seen = new Set();
  return values.filter(function (value) {
    var key = String(value || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function downloadFile(content, fileName, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 200);
}

export function flashButtonText(button, temporaryText) {
  var original = button.textContent;
  button.textContent = temporaryText;
  setTimeout(function () { button.textContent = original; }, 1000);
}

export function padNumber(value, length) {
  var text = String(value);
  while (text.length < length) text = '0' + text;
  return text;
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = sortKeysDeep(value[key]); });
    return out;
  }
  return value;
}

export function simpleHashFallback(text) {
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
