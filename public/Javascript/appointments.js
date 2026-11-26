/* Appointments calendar and scheduling actions. */
(function () {
  'use strict';

  var DEFAULT_TIMES = ['9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'];
  var state = {
    selectedDate: new Date(),
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    view: 'day',
    activeAppointment: null,
    isSaving: false
  };

  var monthEl = document.getElementById('calendar-month');
  var calendarEl = document.getElementById('mini-calendar');
  var selectedDateEl = document.getElementById('selected-date');
  var dayGridEl = document.getElementById('day-grid');
  var weekGridEl = document.getElementById('week-view-panel');
  var dayPanelEl = document.getElementById('day-view-panel');
  var summaryEl = document.getElementById('appointment-summary');
  var appointmentModal = document.getElementById('appointment-modal');
  var appointmentForm = document.getElementById('appointment-form');
  var appointmentDateInput = document.getElementById('appointment-date');
  var appointmentTimeInput = document.getElementById('appointment-time');
  var appointmentChairInput = document.getElementById('appointment-chair');
  var appointmentPatientInput = document.getElementById('appointment-patient');
  var appointmentPatientsList = document.getElementById('appointment-patients');
  var appointmentErrorEl = document.getElementById('appointment-error');
  var manageModal = document.getElementById('manage-modal');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function dateFromKey(key) {
    var parts = key.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function sameDate(first, second) {
    return localDateKey(first) === localDateKey(second);
  }

  function formatDate(date, options) {
    return date.toLocaleDateString('en-US', options);
  }

  function fullName(patient) {
    return ((patient.firstName || '') + ' ' + (patient.lastName || '')).trim();
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function getPatients() {
    return window.DentalStorage ? window.DentalStorage.getPatients() : [];
  }

  function getPatientByName(name) {
    if (window.DentalStorage && typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(name);
    }

    var target = normalizeName(name);
    var patients = getPatients();
    for (var i = 0; i < patients.length; i++) {
      if (normalizeName(fullName(patients[i])) === target) return patients[i];
    }
    return null;
  }

  function getSchedule(date) {
    var key = localDateKey(date);
    if (window.DentalStorage && typeof window.DentalStorage.getScheduleForDate === 'function') {
      return window.DentalStorage.getScheduleForDate(key);
    }
    if (sameDate(date, new Date()) && window.DentalStorage) {
      return window.DentalStorage.getSchedule();
    }
    return [];
  }

  function setSlot(date, time, chair, data) {
    if (window.DentalStorage && typeof window.DentalStorage.setSlotForDate === 'function') {
      return window.DentalStorage.setSlotForDate(localDateKey(date), time, chair, data);
    }
    if (sameDate(date, new Date()) && window.DentalStorage) {
      return window.DentalStorage.setSlot(time, chair, data);
    }
    throw new Error('Dated appointment storage is unavailable.');
  }

  function timeValue(time) {
    var match = String(time).match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    var hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'pm') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function normalizeSchedule(schedule) {
    var rows = schedule.slice();
    DEFAULT_TIMES.forEach(function (time) {
      var exists = rows.some(function (row) {
        return String(row.time).toLowerCase().trim() === time.toLowerCase();
      });
      if (!exists) rows.push({ time: time, chair1: null, chair2: null });
    });
    rows.sort(function (a, b) { return timeValue(a.time) - timeValue(b.time); });
    return rows;
  }

  function statusLabel(status) {
    if (status === 'checked-in') return 'Checked in';
    if (status === 'seated') return 'Seated for doctor';
    if (status === 'in-session') return 'In session';
    if (status === 'emergency') return 'Emergency';
    if (status === 'completed') return 'Completed';
    return 'Confirmed';
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  function renderCalendar() {
    var year = state.calendarMonth.getFullYear();
    var month = state.calendarMonth.getMonth();
    monthEl.textContent = formatDate(state.calendarMonth, { month: 'long', year: 'numeric' });

    var firstOfMonth = new Date(year, month, 1);
    var mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    var gridStart = new Date(year, month, 1 - mondayOffset);
    var today = new Date();
    calendarEl.textContent = '';

    for (var i = 0; i < 42; i++) {
      var date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      var day = document.createElement('button');
      day.type = 'button';
      day.className = 'calendar-day';
      day.textContent = date.getDate();
      day.setAttribute('aria-label', formatDate(date, { dateStyle: 'full' }));
      if (date.getMonth() !== month) day.classList.add('is-outside');
      if (sameDate(date, today)) day.classList.add('is-today');
      if (sameDate(date, state.selectedDate)) {
        day.classList.add('is-selected');
        day.setAttribute('aria-pressed', 'true');
      } else {
        day.setAttribute('aria-pressed', 'false');
      }
      day.addEventListener('click', function (selected) {
        return function () {
          state.selectedDate = selected;
          state.calendarMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
          renderAll();
        };
      }(date));
      calendarEl.appendChild(day);
    }
  }

  function getSlotAt(schedule, time, chair) {
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time).toLowerCase().trim() === String(time).toLowerCase().trim()) {
        return chair === 1 ? schedule[i].chair1 : schedule[i].chair2;
      }
    }
    return null;
  }

  function createEmptyCell(time, chair) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'appointment-cell appointment-cell--open';
    button.setAttribute('aria-label', 'Book Chair ' + chair + ' at ' + time);
    var label = document.createElement('span');
    label.textContent = 'Open';
    var add = document.createElement('span');
    add.textContent = 'Add';
    button.appendChild(label);
    button.appendChild(add);
    button.addEventListener('click', function () {
      openAppointmentModal(state.selectedDate, time, chair);
    });
    return button;
  }

  function createAppointmentCell(time, chair, slot) {
    if (slot && slot.type === 'break') {
      var breakCell = document.createElement('div');
      breakCell.className = 'appointment-cell appointment-cell--break';
      breakCell.textContent = slot.label || 'Break';
      return breakCell;
    }
    if (!slot || !slot.patientName) return createEmptyCell(time, chair);

    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'appointment-cell';
    if (slot.status === 'checked-in') cell.classList.add('appointment-cell--checked-in');
    if (slot.status === 'seated' || slot.status === 'in-session') cell.classList.add('appointment-cell--in-session');
    if (slot.status === 'emergency') cell.classList.add('appointment-cell--emergency');
    if (slot.status === 'completed') cell.classList.add('appointment-cell--completed');
    var name = document.createElement('strong');
    name.textContent = slot.patientName;
    var status = document.createElement('span');
    status.className = 'appointment-status appointment-status--' + (slot.status || 'confirmed');
    status.textContent = statusLabel(slot.status);
    var service = document.createElement('small');
    service.textContent = slot.service || 'Appointment';
    var top = document.createElement('span');
    top.className = 'appointment-cell__top';
    top.appendChild(name);
    top.appendChild(status);
    cell.appendChild(top);
    cell.appendChild(service);
    cell.addEventListener('click', function () {
      openManageModal(time, chair, slot);
    });
    return cell;
  }

  function renderDayView() {
    var schedule = normalizeSchedule(getSchedule(state.selectedDate));
    var count = 0;
    dayGridEl.textContent = '';
    dayGridEl.appendChild(document.createElement('div'));

    [1, 2].forEach(function (chair) {
      var head = document.createElement('div');
      head.className = 'chair-head';
      var title = document.createElement('strong');
      title.textContent = 'Chair ' + chair;
      var dentist = document.createElement('span');
      dentist.textContent = chair === 1 ? 'Dr. Mora' : 'Dr. Silva';
      head.appendChild(title);
      head.appendChild(dentist);
      dayGridEl.appendChild(head);
    });

    schedule.forEach(function (row) {
      var time = document.createElement('div');
      time.className = 'time-label';
      time.textContent = row.time;
      dayGridEl.appendChild(time);
      [row.chair1, row.chair2].forEach(function (slot) {
        if (slot && slot.type !== 'break' && slot.patientName) count++;
      });
      dayGridEl.appendChild(createAppointmentCell(row.time, 1, row.chair1));
      dayGridEl.appendChild(createAppointmentCell(row.time, 2, row.chair2));
    });
    return count;
  }

  function weekStart(date) {
    var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  function renderWeekView() {
    var start = weekStart(state.selectedDate);
    weekGridEl.textContent = '';
    for (var i = 0; i < 7; i++) {
      var date = new Date(start);
      date.setDate(start.getDate() + i);
      var card = document.createElement('section');
      card.className = 'week-day';
      if (sameDate(date, state.selectedDate)) card.classList.add('is-selected');
      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'week-day__head';
      head.setAttribute('aria-label', 'Show ' + formatDate(date, { dateStyle: 'full' }));
      var weekday = document.createElement('strong');
      weekday.textContent = formatDate(date, { weekday: 'short' });
      var dayNumber = document.createElement('span');
      dayNumber.textContent = formatDate(date, { month: 'short', day: 'numeric' });
      head.appendChild(weekday);
      head.appendChild(dayNumber);
      head.addEventListener('click', function (selected) {
        return function () {
          state.selectedDate = selected;
          state.view = 'day';
          renderAll();
        };
      }(date));
      card.appendChild(head);

      var items = document.createElement('div');
      items.className = 'week-day__items';
      var schedule = normalizeSchedule(getSchedule(date));
      var booked = [];
      schedule.forEach(function (row) {
        [1, 2].forEach(function (chair) {
          var slot = chair === 1 ? row.chair1 : row.chair2;
          if (slot && slot.type !== 'break' && slot.patientName) {
            booked.push({ time: row.time, chair: chair, slot: slot });
          }
        });
      });
      if (booked.length === 0) {
        var empty = document.createElement('p');
        empty.className = 'week-empty';
        empty.textContent = 'No appointments';
        items.appendChild(empty);
      } else {
        booked.forEach(function (appointment) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'week-appointment';
          var time = document.createElement('span');
          time.textContent = appointment.time + ' · Chair ' + appointment.chair;
          var patient = document.createElement('strong');
          patient.textContent = appointment.slot.patientName;
          item.appendChild(time);
          item.appendChild(patient);
          item.addEventListener('click', function (selectedDate, selectedAppointment) {
            return function () {
              state.selectedDate = selectedDate;
              openManageModal(selectedAppointment.time, selectedAppointment.chair, selectedAppointment.slot);
            };
          }(date, appointment));
          items.appendChild(item);
        });
      }
      card.appendChild(items);
      weekGridEl.appendChild(card);
    }
  }

  function setView(view) {
    state.view = view;
    var dayButton = document.getElementById('day-view');
    var weekButton = document.getElementById('week-view');
    dayButton.classList.toggle('is-active', view === 'day');
    dayButton.setAttribute('aria-pressed', view === 'day' ? 'true' : 'false');
    weekButton.classList.toggle('is-active', view === 'week');
    weekButton.setAttribute('aria-pressed', view === 'week' ? 'true' : 'false');
    dayPanelEl.hidden = view !== 'day';
    weekGridEl.hidden = view !== 'week';
  }

  function renderAll() {
    renderCalendar();
    selectedDateEl.textContent = formatDate(state.selectedDate, { weekday: 'long', month: 'long', day: 'numeric' });
    var count = renderDayView();
    summaryEl.textContent = count + ' appointment' + (count === 1 ? '' : 's') + ' scheduled.';
    renderWeekView();
    setView(state.view);
  }

  function openAppointmentModal(date, time, chair) {
    appointmentForm.reset();
    appointmentDateInput.value = localDateKey(date);
    if (time) appointmentTimeInput.value = time;
    if (chair) appointmentChairInput.value = String(chair);
    appointmentErrorEl.hidden = true;
    appointmentPatientsList.textContent = '';
    getPatients().forEach(function (patient) {
      var option = document.createElement('option');
      option.value = fullName(patient);
      appointmentPatientsList.appendChild(option);
    });
    appointmentModal.hidden = false;
    appointmentPatientInput.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    state.activeAppointment = null;
  }

  function updatePatientForAppointment(patient, date, time, chair, service, status) {
    var doctor = chair === 1 ? 'Dr. Mora' : 'Dr. Silva';
    var visitDate = sameDate(date, new Date())
      ? 'Today, ' + time
      : formatDate(date, { weekday: 'short' }) + ', ' + time;
    var updates = {
      nextVisit: visitDate,
      nextVisitDetail: service + ' with ' + doctor + ', Chair ' + chair,
      dentist: doctor,
      status: status,
      statusLabel: statusLabel(status),
      visitingToday: sameDate(date, new Date())
    };
    if (window.DentalStorage && typeof window.DentalStorage.updatePatient === 'function') {
      return window.DentalStorage.updatePatient(patient.id, updates);
    }
    return patient;
  }

  function createPatientForAppointment(name, date, time, chair, service, status) {
    var existing = getPatientByName(name);
    if (existing) return updatePatientForAppointment(existing, date, time, chair, service, status);

    var parts = String(name).trim().split(/\s+/);
    var now = new Date();
    var patient = window.DentalStorage.addPatient({
      firstName: parts[0] || 'Patient',
      lastName: parts.slice(1).join(' '),
      lastVisit: 'None yet',
      phone: '',
      email: '',
      dentist: chair === 1 ? 'Dr. Mora' : 'Dr. Silva',
      patientSince: formatDate(now, { month: 'long', year: 'numeric' }),
      isNew: true,
      visitingToday: sameDate(date, now),
      note: '',
      history: []
    });
    return updatePatientForAppointment(patient, date, time, chair, service, status);
  }

  appointmentForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (state.isSaving) return;
    var name = appointmentPatientInput.value.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 120) {
      appointmentErrorEl.textContent = 'Enter a patient name up to 120 characters.';
      appointmentErrorEl.hidden = false;
      appointmentPatientInput.focus();
      return;
    }

    var dateKey = appointmentDateInput.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      appointmentErrorEl.textContent = 'Choose a valid appointment date.';
      appointmentErrorEl.hidden = false;
      appointmentDateInput.focus();
      return;
    }

    var date = dateFromKey(dateKey);
    if (isNaN(date.getTime()) || localDateKey(date) !== dateKey) {
      appointmentErrorEl.textContent = 'Choose a valid appointment date.';
      appointmentErrorEl.hidden = false;
      appointmentDateInput.focus();
      return;
    }

    var time = appointmentTimeInput.value;
    var chair = Number(appointmentChairInput.value);
    var service = document.getElementById('appointment-service').value;
    var status = document.getElementById('appointment-status').value;
    if (DEFAULT_TIMES.indexOf(time) < 0 || (chair !== 1 && chair !== 2) ||
        !service ||
        ['confirmed', 'checked-in', 'emergency', 'completed'].indexOf(status) < 0) {
      appointmentErrorEl.textContent = 'Choose a valid appointment time, chair, and status.';
      appointmentErrorEl.hidden = false;
      return;
    }

    var schedule = getSchedule(date);
    var existingSlot = getSlotAt(schedule, time, chair);

    if (existingSlot) {
      appointmentErrorEl.textContent = 'That chair is already booked at this time. Choose another slot.';
      appointmentErrorEl.hidden = false;
      return;
    }

    if (window.DentalStorage.hasPatientAtTime(schedule, name, time)) {
      appointmentErrorEl.textContent = 'This patient already has an appointment at that time.';
      appointmentErrorEl.hidden = false;
      return;
    }

    state.isSaving = true;
    try {
      var patient = createPatientForAppointment(name, date, time, chair, service, status);
      if (!patient) throw new Error('The patient record could not be saved.');

      setSlot(date, time, chair, {
        patientId: patient.id,
        patientName: name,
        service: service,
        status: status,
        statusLabel: statusLabel(status)
      });

      var savedSlot = getSlotAt(getSchedule(date), time, chair);
      if (!savedSlot || String(savedSlot.patientId) !== String(patient.id)) {
        throw new Error('The appointment could not be saved. Please try again.');
      }

      closeModal(appointmentModal);
      state.selectedDate = date;
      state.calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderAll();
      showToast('Appointment booked for ' + name + '.');
    } catch (error) {
      appointmentErrorEl.textContent = error.message || 'The appointment could not be booked.';
      appointmentErrorEl.hidden = false;
    } finally {
      state.isSaving = false;
    }
  });

  function findLinkedPatient(slot) {
    if (slot.patientId && window.DentalStorage && typeof window.DentalStorage.getPatientById === 'function') {
      var patient = window.DentalStorage.getPatientById(slot.patientId);
      if (patient) return patient;
    }
    return getPatientByName(slot.patientName);
  }

  function openManageModal(time, chair, slot) {
    state.activeAppointment = { date: new Date(state.selectedDate), time: time, chair: chair, slot: slot };
    document.getElementById('manage-patient').textContent = slot.patientName;
    document.getElementById('manage-info').textContent = formatDate(state.selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }) +
      ' · ' + time + ' · Chair ' + chair + (chair === 1 ? ' (Dr. Mora)' : ' (Dr. Silva)');
    document.getElementById('manage-service').textContent = slot.service || 'Appointment';
    document.getElementById('manage-status').value = slot.status || 'confirmed';
    var reschedForm = document.getElementById('manage-reschedule-form');
    var reschedErr = document.getElementById('manage-reschedule-error');
    if (reschedForm) reschedForm.hidden = true;
    if (reschedErr) reschedErr.hidden = true;
    manageModal.hidden = false;
  }

  var openRescheduleBtn = document.getElementById('open-reschedule-appt');
  var manageRescheduleForm = document.getElementById('manage-reschedule-form');
  var cancelRescheduleBtn = document.getElementById('cancel-reschedule-appt');
  var manageRescheduleErr = document.getElementById('manage-reschedule-error');
  if (openRescheduleBtn && manageRescheduleForm) {
    openRescheduleBtn.addEventListener('click', function () {
      if (!state.activeAppointment) return;
      var dateInput = document.getElementById('manage-reschedule-date');
      var timeInput = document.getElementById('manage-reschedule-time');
      var chairInput = document.getElementById('manage-reschedule-chair');
      if (dateInput) {
        dateInput.min = localDateKey(new Date());
        dateInput.value = localDateKey(state.activeAppointment.date);
      }
      if (timeInput) timeInput.value = state.activeAppointment.time;
      if (chairInput) chairInput.value = String(state.activeAppointment.chair);
      if (manageRescheduleErr) manageRescheduleErr.hidden = true;
      manageRescheduleForm.hidden = !manageRescheduleForm.hidden;
    });
    if (cancelRescheduleBtn) {
      cancelRescheduleBtn.addEventListener('click', function () {
        manageRescheduleForm.hidden = true;
      });
    }
    manageRescheduleForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!state.activeAppointment || !window.DentalStorage || typeof window.DentalStorage.rescheduleSlot !== 'function') return;
      var fromDate = localDateKey(state.activeAppointment.date);
      var toDate = document.getElementById('manage-reschedule-date').value;
      var toTime = document.getElementById('manage-reschedule-time').value;
      var toChair = Number(document.getElementById('manage-reschedule-chair').value);
      try {
        var moved = window.DentalStorage.rescheduleSlot(
          fromDate,
          state.activeAppointment.time,
          state.activeAppointment.chair,
          toDate,
          toTime,
          toChair
        );
        closeModal(manageModal);
        state.selectedDate = dateFromKey(toDate);
        state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
        renderAll();
        showToast('Rescheduled ' + moved.patientName + ' to ' + toDate + ' at ' + toTime + '.');
      } catch (err) {
        if (manageRescheduleErr) {
          manageRescheduleErr.textContent = err.message || 'Could not reschedule appointment.';
          manageRescheduleErr.hidden = false;
        }
      }
    });
  }

  document.getElementById('save-status').addEventListener('click', function () {
    if (!state.activeAppointment) return;
    var active = state.activeAppointment;
    var status = document.getElementById('manage-status').value;
    var updatedSlot = Object.assign({}, active.slot, { status: status, statusLabel: statusLabel(status) });
    setSlot(active.date, active.time, active.chair, updatedSlot);
    var patient = findLinkedPatient(updatedSlot);
    if (patient) updatePatientForAppointment(patient, active.date, active.time, active.chair, updatedSlot.service || 'Dental care', status);
    closeModal(manageModal);
    renderAll();
    showToast('Appointment status updated.');
  });

  document.getElementById('cancel-appointment').addEventListener('click', function () {
    if (!state.activeAppointment) return;
    var active = state.activeAppointment;
    setSlot(active.date, active.time, active.chair, null);
    var patient = findLinkedPatient(active.slot);
    if (patient && window.DentalStorage) {
      window.DentalStorage.updatePatient(patient.id, {
        nextVisit: 'None scheduled',
        nextVisitDetail: '',
        visitingToday: false,
        status: 'registered',
        statusLabel: 'Registered'
      });
    }
    closeModal(manageModal);
    renderAll();
    showToast('Appointment cancelled.');
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      var modal = button.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  [appointmentModal, manageModal].forEach(function (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (!appointmentModal.hidden) closeModal(appointmentModal);
      if (!manageModal.hidden) closeModal(manageModal);
    }
  });

  document.getElementById('new-appointment').addEventListener('click', function () {
    openAppointmentModal(state.selectedDate);
  });
  document.getElementById('prev-month').addEventListener('click', function () {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', function () {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('prev-day').addEventListener('click', function () {
    state.selectedDate.setDate(state.selectedDate.getDate() - 1);
    state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
    renderAll();
  });
  document.getElementById('next-day').addEventListener('click', function () {
    state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
    renderAll();
  });
  document.getElementById('go-today').addEventListener('click', function () {
    state.selectedDate = new Date();
    state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
    renderAll();
  });
  document.getElementById('day-view').addEventListener('click', function () { setView('day'); });
  document.getElementById('week-view').addEventListener('click', function () { setView('week'); });

  renderAll();

  var initialPatient = new URLSearchParams(window.location.search).get('patient');
  if (initialPatient) {
    openAppointmentModal(state.selectedDate);
    if (appointmentPatientInput) {
      appointmentPatientInput.value = initialPatient;
    }
  }
})();
