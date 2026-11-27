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

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function fullName(patient) {
    return ((patient.firstName || '') + ' ' + (patient.lastName || '')).trim();
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
    return slot.patientId === undefined || slot.patientId === null
      ? findPatientByName(slot.patientName)
      : null;
  }

  function formatFileSize(size) {
    if (typeof size !== 'number' || !isFinite(size) || size < 0) return '';
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function saveBookedPatient(name, time, chairNum, service, status, contact) {
    if (!window.DentalStorage) return null;
    contact = contact || {};

    var existingPatient = window.DentalStorage.findPatientByContact({
      name: name,
      email: contact.email,
      phone: contact.phone
    });
    var parts = String(name || '').trim().split(/\s+/);
    var dentist = window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function'
      ? window.DentalStorage.getDentistName(chairNum)
      : ('Doctor ' + chairNum);
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

    var emailOwner = contact.email ? window.DentalStorage.findPatientByEmail(contact.email) : null;
    if (contact.email && window.DentalStorage.hasPatientEmail(contact.email) &&
        (!emailOwner || !existingPatient || String(emailOwner.id) !== String(existingPatient.id))) {
      throw new Error('This email address is already associated with another patient.');
    }

    if (existingPatient) {
      if (normalizeName(fullName(existingPatient)) !== normalizeName(name)) {
        throw new Error('This email address is already associated with a different patient.');
      }
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
  function getChairsList() {
    return (window.DentalStorage && typeof window.DentalStorage.getChairs === 'function')
      ? window.DentalStorage.getChairs()
      : [];
  }

  function renderStats() {
    var chairs = getChairsList();
    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    var totalAppts = 0;
    var checkedInCount = 0;
    var openCount = 0;

    if (chairs.length > 0) {
      schedule.forEach(function (row) {
        chairs.forEach(function (chair) {
          var slot = row['chair' + chair.id] || null;
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
    }

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

    var chairs = getChairsList();
    if (chairs.length === 0) {
      chairGridEl.style.gridTemplateColumns = '1fr';
      var emptyMsg = el('div', 'slot slot--break', 'No doctors registered yet. An admin can create doctor accounts in Admin → Accounts.');
      emptyMsg.style.padding = '28px 20px';
      emptyMsg.style.textAlign = 'center';
      chairGridEl.appendChild(emptyMsg);
      return;
    }

    chairGridEl.style.gridTemplateColumns = '76px repeat(' + chairs.length + ', minmax(220px, 1fr))';

    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    // Header cells
    chairGridEl.appendChild(el('div')); // Empty corner

    chairs.forEach(function (chair) {
      var head = el('div', 'chair-head');
      head.appendChild(el('strong', '', chair.name));
      head.appendChild(el('span', 'muted', chair.dentist));
      chairGridEl.appendChild(head);
    });

    // Rows
    schedule.forEach(function (row) {
      // Time label
      chairGridEl.appendChild(el('div', 'time', row.time));

      chairs.forEach(function (chair) {
        chairGridEl.appendChild(buildChairSlot(row.time, chair.id, row['chair' + chair.id] || null));
      });
    });
  }

  // ---------- 8. MODAL ACTIONS (SLOT BOOKING & MANAGING) ----------
  function openBookModal(time, chairNum) {
    if (!bookModalOverlay) return;
    state.activeSlotModal = { time: time, chair: chairNum };
    var dentist = window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function'
      ? window.DentalStorage.getDentistName(chairNum)
      : ('Doctor ' + chairNum);
    var chairName = 'Chair ' + chairNum + ' (' + dentist + ')';
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
      var email = document.getElementById('slot-patient-email').value.trim().toLowerCase();
      var note = document.getElementById('slot-note').value.trim();
      var name = (firstName + ' ' + lastName).trim();
      var service = document.getElementById('slot-service').value;
      var status = 'confirmed';
      var statusLabel = 'Confirmed';

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
      if (!service) {
        showToast('Choose a valid service.');
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
      var existingPatient = window.DentalStorage.findPatientByContact({
        name: name,
        email: email,
        phone: phone
      });
      var emailOwner = email ? window.DentalStorage.findPatientByEmail(email) : null;
      if (email && window.DentalStorage.hasPatientEmail(email) &&
          (!emailOwner || !existingPatient || String(emailOwner.id) !== String(existingPatient.id))) {
        showToast('This email address is already associated with another patient.');
        return;
      }
      if (existingPatient && normalizeName(fullName(existingPatient)) !== normalizeName(name)) {
        showToast('This email address is already associated with a different patient.');
        return;
      }
      if (window.DentalStorage.hasPatientAtTime(schedule, {
        id: existingPatient && existingPatient.id,
        name: name,
        email: email,
        phone: phone
      }, bookedTime)) {
        showToast(name + ' already has an appointment at ' + bookedTime + '.');
        return;
      }

      state.isSaving = true;
      try {
        var previousPatient = existingPatient ? JSON.parse(JSON.stringify(existingPatient)) : null;
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
        slotData.patientEmail = email;
        slotData.patientPhone = phone;
        try {
          window.DentalStorage.setSlot(bookedTime, bookedChair, slotData);
          var savedSchedule = window.DentalStorage.getSchedule();
          var savedRow = savedSchedule.find(function (row) {
            return String(row.time).trim().toLowerCase() === bookedTime.toLowerCase();
          });
          var savedSlot = savedRow && (bookedChair === 1 ? savedRow.chair1 : savedRow.chair2);
          if (!savedSlot || String(savedSlot.patientId) !== String(patient.id)) {
            throw new Error('The appointment could not be saved. Please try again.');
          }
        } catch (error) {
          if (previousPatient) {
            window.DentalStorage.updatePatient(patient.id, previousPatient);
          } else if (typeof window.DentalStorage.deletePatient === 'function') {
            window.DentalStorage.deletePatient(patient.id);
          }
          throw error;
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
      var doc = window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function'
        ? window.DentalStorage.getDentistName(chairNum)
        : ('Doctor ' + chairNum);
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
        ['Dentist', patient && patient.dentist || (window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function' ? window.DentalStorage.getDentistName(chairNum) : ('Doctor ' + chairNum))],
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
  var rescheduleError = document.getElementById('reschedule-error');
  var rescheduleTimeInput = document.getElementById('reschedule-slot-time');
  var rescheduleTimeOptions = Array.prototype.slice.call(rescheduleTimeInput.options)
    .map(function (option) { return option.value; })
    .filter(Boolean);
  var btnCancelReschedule = document.getElementById('btn-cancel-reschedule');
  function clearRescheduleError() {
    if (!rescheduleError) return;
    rescheduleError.textContent = '';
    rescheduleError.hidden = true;
  }

  function updateDashboardRescheduleTimes() {
    var dateInput = document.getElementById('reschedule-slot-date');
    var chairInput = document.getElementById('reschedule-slot-chair');
    if (!dateInput.value || !chairInput.value || !state.activeSlotModal) return;

    try {
      var availableTimes = window.DentalStorage.getAvailableAppointmentTimes(
        dateInput.value,
        Number(chairInput.value),
        {
          date: localDateKey(new Date()),
          time: state.activeSlotModal.time,
          chair: state.activeSlotModal.chair
        },
        rescheduleTimeOptions
      );
      rescheduleTimeInput.textContent = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = availableTimes.length
        ? 'Choose an available time'
        : 'No available times';
      rescheduleTimeInput.appendChild(placeholder);
      availableTimes.forEach(function (time) {
        var option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        rescheduleTimeInput.appendChild(option);
      });
      if (rescheduleError) {
        rescheduleError.textContent = availableTimes.length
          ? ''
          : 'No available times for this doctor on the selected date.';
        rescheduleError.hidden = availableTimes.length > 0;
      }
    } catch (error) {
      if (rescheduleError) {
        rescheduleError.textContent = error.message || 'Could not check appointment availability.';
        rescheduleError.hidden = false;
      }
    }
  }

  if (btnRescheduleSlot && rescheduleSlotForm) {
    btnRescheduleSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      clearRescheduleError();
      var today = new Date();
      var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var dateInp = document.getElementById('reschedule-slot-date');
      var chairInp = document.getElementById('reschedule-slot-chair');
      if (dateInp) {
        dateInp.min = todayKey;
        dateInp.value = todayKey;
      }
      if (chairInp) chairInp.value = String(state.activeSlotModal.chair);
      rescheduleSlotForm.hidden = !rescheduleSlotForm.hidden;
      if (!rescheduleSlotForm.hidden) updateDashboardRescheduleTimes();
    });
    if (btnCancelReschedule) {
      btnCancelReschedule.addEventListener('click', function () {
        rescheduleSlotForm.hidden = true;
        clearRescheduleError();
      });
    }
    ['reschedule-slot-date', 'reschedule-slot-chair'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        clearRescheduleError();
        updateDashboardRescheduleTimes();
      });
    });
    rescheduleTimeInput.addEventListener('change', clearRescheduleError);
    rescheduleSlotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.activeSlotModal || !window.DentalStorage || typeof window.DentalStorage.rescheduleSlot !== 'function') return;
      clearRescheduleError();
      if (!rescheduleSlotForm.reportValidity()) return;
      var today = new Date();
      var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var toDate = document.getElementById('reschedule-slot-date').value;
      var toTime = document.getElementById('reschedule-slot-time').value;
      var toChair = Number(document.getElementById('reschedule-slot-chair').value);
      try {
        var availableTimes = window.DentalStorage.getAvailableAppointmentTimes(
          toDate,
          toChair,
          { date: todayKey, time: state.activeSlotModal.time, chair: state.activeSlotModal.chair },
          rescheduleTimeOptions
        );
        if (availableTimes.indexOf(toTime) < 0) {
          if (rescheduleError) {
            rescheduleError.textContent = 'That time is no longer available for this doctor. Choose another time.';
            rescheduleError.hidden = false;
          }
          updateDashboardRescheduleTimes();
          return;
        }
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
        if (rescheduleError) {
          rescheduleError.textContent = err.message || 'Could not reschedule appointment.';
          rescheduleError.hidden = false;
        } else {
          showToast(err.message || 'Could not reschedule appointment.');
        }
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
