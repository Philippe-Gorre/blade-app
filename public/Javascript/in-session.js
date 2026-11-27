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

  function getChairsList() {
    return (window.DentalStorage && typeof window.DentalStorage.getChairs === 'function')
      ? window.DentalStorage.getChairs()
      : [];
  }

  function getRecords() {
    var chairs = getChairsList();
    var schedule = window.DentalStorage.getScheduleForDate(localDateKey(new Date()));
    var records = [];
    schedule.forEach(function (row) {
      chairs.forEach(function (chairObj) {
        var chair = chairObj.id;
        var slot = row['chair' + chair] || null;
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
      return null;
    }
    if (typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(slot.patientName);
    }
    return null;
  }

  function getLiveSlot(record) {
    var schedule = window.DentalStorage.getScheduleForDate(record.date);
    var key = 'chair' + Number(record.chair);
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time).toLowerCase().trim() === String(record.time).toLowerCase().trim()) {
        return schedule[i][key] || null;
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
    var dentist = window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function'
      ? window.DentalStorage.getDentistName(record.chair)
      : ('Doctor ' + record.chair);
    return dateLabel + ' · ' + record.time + ' · Chair ' + record.chair + ' (' + dentist + ')';
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
    var treatmentPlan = slot.treatmentPlan ||
      window.DentalStorage.getServiceTreatmentPlan(slot.service || 'Appointment');
    identityText.appendChild(makeElement('p', '', (slot.service || 'Appointment') + ' · ' + appointmentMeta(record)));
    identityText.appendChild(makeElement('p', '', 'Treatment session ' +
      (Number(treatmentPlan.sessionNumber) || 1) + ' of ' + (Number(treatmentPlan.totalSessions) || 1)));
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
    var hasFollowUp = (Number(treatmentPlan.sessionNumber) || 1) < (Number(treatmentPlan.totalSessions) || 1);
    completion.appendChild(makeElement('p', '', hasFollowUp
      ? 'Enter the gap to the next session. The follow-up will keep this chair and time; if that date is occupied, the next available date will be used.'
      : 'Finish the treatment, then enter its final price in Completed today to send it to the front desk.'));
    var completeButton = makeElement('button', 'doctor-button', 'Complete session');
    completeButton.type = 'button';
    var error = makeElement('p', 'doctor-session__error');
    error.hidden = true;
    completion.appendChild(completeButton);
    completion.appendChild(error);
    var followUpForm = null;
    if (hasFollowUp) {
      followUpForm = makeElement('form', 'doctor-follow-up-form');
      followUpForm.hidden = true;
      var gapField = makeElement('label', 'doctor-payment-field');
      gapField.appendChild(makeElement('span', '', 'Gap before the next session'));
      var gapInput = document.createElement('input');
      gapInput.type = 'number';
      gapInput.min = '1';
      gapInput.max = '365';
      gapInput.step = '1';
      gapInput.required = true;
      gapInput.value = String(Number(treatmentPlan.gapValue) || 4);
      gapInput.setAttribute('aria-label', 'Gap amount');
      gapField.appendChild(gapInput);
      var unitSelect = document.createElement('select');
      unitSelect.className = 'doctor-follow-up-form__unit';
      unitSelect.setAttribute('aria-label', 'Gap unit');
      [
        { value: 'days', label: 'Days' },
        { value: 'weeks', label: 'Weeks' },
        { value: 'months', label: 'Months' }
      ].forEach(function (unit) {
        var option = document.createElement('option');
        option.value = unit.value;
        option.textContent = unit.label;
        option.selected = treatmentPlan.gapUnit === unit.value;
        unitSelect.appendChild(option);
      });
      var confirmFollowUp = makeElement('button', 'doctor-button', 'Complete & book next session');
      confirmFollowUp.type = 'submit';
      var cancelFollowUp = makeElement('button', 'doctor-button doctor-button--secondary', 'Cancel');
      cancelFollowUp.type = 'button';
      followUpForm.appendChild(gapField);
      followUpForm.appendChild(unitSelect);
      followUpForm.appendChild(confirmFollowUp);
      followUpForm.appendChild(cancelFollowUp);
      completion.appendChild(followUpForm);
      cancelFollowUp.addEventListener('click', function () {
        followUpForm.hidden = true;
        completeButton.hidden = false;
        error.hidden = true;
      });
      followUpForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!followUpForm.reportValidity()) return;
        error.hidden = true;
        var current = getLiveSlot(record);
        if (!current || current.status !== 'in-session') {
          error.textContent = 'This session is no longer active.';
          error.hidden = false;
          return;
        }
        try {
          var booking = window.DentalStorage.bookFollowUpSession(record, Number(gapInput.value), unitSelect.value);
          current = getLiveSlot(record);
          if (!current || current.status !== 'in-session') {
            throw new Error('The active session changed before it could be completed.');
          }
          var completedSession = ensureSession(current, record);
          completedSession.completedAt = new Date().toISOString();
          current.session = completedSession;
          current.status = 'completed';
          current.statusLabel = 'Completed';
          current.treatmentPlan = Object.assign({}, current.treatmentPlan || treatmentPlan, {
            gapValue: Number(gapInput.value),
            gapUnit: unitSelect.value
          });
          current.followUpAppointment = {
            date: booking.date,
            time: record.time,
            chair: record.chair
          };
          saveSlot(record, current);
          var savedCurrent = getLiveSlot(record);
          if (!savedCurrent || savedCurrent.status !== 'completed') {
            throw new Error('The follow-up was booked, but this session could not be marked complete. Please contact the front desk.');
          }
          updatePatientStatus(current, 'completed', 'Completed', {
            lastVisit: 'Today, ' + record.time,
            lastVisitSummary: current.service || 'Dental appointment'
          });
          var moved = booking.date !== booking.requestedDate
            ? ' The requested date was occupied, so it was moved to ' + booking.date + '.'
            : '';
          showToast('Next session booked for ' + booking.date + ' at ' + record.time + '.' + moved);
          renderAll();
        } catch (bookingError) {
          error.textContent = bookingError.message || 'The next session could not be booked.';
          error.hidden = false;
        }
      });
    }

    completeButton.addEventListener('click', function () {
      if (hasFollowUp) {
        completeButton.hidden = true;
        followUpForm.hidden = false;
        error.hidden = true;
        gapInput.focus();
        return;
      }
      var current = getLiveSlot(record);
      if (!current || current.status !== 'in-session') {
        error.textContent = 'This session is no longer active.';
        error.hidden = false;
        return;
      }
      var completedSession = ensureSession(current, record);
      completedSession.completedAt = new Date().toISOString();
      current.session = completedSession;
      current.status = 'completed';
      current.statusLabel = 'Completed';
      saveSlot(record, current);
      updatePatientStatus(current, 'completed', 'Completed', {
        lastVisit: 'Today, ' + record.time,
        lastVisitSummary: current.service || 'Dental appointment'
      });
      showToast('Session completed. Enter the final payment amount under Completed today.');
      renderAll();
    });

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
      var session = record.slot.session;
      if (session.paymentAmount) {
        var handoffLabel = session.paymentInvoiceId ? 'Sent to front desk' : 'Payment already recorded';
        row.appendChild(makeElement('span', 'doctor-completed-payment',
          handoffLabel + ' · ' + Number(session.paymentAmount).toFixed(2)));
      } else {
        var handoffForm = makeElement('form', 'doctor-payment-handoff');
        var paymentField = makeElement('label', 'doctor-payment-field');
        paymentField.appendChild(makeElement('span', '', 'Payment amount'));
        var paymentInput = document.createElement('input');
        paymentInput.type = 'number';
        paymentInput.min = '0.01';
        paymentInput.step = '0.01';
        paymentInput.placeholder = '0.00';
        paymentInput.required = true;
        paymentInput.setAttribute('aria-label', 'Payment amount for ' + (patient ? fullName(patient) : record.slot.patientName));
        paymentField.appendChild(paymentInput);
        handoffForm.appendChild(paymentField);
        var sendButton = makeElement('button', 'doctor-button doctor-payment-handoff__button', 'Send to front desk');
        sendButton.type = 'submit';
        handoffForm.appendChild(sendButton);
        var handoffError = makeElement('p', 'doctor-session__error');
        handoffError.hidden = true;
        handoffForm.appendChild(handoffError);
        handoffForm.addEventListener('submit', function (event) {
          event.preventDefault();
          var amount = Number(paymentInput.value);
          if (!paymentInput.value || !isFinite(amount) || amount <= 0) {
            paymentInput.setAttribute('aria-invalid', 'true');
            handoffError.textContent = 'Enter a payment amount greater than zero.';
            handoffError.hidden = false;
            paymentInput.focus();
            return;
          }
          if (!window.DentalStorage || typeof window.DentalStorage.addInvoice !== 'function') {
            handoffError.textContent = 'Payment handoff is unavailable. Try again later.';
            handoffError.hidden = false;
            return;
          }
          var current = getLiveSlot(record);
          if (!current || current.status !== 'completed' || !current.session) {
            handoffError.textContent = 'This completed session could not be found.';
            handoffError.hidden = false;
            return;
          }
          var currentSession = ensureSession(current, record);
          if (currentSession.paymentAmount || currentSession.paymentInvoiceId) {
            renderAll();
            return;
          }
          try {
            var invoice = window.DentalStorage.addInvoice({
              patientId: current.patientId || null,
              patientName: current.patientName,
              service: current.service || 'Dental treatment',
              amount: amount,
              status: 'Due'
            });
            currentSession.paymentAmount = amount.toFixed(2);
            currentSession.paymentInvoiceId = invoice.id;
            currentSession.paymentSentAt = new Date().toISOString();
            current.session = currentSession;
            saveSlot(record, current);
            if (typeof window.DentalStorage.addNotification === 'function') {
              window.DentalStorage.addNotification({
                title: 'Payment ready for collection',
                meta: current.patientName + ' · ' + (current.service || 'Dental treatment') +
                  ' · ' + amount.toFixed(2),
                href: '/billing'
              });
            }
            showToast('Payment amount sent to the front desk for collection.');
            renderAll();
          } catch (submissionError) {
            handoffError.textContent = submissionError.message || 'The payment amount could not be sent.';
            handoffError.hidden = false;
          }
        });
        row.appendChild(handoffForm);
      }
      completedSessionsEl.appendChild(row);
    });
  }

  function renderLunchBreaks() {
    var lunchListEl = document.getElementById('lunch-list');
    var lunchForm = document.getElementById('lunch-form');
    var lunchChairEl = document.getElementById('lunch-chair');
    var lunchTimeEl = document.getElementById('lunch-time');
    if (!lunchListEl) return;

    var chairs = getChairsList();
    var takeBtn = document.getElementById('take-lunch-btn');
    if (takeBtn) takeBtn.disabled = chairs.length === 0;
    if (chairs.length === 0) {
      emptyMessage(lunchListEl, 'No doctors registered yet.');
      return;
    }

    var todayKey = localDateKey(new Date());
    var schedule = window.DentalStorage.getScheduleForDate(todayKey);
    var breaks = [];
    schedule.forEach(function (row) {
      chairs.forEach(function (chairObj) {
        var slot = row['chair' + chairObj.id];
        if (slot && slot.type === 'break') {
          breaks.push({ time: row.time, chair: chairObj.id, dentist: chairObj.dentist, slot: slot });
        }
      });
    });

    if (breaks.length === 0) {
      emptyMessage(lunchListEl, 'No lunch breaks scheduled today.');
    } else {
      lunchListEl.textContent = '';
      breaks.forEach(function (item) {
        var row = makeElement('article', 'doctor-appointment');
        var details = makeElement('div');
        details.appendChild(makeElement('p', 'doctor-appointment__time', item.time));
        details.appendChild(makeElement('h3', 'doctor-appointment__name', item.dentist));
        details.appendChild(makeElement('p', 'doctor-appointment__meta', 'Chair ' + item.chair + ' · Lunch break'));
        row.appendChild(details);
        row.appendChild(makeElement('span', 'doctor-badge', 'Lunch break'));
        var cancelBtn = makeElement('button', 'doctor-button doctor-button--secondary', 'Cancel lunch');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', function () {
          window.DentalStorage.clearLunchBreak(todayKey, item.time, item.chair);
          renderAll();
          showToast('Lunch break removed for ' + item.dentist + ' at ' + item.time + '.');
        });
        row.appendChild(cancelBtn);
        lunchListEl.appendChild(row);
      });
    }

    if (lunchForm && !lunchForm.dataset.bound) {
      lunchForm.dataset.bound = '1';
      lunchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var chairVal = lunchChairEl ? Number(lunchChairEl.value) : 0;
        var timeVal = lunchTimeEl ? lunchTimeEl.value : '';
        if (!chairVal || !timeVal) return;
        try {
          var dentist = window.DentalStorage.getDentistName(chairVal);
          window.DentalStorage.setLunchBreak(todayKey, timeVal, chairVal, dentist);
          if (typeof window.DentalStorage.addNotification === 'function') {
            window.DentalStorage.addNotification({
              title: dentist + ' scheduled a lunch break',
              meta: 'Today at ' + timeVal + ' · Chair ' + chairVal,
              href: '/dashboard'
            });
          }
          renderAll();
          showToast('Lunch break set for ' + dentist + ' at ' + timeVal + '.');
        } catch (err) {
          showToast(err.message || 'Could not schedule lunch break.');
        }
      });
    }
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
    renderLunchBreaks();
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
