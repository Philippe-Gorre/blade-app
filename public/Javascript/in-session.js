(function () {
  'use strict';

  var todayEl = document.getElementById('doctor-today');
  var readyCountEl = document.getElementById('ready-count');
  var readyListEl = document.getElementById('ready-patients');
  var sessionCountEl = document.getElementById('session-count');
  var activeSessionsEl = document.getElementById('active-sessions');
  var completedCountEl = document.getElementById('completed-count');
  var completedSessionsEl = document.getElementById('completed-sessions');
  var startModal = document.getElementById('start-session-modal');
  var startSummaryEl = document.getElementById('start-session-summary');
  var confirmStartBtn = document.getElementById('confirm-start-session');
  var closeStartBtn = document.getElementById('close-start-session');
  var cancelStartBtn = document.getElementById('cancel-start-session');
  var activeRecord = null;
  var toastTimer = null;
  var maximizedSessionId = null;

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function fullName(patient) {
    return ((patient.firstName || '') + ' ' + (patient.lastName || '')).trim() || 'Patient';
  }

  function makeElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showToast(message) {
    var toast = document.getElementById('doctor-toast');
    if (!toast) {
      toast = makeElement('div', 'doctor-toast');
      toast.id = 'doctor-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3500);
  }

  function getRecords() {
    var schedule = window.DentalStorage.getScheduleForDate(localDateKey(new Date()));
    var records = [];
    schedule.forEach(function (row) {
      [1, 2].forEach(function (chair) {
        var slot = chair === 1 ? row.chair1 : row.chair2;
        if (slot && slot.patientName) {
          records.push({
            date: localDateKey(new Date()),
            time: row.time,
            chair: chair,
            slot: slot
          });
        }
      });
    });
    return records;
  }

  function getPatient(slot) {
    if (slot.patientId && typeof window.DentalStorage.getPatientById === 'function') {
      var linked = window.DentalStorage.getPatientById(slot.patientId);
      if (linked) return linked;
    }
    if (typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(slot.patientName);
    }
    return null;
  }

  function getLiveSlot(record) {
    var schedule = window.DentalStorage.getScheduleForDate(record.date);
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time).toLowerCase().trim() === String(record.time).toLowerCase().trim()) {
        return record.chair === 1 ? schedule[i].chair1 : schedule[i].chair2;
      }
    }
    return null;
  }

  function saveSlot(record, slot) {
    return window.DentalStorage.setSlotForDate(record.date, record.time, record.chair, slot);
  }

  function updatePatientStatus(slot, status, label, updates) {
    if (!slot.patientId || typeof window.DentalStorage.updatePatient !== 'function') return;
    window.DentalStorage.updatePatient(slot.patientId, Object.assign({
      status: status,
      statusLabel: label
    }, updates || {}));
  }

  function displayStartedAt(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function displaySize(size) {
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function ensureSession(slot, record) {
    var session = slot.session ? Object.assign({}, slot.session) : {};
    session.id = session.id || record.date + '-' + record.time + '-chair-' + record.chair;
    session.startedAt = session.startedAt || new Date().toISOString();
    session.xrays = Array.isArray(session.xrays) ? session.xrays : [];
    return session;
  }

  function appointmentMeta(record) {
    var dateLabel = record.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return dateLabel + ' · ' + record.time + ' · Chair ' + record.chair + (record.chair === 1 ? ' (Dr. Mora)' : ' (Dr. Silva)');
  }

  function emptyMessage(container, text) {
    container.textContent = '';
    container.appendChild(makeElement('p', 'doctor-empty', text));
  }

  function openStartModal(record) {
    activeRecord = record;
    var patient = getPatient(record.slot);
    startSummaryEl.textContent = 'Start a session for ' +
      (patient ? fullName(patient) : record.slot.patientName) + ' — ' +
      (record.slot.service || 'Appointment') + ', ' + appointmentMeta(record) + '?';
    startModal.hidden = false;
    confirmStartBtn.focus();
  }

  function closeStartModal() {
    startModal.hidden = true;
    activeRecord = null;
  }

  function renderReady(records) {
    var ready = records.filter(function (record) { return record.slot.status === 'seated'; });
    readyCountEl.textContent = String(ready.length);
    if (ready.length === 0) {
      emptyMessage(readyListEl, 'No patients are waiting for the doctor.');
      return;
    }

    readyListEl.textContent = '';
    ready.forEach(function (record) {
      var patient = getPatient(record.slot);
      var appointment = makeElement('article', 'doctor-appointment');
      var details = makeElement('div');
      details.appendChild(makeElement('p', 'doctor-appointment__time', record.time));
      details.appendChild(makeElement('h3', 'doctor-appointment__name',
        patient ? fullName(patient) : record.slot.patientName));
      details.appendChild(makeElement('p', 'doctor-appointment__meta',
        (record.slot.service || 'Appointment') + ' · Chair ' + record.chair));
      if (patient && patient.note) {
        details.appendChild(makeElement('p', 'doctor-appointment__meta', 'Front desk: ' + patient.note));
      }

      appointment.appendChild(details);
      appointment.appendChild(makeElement('span', 'doctor-badge', 'Seated for doctor'));
      var startButton = makeElement('button', 'doctor-button doctor-appointment__button', 'Review and start');
      startButton.type = 'button';
      startButton.addEventListener('click', function () { openStartModal(record); });
      appointment.appendChild(startButton);
      readyListEl.appendChild(appointment);
    });
  }

  function updateSessionSummary(session, element, paymentInput, treatmentName) {
    var payment = paymentInput ? paymentInput.value : session.paymentAmount;
    var paymentSummary = payment ? 'Payment ' + Number(payment).toFixed(2) : 'No payment amount yet';
    element.textContent = 'Main treatment: ' + treatmentName + ' · ' +
      (session.xrays || []).length + ' X-rays attached · ' + paymentSummary;
  }

  function renderXrays(record, session, list, uploadInput, message) {
    list.textContent = '';
    var attachments = session.xrays || [];
    if (attachments.length === 0) {
      list.appendChild(makeElement('p', 'doctor-muted', 'No X-rays attached yet.'));
    }
    attachments.forEach(function (attachment) {
      var row = makeElement('div', 'doctor-xray-file');
      row.appendChild(makeElement('span', '', attachment.name + ' · ' + displaySize(attachment.size)));
      var remove = makeElement('button', '', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        window.DentalStorage.deleteXrayAttachment(attachment.id).then(function () {
          var current = getLiveSlot(record);
          if (current && current.status === 'in-session') {
            var updatedSession = ensureSession(current, record);
            updatedSession.xrays = updatedSession.xrays.filter(function (item) {
              return item.id !== attachment.id;
            });
            current.session = updatedSession;
            saveSlot(record, current);
          }
          renderAll();
          showToast('X-ray removed from the session.');
        }).catch(function (error) {
          console.error('Could not remove X-ray:', error);
          message.textContent = error.message || 'The X-ray could not be removed.';
        });
      });
      row.appendChild(remove);
      list.appendChild(row);
    });

    uploadInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(uploadInput.files || []);
      if (!files.length) return;
      message.textContent = 'Uploading X-ray files…';

      files.reduce(function (chain, file) {
        return chain.then(function () {
          if (!(/^image\//.test(file.type) || file.type === 'application/pdf' ||
              /\.(dcm|dicom)$/i.test(file.name))) {
            throw new Error('Choose an image, PDF, or DICOM X-ray file.');
          }
          return window.DentalStorage.saveXrayAttachment(session.id, file).then(function (attachment) {
            var current = getLiveSlot(record);
            if (!current || current.status !== 'in-session') {
              return window.DentalStorage.deleteXrayAttachment(attachment.id).then(function () {
                throw new Error('This session is no longer active. The X-ray was not attached.');
              });
            }
            var updatedSession = ensureSession(current, record);
            updatedSession.xrays.push(attachment);
            current.session = updatedSession;
            saveSlot(record, current);
          });
        });
      }, Promise.resolve()).then(function () {
        var successMessage = files.length + ' X-ray file' + (files.length === 1 ? '' : 's') + ' attached.';
        renderAll();
        showToast(successMessage);
      }).catch(function (error) {
        console.error('Could not upload X-ray:', error);
        message.textContent = error.message || 'The X-ray could not be uploaded.';
      }).then(function () {
        uploadInput.value = '';
      });
    });
  }

  function renderActiveSession(record) {
    var slot = record.slot;
    var session = ensureSession(slot, record);
    var patient = getPatient(slot) || {
      firstName: slot.patientName,
      lastName: '',
      phone: '',
      lastVisit: '',
      medicalAlerts: '',
      note: ''
    };
    var card = makeElement('article', 'doctor-session');
    card.classList.toggle('is-maximized', maximizedSessionId === session.id);
    var main = makeElement('div', 'doctor-session__main');
    var completion = makeElement('aside', 'doctor-session__complete');
    var toolbar = makeElement('div', 'doctor-session__toolbar');
    var identity = makeElement('div', 'doctor-session__identity');
    var initials = (patient.firstName.charAt(0) + (patient.lastName || '').charAt(0)).toUpperCase() || 'PT';
    identity.appendChild(makeElement('span', 'doctor-avatar', initials));
    var identityText = makeElement('div');
    identityText.appendChild(makeElement('h3', '', fullName(patient)));
    identityText.appendChild(makeElement('p', '', (slot.service || 'Appointment') + ' · ' + appointmentMeta(record)));
    identityText.appendChild(makeElement('p', '', 'Session started ' + displayStartedAt(session.startedAt)));
    identity.appendChild(identityText);
    toolbar.appendChild(identity);
    var maximizeButton = makeElement('button', 'doctor-button doctor-button--secondary doctor-session__maximize',
      maximizedSessionId === session.id ? 'Minimize' : 'Maximize');
    maximizeButton.type = 'button';
    maximizeButton.setAttribute('aria-expanded', String(maximizedSessionId === session.id));
    maximizeButton.setAttribute('aria-label',
      maximizedSessionId === session.id ? 'Minimize patient details' : 'Maximize patient details');
    maximizeButton.addEventListener('click', function () {
      var isMaximized = maximizedSessionId !== session.id;
      var cards = activeSessionsEl.querySelectorAll('.doctor-session');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.remove('is-maximized');
        var cardButton = cards[i].querySelector('.doctor-session__maximize');
        cardButton.textContent = 'Maximize';
        cardButton.setAttribute('aria-expanded', 'false');
        cardButton.setAttribute('aria-label', 'Maximize patient details');
      }
      maximizedSessionId = isMaximized ? session.id : null;
      card.classList.toggle('is-maximized', isMaximized);
      document.body.classList.toggle('doctor-session-maximized', isMaximized);
      maximizeButton.textContent = isMaximized ? 'Minimize' : 'Maximize';
      maximizeButton.setAttribute('aria-expanded', String(isMaximized));
      maximizeButton.setAttribute('aria-label',
        isMaximized ? 'Minimize patient details' : 'Maximize patient details');
    });
    toolbar.appendChild(maximizeButton);
    main.appendChild(toolbar);

    var facts = makeElement('dl', 'doctor-facts');
    [
      ['Phone', patient.phone || 'Not provided', ''],
      ['Last visit', patient.lastVisit || 'Not recorded', ''],
      ['Medical alerts', patient.medicalAlerts || 'Not recorded — check chart', 'doctor-fact--alert']
    ].forEach(function (item) {
      var fact = makeElement('div', 'doctor-fact ' + item[2]);
      fact.appendChild(makeElement('dt', '', item[0]));
      fact.appendChild(makeElement('dd', '', item[1]));
      facts.appendChild(fact);
    });
    main.appendChild(facts);

    var note = makeElement('div', 'doctor-session__note');
    note.appendChild(makeElement('h4', '', 'From the front desk'));
    note.appendChild(makeElement('p', '', patient.note || 'No front desk note recorded.'));
    main.appendChild(note);

    var treatment = makeElement('section', 'doctor-treatment');
    var treatmentName = slot.service || 'Appointment';
    treatment.appendChild(makeElement('h4', '', 'Main treatment'));
    treatment.appendChild(makeElement('p', 'doctor-treatment__main', treatmentName));
    var xray = makeElement('section', 'doctor-xrays');
    xray.appendChild(makeElement('h4', '', 'X-rays'));
    var xrayList = makeElement('div', 'doctor-xrays__list');
    var uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*,.pdf,.dcm,.dicom,application/dicom';
    uploadInput.multiple = true;
    uploadInput.setAttribute('aria-label', 'Upload X-ray files');
    var uploadMessage = makeElement('p', 'doctor-upload-message');
    xray.appendChild(xrayList);
    xray.appendChild(uploadInput);
    xray.appendChild(uploadMessage);
    main.appendChild(treatment);
    main.appendChild(xray);

    completion.appendChild(makeElement('h3', '', 'Complete session'));
    completion.appendChild(makeElement('p', '', 'Add the treatment payment amount before completing.'));
    var paymentField = makeElement('div', 'doctor-payment-field');
    var paymentLabel = makeElement('label', '', 'Payment amount');
    var paymentInput = document.createElement('input');
    paymentInput.type = 'number';
    paymentInput.min = '0.01';
    paymentInput.step = '0.01';
    paymentInput.placeholder = '0.00';
    paymentInput.value = session.paymentAmount || '';
    paymentInput.required = true;
    paymentInput.setAttribute('aria-label', 'Payment amount');
    paymentField.appendChild(paymentLabel);
    paymentField.appendChild(paymentInput);
    completion.appendChild(paymentField);
    var summary = makeElement('p', 'doctor-session__summary');
    completion.appendChild(summary);
    var completeButton = makeElement('button', 'doctor-button', 'Complete session');
    completeButton.type = 'button';
    var error = makeElement('p', 'doctor-session__error');
    error.hidden = true;
    completion.appendChild(completeButton);
    completion.appendChild(error);
    paymentInput.addEventListener('input', function () {
      updateSessionSummary(session, summary, paymentInput, treatmentName);
    });
    completeButton.addEventListener('click', function () {
      var amount = Number(paymentInput.value);
      if (!paymentInput.value || !isFinite(amount) || amount <= 0) {
        paymentInput.setAttribute('aria-invalid', 'true');
        error.textContent = 'Enter a payment amount greater than zero to complete the session.';
        error.hidden = false;
        paymentInput.focus();
        return;
      }

      var current = getLiveSlot(record);
      if (!current || current.status !== 'in-session') {
        error.textContent = 'This session is no longer active.';
        error.hidden = false;
        return;
      }
      var completedSession = ensureSession(current, record);
      completedSession.paymentAmount = amount.toFixed(2);
      completedSession.completedAt = new Date().toISOString();
      current.session = completedSession;
      current.status = 'completed';
      current.statusLabel = 'Completed';
      saveSlot(record, current);
      updatePatientStatus(current, 'completed', 'Completed', {
        lastVisit: 'Today, ' + record.time,
        lastVisitSummary: current.service || 'Dental appointment'
      });
      if (window.DentalStorage && typeof window.DentalStorage.addInvoice === 'function') {
        window.DentalStorage.addInvoice({
          patientId: current.patientId || null,
          patientName: current.patientName,
          service: current.service || 'Dental treatment',
          amount: amount,
          status: 'Paid',
          method: 'Cash'
        });
      }
      showToast('Session completed, payment recorded, and invoice saved to Billing.');
      renderAll();
    });

    updateSessionSummary(session, summary, paymentInput, treatmentName);
    renderXrays(record, session, xrayList, uploadInput, uploadMessage);
    card.appendChild(main);
    card.appendChild(completion);
    return card;
  }

  function renderActive(records) {
    var active = records.filter(function (record) { return record.slot.status === 'in-session'; });
    sessionCountEl.textContent = String(active.length);
    if (!active.some(function (record) {
      return ensureSession(record.slot, record).id === maximizedSessionId;
    })) {
      maximizedSessionId = null;
      document.body.classList.remove('doctor-session-maximized');
    }
    if (!active.length) {
      emptyMessage(activeSessionsEl, 'No patient sessions are in progress.');
      return;
    }
    activeSessionsEl.textContent = '';
    active.forEach(function (record) {
      activeSessionsEl.appendChild(renderActiveSession(record));
    });
  }

  function renderCompleted(records) {
    var completed = records.filter(function (record) {
      return record.slot.status === 'completed' && record.slot.session;
    });
    completedCountEl.textContent = String(completed.length);
    if (!completed.length) {
      emptyMessage(completedSessionsEl, 'No sessions have been completed today.');
      return;
    }
    completedSessionsEl.textContent = '';
    completed.forEach(function (record) {
      var patient = getPatient(record.slot);
      var row = makeElement('article', 'doctor-appointment');
      var details = makeElement('div');
      details.appendChild(makeElement('p', 'doctor-appointment__time', record.time));
      details.appendChild(makeElement('h3', 'doctor-appointment__name',
        patient ? fullName(patient) : record.slot.patientName));
      details.appendChild(makeElement('p', 'doctor-appointment__meta',
        (record.slot.service || 'Appointment') + ' · Chair ' + record.chair));
      row.appendChild(details);
      row.appendChild(makeElement('span', 'doctor-badge', 'Completed'));
      row.appendChild(makeElement('span', 'doctor-completed-payment',
        'Payment ' + Number(record.slot.session.paymentAmount || 0).toFixed(2)));
      completedSessionsEl.appendChild(row);
    });
  }

  function renderAll() {
    var today = new Date();
    todayEl.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    var records = getRecords();
    renderReady(records);
    renderActive(records);
    renderCompleted(records);
  }

  confirmStartBtn.addEventListener('click', function () {
    if (!activeRecord) return;
    var current = getLiveSlot(activeRecord);
    if (!current || current.status !== 'seated') {
      closeStartModal();
      renderAll();
      showToast('This patient is no longer waiting to start.');
      return;
    }
    current.session = ensureSession(current, activeRecord);
    current.status = 'in-session';
    current.statusLabel = 'In session';
    saveSlot(activeRecord, current);
    updatePatientStatus(current, 'in-session', 'In session');
    closeStartModal();
    renderAll();
    showToast('Patient session started.');
  });

  closeStartBtn.addEventListener('click', closeStartModal);
  cancelStartBtn.addEventListener('click', closeStartModal);
  startModal.addEventListener('click', function (event) {
    if (event.target === startModal) closeStartModal();
  });
  startModal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeStartModal();
  });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || maximizedSessionId === null) return;
    maximizedSessionId = null;
    document.body.classList.remove('doctor-session-maximized');
    renderAll();
    var maximizeButton = activeSessionsEl.querySelector('.doctor-session__maximize');
    if (maximizeButton) maximizeButton.focus();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'dental_schedule' || event.key === null) renderAll();
  });

  renderAll();
})();
