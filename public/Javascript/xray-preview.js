(function (global) {
  'use strict';

  var overlay = document.getElementById('xray-preview-overlay');
  var filename = document.getElementById('xray-preview-filename');
  var viewer = document.getElementById('xray-preview-viewer');
  var closeButton = document.getElementById('xray-preview-close');
  var currentUrl = null;
  var requestId = 0;
  var trigger = null;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getKind(attachment) {
    var type = String(attachment.type || '').toLowerCase();
    var name = String(attachment.name || '');
    if (type.indexOf('image/') === 0 || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image';
    if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
    return '';
  }

  function showMessage(message, busy) {
    viewer.textContent = '';
    viewer.appendChild(element('p', 'xray-preview__message', message));
    viewer.setAttribute('aria-busy', String(Boolean(busy)));
  }

  function revokeCurrentUrl() {
    if (!currentUrl) return;
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    requestId++;
    overlay.hidden = true;
    document.body.classList.remove('xray-preview-open');
    viewer.textContent = '';
    viewer.setAttribute('aria-busy', 'false');
    revokeCurrentUrl();
    if (trigger && document.body.contains(trigger)) trigger.focus();
    trigger = null;
  }

  function open(attachment, previewTrigger) {
    var thisRequest = ++requestId;
    trigger = previewTrigger;
    revokeCurrentUrl();
    filename.textContent = attachment.name || 'X-ray file';
    overlay.hidden = false;
    document.body.classList.add('xray-preview-open');
    showMessage('Loading preview…', true);
    closeButton.focus();

    if (!global.DentalStorage || typeof global.DentalStorage.getXrayAttachment !== 'function') {
      showMessage('X-ray preview is not available right now.');
      return;
    }

    global.DentalStorage.getXrayAttachment(attachment.id).then(function (stored) {
      if (thisRequest !== requestId) return;
      if (!stored || !stored.file || !(stored.file instanceof global.Blob)) {
        throw new Error('The original X-ray file is not available in this browser.');
      }

      var kind = getKind({
        name: stored.name || attachment.name,
        type: stored.type || attachment.type
      });
      if (!kind) {
        showMessage('Preview is available for images and PDFs. DICOM files need a dedicated viewer.');
        return;
      }

      currentUrl = URL.createObjectURL(stored.file);
      viewer.textContent = '';
      viewer.setAttribute('aria-busy', 'false');
      if (kind === 'image') {
        var image = document.createElement('img');
        image.className = 'xray-preview__image';
        image.alt = 'X-ray preview: ' + (stored.name || attachment.name);
        image.addEventListener('error', function () {
          if (thisRequest !== requestId) return;
          revokeCurrentUrl();
          showMessage('This image file could not be displayed.');
        });
        image.src = currentUrl;
        viewer.appendChild(image);
        return;
      }

      var documentPreview = document.createElement('iframe');
      documentPreview.className = 'xray-preview__document';
      documentPreview.title = 'PDF X-ray preview: ' + (stored.name || attachment.name);
      documentPreview.src = currentUrl;
      viewer.appendChild(documentPreview);
    }).catch(function (error) {
      if (thisRequest !== requestId) return;
      console.error('Could not preview X-ray:', error);
      showMessage(error.message || 'The X-ray preview could not be loaded.');
    });
  }

  if (closeButton) closeButton.addEventListener('click', close);
  if (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlay && !overlay.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  });

  global.DentalXrayPreview = {
    getKind: getKind,
    open: open
  };
})(window);
