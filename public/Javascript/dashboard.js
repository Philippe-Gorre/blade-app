/* dashboard.js
   Drives the Dashboard:
   - Current date
   - Live stats (appointments today, checked in, open slots left)
   - Chair schedule table wrap (interactive, synced with persistent storage)
*/
(function () {
  'use strict';

  // ---------- 2. STATE ----------
  var state = {
    activeSlotModal: null, // { time, chair, data }
    isSaving: false
  };

  // ---------- 3. ELEMENTS ----------
  var todayEl = document.getElementById('today');
  var chairGridEl = document.getElementById('chair-grid');

  var statApptsEl = document.getElementById('stat-appointments');
  var statCheckedInEl = document.getElementById('stat-checkedin');
  var statOpenSlotsEl = document.getElementById('stat-openslots');

  // Modals
  var bookModalOverlay = document.getElementById('modal-book-slot');
  var bookForm = document.getElementById('form-book-slot');
  var bookModalTitle = document.getElementById('book-slot-title');
  var closeBookModalBtn = document.getElementById('close-book-modal');
  var cancelBookModalBtn = document.getElementById('cancel-book-modal');

  var manageModalOverlay = document.getElementById('modal-manage-slot');
  var closeManageModalBtn = document.getElementById('close-manage-modal');
  var closeManageBtn = document.getElementById('btn-close-manage');
  var btnCheckinSlot = document.getElementById('btn-checkin-slot');
  var btnSeatSlot = document.getElementById('btn-seat-slot');
  var btnCancelSlot = document.getElementById('btn-cancel-slot');
  var managePatientName = document.getElementById('manage-patient-name');
  var managePatientStatus = document.getElementById('manage-patient-status');
  var manageSlotInfo = document.getElementById('manage-slot-info');
  var manageServiceName = document.getElementById('manage-service-name');
  var managePatientInfo = document.getElementById('manage-patient-info');
  var managePatientNote = document.getElementById('manage-patient-note');
  var managePatientXraysSection = document.getElementById('manage-patient-xrays-section');
  var managePatientXrays = document.getElementById('manage-patient-xrays');
  var manageModalCloseTimer = null;

  // Toast
  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
  var toastTimer = null;

  // ---------- 4. UTILITIES ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  function findPatientByName(name) {
    if (!window.DentalStorage || typeof window.DentalStorage.getPatients !== 'function') return null;
    if (typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(name);
    }

    var normalizedName = String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    var patients = window.DentalStorage.getPatients();

    for (var i = 0; i < patients.length; i++) {
      var patientName = ((patients[i].firstName || '') + ' ' + (patients[i].lastName || ''))
        .trim().replace(/\s+/g, ' ').toLowerCase();
      if (patientName === normalizedName) return patients[i];
    }
    return null;
  }

  function findPatientForSlot(slot) {
    if (slot.patientId !== undefined && slot.patientId !== null &&
        window.DentalStorage && typeof window.DentalStorage.getPatients === 'function') {
      var patients = window.DentalStorage.getPatients();
      for (var i = 0; i < patients.length; i++) {
        if (String(patients[i].id) === String(slot.patientId)) return patients[i];
      }
    }
    return findPatientByName(slot.patientName);
  }

  function formatFileSize(size) {
    if (typeof size !== 'number' || !isFinite(size) || size < 0) return '';
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function saveBookedPatient(name, time, chairNum, service, status, contact) {
    if (!window.DentalStorage) return null;
    contact = contact || {};

    var existingPatient = findPatientByName(name);
    var parts = String(name || '').trim().split(/\s+/);
    var dentist = chairNum === 1 ? 'Dr. Mora' : 'Dr. Silva';
    var updates = {
      nextVisit: 'Today, ' + time,
      nextVisitDetail: (service || 'Dental care') + ' with ' + dentist + ', Chair ' + chairNum,
      dentist: dentist,
      status: status || 'confirmed',
      statusLabel: status === 'checked-in' ? 'Checked in' : status === 'emergency' ? 'Emergency' : 'Confirmed',
      visitingToday: true
    };

    if (contact.phone) updates.phone = contact.phone;
    if (contact.email) updates.email = contact.email;
    if (contact.note) updates.note = contact.note;

    if (existingPatient) {
      return window.DentalStorage.updatePatient(existingPatient.id, updates);
    }

    if (typeof window.DentalStorage.addPatient !== 'function') return null;
    var now = new Date();
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return window.DentalStorage.addPatient(Object.assign({
      firstName: parts[0] || 'Patient',
      lastName: parts.slice(1).join(' '),
      lastVisit: 'None yet',
      phone: contact.phone || '',
      email: contact.email || '',
      dentist: dentist,
      patientSince: months[now.getMonth()] + ' ' + now.getFullYear(),
      isNew: true,
      note: contact.note || '',
      history: []
    }, updates));
  }

  // ---------- 5. TODAY DATE ----------
  function renderTodayDate() {
    if (!todayEl) return;
    var d = new Date();
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    todayEl.textContent = days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ---------- 6. STATS CALCULATION ----------
  function renderStats() {
    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    var totalAppts = 0;
    var checkedInCount = 0;
    var openCount = 0;

    schedule.forEach(function (row) {
      [row.chair1, row.chair2].forEach(function (slot) {
        if (!slot) {
          openCount++;
        } else if (slot.type === 'break') {
          // Breaks do not count towards open slots or appointments
        } else if (slot.patientName) {
          totalAppts++;
          if (slot.status === 'checked-in') {
            checkedInCount++;
          }
        }
      });
    });

    if (statApptsEl) statApptsEl.textContent = totalAppts;
    if (statCheckedInEl) statCheckedInEl.textContent = checkedInCount;
    if (statOpenSlotsEl) statOpenSlotsEl.textContent = openCount;
  }

  // ---------- 7. TABLE WRAP (CHAIR GRID) ----------
  function pillStatusHtml(status, label) {
    if (status === 'checked-in') {
      return '<span class="pill pill--violet">' + (label || 'Checked in') + '</span>';
    }
    if (status === 'seated' || status === 'in-session') {
      return '<span class="pill pill--violet">' + (label || (status === 'seated' ? 'Seated for doctor' : 'In session')) + '</span>';
    }
    if (status === 'emergency') {
      return '<span class="pill pill--white-red">' + (label || 'Emergency') + '</span>';
    }
    return '<span class="pill pill--green">' + (label || 'Confirmed') + '</span>';
  }

  function buildChairSlot(time, chairNum, slot) {
    // 1. Break slot
    if (slot && slot.type === 'break') {
      var breakBox = el('div', 'slot slot--break', slot.label || 'Lunch break');
      return breakBox;
    }

    // 2. Open slot
    if (!slot || !slot.patientName) {
      var openBox = el('div', 'slot slot--open');
      openBox.setAttribute('role', 'button');
      openBox.setAttribute('tabindex', '0');
      openBox.setAttribute('title', 'Click to book ' + time + ', Chair ' + chairNum);
      openBox.appendChild(el('span', '', 'Open'));

      var addBtn = el('button', 'link btn-add-slot', 'Add');
      addBtn.type = 'button';
      addBtn.setAttribute('data-time', time);
      addBtn.setAttribute('data-chair', chairNum);
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openBookModal(time, chairNum);
      });
      openBox.addEventListener('click', function () {
        openBookModal(time, chairNum);
      });
      openBox.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openBookModal(time, chairNum);
        }
      });
      openBox.appendChild(addBtn);
      return openBox;
    }

    // 3. Booked slot
    var slotClass = 'slot';
    if (slot.status === 'checked-in') {
      slotClass += ' slot--checkedin';
    } else if (slot.status === 'seated' || slot.status === 'in-session') {
      slotClass += ' slot--checkedin';
    } else if (slot.status === 'emergency') {
      slotClass += ' slot--emergency';
    } else {
      slotClass += ' slot--appt';
    }

    var bookedBox = el('div', slotClass);
    bookedBox.setAttribute('data-has-appt', 'true');
    bookedBox.setAttribute('role', 'button');
    bookedBox.setAttribute('tabindex', '0');
    bookedBox.setAttribute('title', 'Click to manage appointment');

    var row = el('div', 'slot__row');
    row.appendChild(el('strong', '', slot.patientName));
    row.insertAdjacentHTML('beforeend', pillStatusHtml(slot.status, slot.statusLabel));
    bookedBox.appendChild(row);

    if (slot.service) {
      var todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      bookedBox.appendChild(el('span', 'slot__sub', (slot.date || todayStr) + ' · ' + slot.service));
    } else {
      var fallbackDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      bookedBox.appendChild(el('span', 'slot__sub', slot.date || fallbackDate));
    }

    bookedBox.addEventListener('click', function () {
      openManageModal(time, chairNum, slot);
    });
    bookedBox.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openManageModal(time, chairNum, slot);
      }
    });

    return bookedBox;
  }

  function renderSchedule() {
    if (!chairGridEl) return;
    chairGridEl.textContent = '';

    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    // Header cells
    chairGridEl.appendChild(el('div')); // Empty corner

    var chair1Head = el('div', 'chair-head');
    chair1Head.appendChild(el('strong', '', 'Chair 1'));
    chair1Head.appendChild(el('span', 'muted', 'Dr. Mora'));
    chairGridEl.appendChild(chair1Head);

    var chair2Head = el('div', 'chair-head');
    chair2Head.appendChild(el('strong', '', 'Chair 2'));
    chair2Head.appendChild(el('span', 'muted', 'Dr. Silva'));
    chairGridEl.appendChild(chair2Head);

    // Rows
    schedule.forEach(function (row) {
      // Time label
      chairGridEl.appendChild(el('div', 'time', row.time));

      // Chair 1
      chairGridEl.appendChild(buildChairSlot(row.time, 1, row.chair1));

      // Chair 2
      chairGridEl.appendChild(buildChairSlot(row.time, 2, row.chair2));
    });
  }

  // ---------- 8. MODAL ACTIONS (SLOT BOOKING & MANAGING) ----------
  function openBookModal(time, chairNum) {
    if (!bookModalOverlay) return;
    state.activeSlotModal = { time: time, chair: chairNum };
    var chairName = chairNum === 1 ? 'Chair 1 (Dr. Mora)' : 'Chair 2 (Dr. Silva)';
    if (bookModalTitle) bookModalTitle.textContent = 'Book ' + chairName + ' at ' + time;

    if (bookForm) bookForm.reset();
    bookModalOverlay.hidden = false;
    setTimeout(function () {
      var nameInp = document.getElementById('slot-patient-first-name');
      if (nameInp) nameInp.focus();
    }, 60);
  }

  function closeBookModal() {
    if (bookModalOverlay) bookModalOverlay.hidden = true;
    state.activeSlotModal = null;
  }

  if (closeBookModalBtn) closeBookModalBtn.addEventListener('click', closeBookModal);
  if (cancelBookModalBtn) cancelBookModalBtn.addEventListener('click', closeBookModal);

  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.activeSlotModal || state.isSaving) return;

      var firstName = document.getElementById('slot-patient-first-name').value.trim().replace(/\s+/g, ' ');
      var lastName = document.getElementById('slot-patient-last-name').value.trim().replace(/\s+/g, ' ');
      var phone = document.getElementById('slot-patient-phone').value.trim();
      var email = document.getElementById('slot-patient-email').value.trim();
      var note = document.getElementById('slot-note').value.trim();
      var name = (firstName + ' ' + lastName).trim();
      var service = document.getElementById('slot-service').value;
      var status = document.getElementById('slot-status').value;
      var statusLabel = status === 'emergency' ? 'Emergency' : status === 'checked-in' ? 'Checked in' : 'Confirmed';

      if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
        showToast('Enter first and last names up to 80 characters.');
        return;
      }
      if (!window.DentalStorage.isValidPhoneNumber(phone)) {
        showToast('Enter a valid phone number with 7 to 15 digits.');
        return;
      }
      if (!window.DentalStorage.isValidEmailAddress(email)) {
        showToast('Enter a valid email address or leave it blank.');
        return;
      }
      if (!service || ['confirmed', 'emergency', 'checked-in'].indexOf(status) < 0) {
        showToast('Choose a valid service and appointment status.');
        return;
      }

      var bookedTime = state.activeSlotModal.time;
      var bookedChair = state.activeSlotModal.chair;
      var schedule = window.DentalStorage.getSchedule();
      var timeRow = null;
      for (var i = 0; i < schedule.length; i++) {
        if (String(schedule[i].time).trim().toLowerCase() === bookedTime.toLowerCase()) {
          timeRow = schedule[i];
          break;
        }
      }
      var occupiedSlot = timeRow && (bookedChair === 1 ? timeRow.chair1 : timeRow.chair2);
      if (occupiedSlot) {
        showToast('That chair is already booked at ' + bookedTime + '. Refresh the schedule and choose another slot.');
        renderSchedule();
        return;
      }
      if (window.DentalStorage.hasPatientAtTime(schedule, name, bookedTime)) {
        showToast(name + ' already has an appointment at ' + bookedTime + '.');
        return;
      }

      state.isSaving = true;
      try {
        var patient = saveBookedPatient(name, bookedTime, bookedChair, service, status, {
          phone: phone,
          email: email,
          note: note
        });
        if (!patient) throw new Error('The patient record could not be saved.');

        var slotData = {
          patientId: patient.id,
          patientName: name,
          service: service,
          status: status,
          statusLabel: statusLabel
        };
        window.DentalStorage.setSlot(bookedTime, bookedChair, slotData);

        var savedSchedule = window.DentalStorage.getSchedule();
        var savedRow = savedSchedule.find(function (row) {
          return String(row.time).trim().toLowerCase() === bookedTime.toLowerCase();
        });
        var savedSlot = savedRow && (bookedChair === 1 ? savedRow.chair1 : savedRow.chair2);
        if (!savedSlot || String(savedSlot.patientId) !== String(patient.id)) {
          throw new Error('The appointment could not be saved. Please try again.');
        }

        closeBookModal();
        renderSchedule();
        renderStats();
        showToast('Booked ' + name + ' for ' + bookedTime);
      } catch (error) {
        console.error('Could not book appointment from dashboard:', error);
        showToast(error.message || 'The appointment could not be booked.');
      } finally {
        state.isSaving = false;
      }
    });
  }

  function openManageModal(time, chairNum, slot) {
    if (!manageModalOverlay) return;
    state.activeSlotModal = { time: time, chair: chairNum, slot: slot };
    clearTimeout(manageModalCloseTimer);
    manageModalOverlay.classList.remove('is-closing');

    if (managePatientName) managePatientName.textContent = slot.patientName;
    if (managePatientStatus) {
      managePatientStatus.textContent = slot.statusLabel || (slot.status === 'checked-in' ? 'Checked in' : 'Confirmed');
      managePatientStatus.className = slot.status === 'checked-in'
        ? 'pill pill--violet'
        : slot.status === 'seated' || slot.status === 'in-session'
          ? 'pill pill--violet'
        : slot.status === 'emergency'
          ? 'pill pill--white-red'
          : 'pill pill--green';
    }
    if (manageSlotInfo) {
      var doc = chairNum === 1 ? 'Dr. Mora' : 'Dr. Silva';
      var dateLabel = slot.date || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      manageSlotInfo.textContent = dateLabel + ' • ' + time + ' • Chair ' + chairNum + ' (' + doc + ')';
    }
    if (manageServiceName) {
      manageServiceName.textContent = slot.service || 'Appointment';
    }

    var patient = findPatientForSlot(slot);
    if (managePatientInfo) {
      managePatientInfo.textContent = '';
      [
        ['Phone', patient && patient.phone || 'None provided'],
        ['Email', patient && patient.email || 'None provided'],
        ['Dentist', patient && patient.dentist || (chairNum === 1 ? 'Dr. Mora' : 'Dr. Silva')],
        ['Patient since', patient && patient.patientSince || 'Not available']
      ].forEach(function (item) {
        managePatientInfo.appendChild(el('dt', '', item[0]));
        managePatientInfo.appendChild(el('dd', '', item[1]));
      });
    }
    if (managePatientNote) {
      managePatientNote.textContent = patient && patient.note
        ? patient.note
        : 'No notes recorded.';
    }
    if (managePatientXrays && managePatientXraysSection) {
      managePatientXrays.textContent = '';
      var attachments = slot.session && Array.isArray(slot.session.xrays)
        ? slot.session.xrays
        : [];
      managePatientXraysSection.hidden = attachments.length === 0;
      attachments.forEach(function (attachment) {
        var row = el('div', 'manage-patient-xray');
        row.appendChild(el('span', 'manage-patient-xray__name', attachment.name || 'X-ray file'));
        var size = formatFileSize(attachment.size);
        if (size) row.appendChild(el('span', 'manage-patient-xray__size', size));
        if (window.DentalXrayPreview && window.DentalXrayPreview.getKind(attachment)) {
          var previewButton = el('button', 'manage-patient-xray__preview', 'Preview');
          previewButton.type = 'button';
          previewButton.addEventListener('click', function () {
            window.DentalXrayPreview.open(attachment, previewButton);
          });
          row.appendChild(previewButton);
        } else {
          row.appendChild(el('span', 'manage-patient-xray__unsupported', 'DICOM viewer needed'));
        }
        managePatientXrays.appendChild(row);
      });
    }

    if (btnCheckinSlot) {
      btnCheckinSlot.style.display = slot.status === 'checked-in' || slot.status === 'seated' ||
        slot.status === 'in-session' || slot.status === 'completed' ? 'none' : 'inline-flex';
    }
    if (btnSeatSlot) {
      btnSeatSlot.style.display = slot.status === 'checked-in' ? 'inline-flex' : 'none';
    }
    var btnOpenInSession = document.getElementById('btn-open-insession');
    if (btnOpenInSession) {
      var isDoctorMode = new URLSearchParams(window.location.search).get('workspace') === 'doctor';
      btnOpenInSession.style.display = (isDoctorMode && (slot.status === 'checked-in' || slot.status === 'seated' || slot.status === 'in-session')) ? 'inline-flex' : 'none';
    }

    var rescheduleForm = document.getElementById('reschedule-slot-form');
    if (rescheduleForm) rescheduleForm.hidden = true;

    manageModalOverlay.hidden = false;
    document.body.classList.add('manage-modal-open');
    if (closeManageModalBtn) closeManageModalBtn.focus();
  }

  function closeManageModal() {
    if (manageModalOverlay && !manageModalOverlay.hidden) {
      manageModalOverlay.classList.add('is-closing');
      document.body.classList.remove('manage-modal-open');
      clearTimeout(manageModalCloseTimer);
      manageModalCloseTimer = setTimeout(function () {
        manageModalOverlay.hidden = true;
        manageModalOverlay.classList.remove('is-closing');
      }, 180);
    }
    state.activeSlotModal = null;
  }

  if (closeManageModalBtn) closeManageModalBtn.addEventListener('click', closeManageModal);
  if (closeManageBtn) closeManageBtn.addEventListener('click', closeManageModal);

  if (btnCheckinSlot) {
    btnCheckinSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      if (window.DentalStorage && typeof window.DentalStorage.checkInSlot === 'function') {
        window.DentalStorage.checkInSlot(state.activeSlotModal.time, state.activeSlotModal.chair);
      }
      var pName = state.activeSlotModal.slot ? state.activeSlotModal.slot.patientName : 'Patient';
      closeManageModal();
      renderSchedule();
      renderStats();
      showToast('Checked in ' + pName);
    });
  }

  if (btnSeatSlot) {
    btnSeatSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      var active = state.activeSlotModal;
      var seatedSlot = Object.assign({}, active.slot, {
        status: 'seated',
        statusLabel: 'Seated for doctor',
        seatedAt: new Date().toISOString()
      });
      window.DentalStorage.setSlot(active.time, active.chair, seatedSlot);
      if (seatedSlot.patientId && typeof window.DentalStorage.updatePatient === 'function') {
        window.DentalStorage.updatePatient(seatedSlot.patientId, {
          status: 'seated',
          statusLabel: 'Seated for doctor'
        });
      }
      var patientName = seatedSlot.patientName || 'Patient';
      closeManageModal();
      renderSchedule();
      renderStats();
      showToast(patientName + ' is ready for the doctor.');
    });
  }

  if (btnCancelSlot) {
    btnCancelSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      if (window.DentalStorage && typeof window.DentalStorage.clearSlot === 'function') {
        window.DentalStorage.clearSlot(state.activeSlotModal.time, state.activeSlotModal.chair);
      }
      var pName = state.activeSlotModal.slot ? state.activeSlotModal.slot.patientName : 'Patient';
      closeManageModal();
      renderSchedule();
      renderStats();
      showToast('Cancelled appointment for ' + pName);
    });
  }

  var btnRescheduleSlot = document.getElementById('btn-reschedule-slot');
  var rescheduleSlotForm = document.getElementById('reschedule-slot-form');
  var btnCancelReschedule = document.getElementById('btn-cancel-reschedule');
  if (btnRescheduleSlot && rescheduleSlotForm) {
    btnRescheduleSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      var today = new Date();
      var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var dateInp = document.getElementById('reschedule-slot-date');
      var timeInp = document.getElementById('reschedule-slot-time');
      var chairInp = document.getElementById('reschedule-slot-chair');
      if (dateInp) {
        dateInp.min = todayKey;
        dateInp.value = todayKey;
      }
      if (timeInp) timeInp.value = state.activeSlotModal.time;
      if (chairInp) chairInp.value = String(state.activeSlotModal.chair);
      rescheduleSlotForm.hidden = !rescheduleSlotForm.hidden;
    });
    if (btnCancelReschedule) {
      btnCancelReschedule.addEventListener('click', function () {
        rescheduleSlotForm.hidden = true;
      });
    }
    rescheduleSlotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.activeSlotModal || !window.DentalStorage || typeof window.DentalStorage.rescheduleSlot !== 'function') return;
      var today = new Date();
      var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var toDate = document.getElementById('reschedule-slot-date').value;
      var toTime = document.getElementById('reschedule-slot-time').value;
      var toChair = Number(document.getElementById('reschedule-slot-chair').value);
      try {
        var moved = window.DentalStorage.rescheduleSlot(
          todayKey,
          state.activeSlotModal.time,
          state.activeSlotModal.chair,
          toDate,
          toTime,
          toChair
        );
        closeManageModal();
        renderSchedule();
        renderStats();
        showToast('Rescheduled ' + moved.patientName + ' to ' + toDate + ' at ' + toTime + '.');
      } catch (err) {
        showToast(err.message || 'Could not reschedule appointment.');
      }
    });
  }

  // Close modals on overlay click or Escape
  [bookModalOverlay, manageModalOverlay].forEach(function (overlay) {
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          if (overlay === manageModalOverlay) {
            closeManageModal();
          } else {
            overlay.hidden = true;
            state.activeSlotModal = null;
          }
        }
      });
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (bookModalOverlay) bookModalOverlay.hidden = true;
      if (manageModalOverlay && !manageModalOverlay.hidden) {
        closeManageModal();
      } else {
        state.activeSlotModal = null;
      }
    }
  });

  // ---------- 9. COMBINED RENDER FUNCTION ----------
  function renderAll() {
    renderTodayDate();
    renderStats();
    renderSchedule();
  }

  // ---------- 10. PUBLIC API FOR EXTERNAL CALLS ----------
  window.DentalDashboard = {
    renderStats: renderStats,
    renderSchedule: renderSchedule
  };

  window.addEventListener('storage', function (event) {
    if (event.key === 'dental_schedule' || event.key === null) {
      renderStats();
      renderSchedule();
    }
  });

  // ---------- 11. INITIAL START ----------
  renderAll();
})();
