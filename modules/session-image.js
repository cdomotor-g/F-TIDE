import { state } from './state.js';
import { els } from './dom.js';

// Session image pill: lets the assessor attach a screenshot to the current
// session by pasting from the clipboard, dropping a file, or choosing one via
// the right-click menu. The image is kept in memory (state.sessionImage) until
// a new session begins, and is embedded into the exported HTML report.

export function setSessionImage(dataUrl, name, type) {
  if (!dataUrl) return;
  state.sessionImage = { dataUrl: dataUrl, name: name || '', type: type || '' };
  renderSessionImage();
}

export function clearSessionImage() {
  state.sessionImage = null;
  renderSessionImage();
}

export function renderSessionImage() {
  var pill = els.sessionImagePill;
  if (!pill) return;
  var hasImage = !!(state.sessionImage && state.sessionImage.dataUrl);
  if (els.sessionImagePreview) {
    if (hasImage) {
      els.sessionImagePreview.src = state.sessionImage.dataUrl;
      els.sessionImagePreview.classList.remove('hidden');
    } else {
      els.sessionImagePreview.removeAttribute('src');
      els.sessionImagePreview.classList.add('hidden');
    }
  }
  if (els.sessionImagePlaceholder) els.sessionImagePlaceholder.classList.toggle('hidden', hasImage);
  if (els.clearSessionImageBtn) els.clearSessionImageBtn.disabled = !hasImage;
  pill.classList.toggle('has-image', hasImage);
}

// Reads a File/Blob into a data URL and stores it as the session image.
export function handleSessionImageFile(file) {
  if (!file) return;
  if (file.type && file.type.indexOf('image/') !== 0) {
    alert('Please provide an image file (e.g. a screenshot).');
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    setSessionImage(e.target.result, file.name || 'clipboard-image', file.type || 'image/png');
  };
  reader.onerror = function () { alert('Could not read the image.'); };
  reader.readAsDataURL(file);
}

export function handleSessionImageFileInput(event) {
  var file = event.target.files && event.target.files[0];
  if (file) handleSessionImageFile(file);
  // Reset so choosing the same file twice still fires a change event.
  event.target.value = '';
}

// ---- Drag & drop ---------------------------------------------------------
export function handleSessionImageDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  if (els.sessionImagePill) els.sessionImagePill.classList.add('dragover');
}

export function handleSessionImageDragLeave(event) {
  // Ignore leave events bubbling up from child nodes still inside the pill.
  if (els.sessionImagePill && event.relatedTarget && els.sessionImagePill.contains(event.relatedTarget)) return;
  if (els.sessionImagePill) els.sessionImagePill.classList.remove('dragover');
}

export function handleSessionImageDrop(event) {
  event.preventDefault();
  if (els.sessionImagePill) els.sessionImagePill.classList.remove('dragover');
  var dt = event.dataTransfer;
  if (!dt) return;
  if (dt.files && dt.files.length) { handleSessionImageFile(dt.files[0]); return; }
  if (dt.items && dt.items.length) {
    for (var i = 0; i < dt.items.length; i += 1) {
      if (dt.items[i].kind === 'file') {
        var f = dt.items[i].getAsFile();
        if (f) { handleSessionImageFile(f); return; }
      }
    }
  }
}

// ---- Paste ---------------------------------------------------------------
// Native paste event fired when the pill is focused and the user presses Ctrl+V.
export function handleSessionImagePaste(event) {
  var items = (event.clipboardData && event.clipboardData.items) || [];
  for (var i = 0; i < items.length; i += 1) {
    if (items[i].kind === 'file' && items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) { event.preventDefault(); handleSessionImageFile(file); return; }
    }
  }
}

// Explicit "Paste from clipboard" action from the context menu, using the async
// Clipboard API (needs a secure context and clipboard-read permission).
export async function pasteSessionImageFromClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    alert('Clipboard paste is not available in this browser.\nFocus the pill and press Ctrl+V, or use "Choose file to upload".');
    return;
  }
  try {
    var items = await navigator.clipboard.read();
    for (var i = 0; i < items.length; i += 1) {
      var imageType = (items[i].types || []).find(function (t) { return t.indexOf('image/') === 0; });
      if (imageType) {
        var blob = await items[i].getType(imageType);
        handleSessionImageFile(blob);
        return;
      }
    }
    alert('No image found on the clipboard. Copy a screenshot first, then try again.');
  } catch (err) {
    alert('Could not read from the clipboard: ' + (err && err.message ? err.message : 'permission denied') + '.\nFocus the pill and press Ctrl+V instead.');
  }
}

// ---- Right-click context menu -------------------------------------------
export function openSessionImageContextMenu(event) {
  event.preventDefault();
  var menu = els.sessionImageContextMenu;
  if (!menu) return;
  menu.classList.remove('hidden');
  var menuWidth = menu.offsetWidth || 200;
  var menuHeight = menu.offsetHeight || 90;
  var x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
  var y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
  menu.style.left = Math.max(8, x) + 'px';
  menu.style.top = Math.max(8, y) + 'px';
}

export function hideSessionImageContextMenu() {
  if (els.sessionImageContextMenu) els.sessionImageContextMenu.classList.add('hidden');
}

export function handleSessionImageContextMenuClick(event) {
  var btn = event.target.closest ? event.target.closest('button[data-action]') : null;
  if (!btn) return;
  var action = btn.getAttribute('data-action');
  hideSessionImageContextMenu();
  if (action === 'paste') {
    pasteSessionImageFromClipboard();
  } else if (action === 'upload') {
    if (els.sessionImageFileInput) els.sessionImageFileInput.click();
  }
}
