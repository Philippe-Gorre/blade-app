/* Appointments calendar and scheduling actions. */
(function () {
  'use strict';

  var DEFAULT_TIMES = Array.isArray(window.CLINIC_TIMES) && window.CLINIC_TIMES.length
    ? window.CLINIC_TIMES
    : ['8:00 am', '9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm', '5:00 pm'];

  function getChairsList() {
    return (window.DentalStorage && typeof window.DentalStorage.getChairs === 'function')
      ? window.DentalStorage.getChairs()
      : [];
  }

  function getDentistName(chairNum) {
    return (window.DentalStorage && typeof window.DentalStorage.getDentistName === 'function')
      ? window.DentalStorage.getDentistName(chairNum)
      : ('Doctor ' + chairNum);
  }
  var state = {
    selectedDate: new Date(),
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    view: 'day',
    activeBooking: null,
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
  var appointmentSlotSummaryEl = document.getElementById('appointment-slot-summary');
  var appointmentFirstNameInput = document.getElementById('appointment-first-name');
  var appointmentLastNameInput = document.getElementById('appointment-last-name');
  var appointmentPhoneInput = document.getElementById('appointment-phone');
  var appointmentEmailInput = document.getElementById('appointment-email');
  var appointmentServiceInput = document.getElementById('appointment-service');
  var appointmentNoteInput = document.getElementById('appointment-note');
  var appointmentErrorEl = document.getElementById('appointment-error');
  var manageModal = document.getElementById('manage-modal');
  var manageRescheduleTimeInput = document.getElementById('manage-reschedule-time');
  var manageRescheduleTimeOptions = Array.prototype.slice.call(
    manageRescheduleTimeInput.options
  ).map(function (option) {
    return option.value;
  }).filter(Boolean);
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  var queryParams = new URLSearchParams(window.location.search);
  var initialPatientName = queryParams.get('patient');
  var initialReschedule = null;
  var initialRescheduleDate = queryParams.get('rescheduleDate');
  var initialRescheduleTime = queryParams.get('rescheduleTime');
  var initialRescheduleChair = Number(queryParams.get('rescheduleChair'));
  if (initialRescheduleDate && /^\d{4}-\d{2}-\d{2}$/.test(initialRescheduleDate) &&
      localDateKey(dateFromKey(initialRescheduleDate)) === initialRescheduleDate &&
      initialRescheduleTime && [1, 2].indexOf(initialRescheduleChair) >= 0) {
    initialReschedule = {
      date: initialRescheduleDate,
      time: initialRescheduleTime,
      chair: initialRescheduleChair,
      patientId: queryParams.get('reschedulePatientId'),
      patientName: queryParams.get('reschedulePatientName') || ''
    };
    state.selectedDate = dateFromKey(initialReschedule.date);
    state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
  }

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

  function getPatientByContact(name, contact) {
    if (!window.DentalStorage || typeof window.DentalStorage.findPatientByContact !== 'function') return null;
    return window.DentalStorage.findPatientByContact(Object.assign({}, contact, { name: name }));
  }

  function getPatientByName(name) {
    if (window.DentalStorage && typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(name);
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
    var chairs = getChairsList();
    var schedule = normalizeSchedule(getSchedule(state.selectedDate));
    var count = 0;
    dayGridEl.textContent = '';

    if (chairs.length === 0) {
      dayGridEl.style.gridTemplateColumns = '1fr';
      var emptyMsg = document.createElement('div');
      emptyMsg.className = 'slot slot--break';
      emptyMsg.style.padding = '28px 20px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.textContent = 'No doctors registered yet. An admin can create doctor accounts in Admin → Accounts.';
      dayGridEl.appendChild(emptyMsg);
      return 0;
    }

    dayGridEl.style.gridTemplateColumns = '76px repeat(' + chairs.length + ', minmax(220px, 1fr))';
    dayGridEl.appendChild(document.createElement('div'));

    chairs.forEach(function (chair) {
      var head = document.createElement('div');
      head.className = 'chair-head';
      var title = document.createElement('strong');
      title.textContent = chair.name;
      var dentist = document.createElement('span');
      dentist.textContent = chair.dentist;
      head.appendChild(title);
      head.appendChild(dentist);
      dayGridEl.appendChild(head);
    });

    schedule.forEach(function (row) {
      var time = document.createElement('div');
      time.className = 'time-label';
      time.textContent = row.time;
      dayGridEl.appendChild(time);
      chairs.forEach(function (chair) {
        var slot = row['chair' + chair.id] || null;
        if (slot && slot.type !== 'break' && slot.patientName) count++;
        dayGridEl.appendChild(createAppointmentCell(row.time, chair.id, slot));
      });
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
    state.activeBooking = { date: new Date(date), time: time, chair: chair };
    var dentist = getDentistName(chair);
    appointmentSlotSummaryEl.textContent =
      formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' }) +
      ' · ' + time + ' · Chair ' + chair + ' (' + dentist + ')';
    appointmentErrorEl.hidden = true;
    if (initialPatientName) {
      var existingPatient = getPatientByName(initialPatientName);
      var nameParts = initialPatientName.trim().split(/\s+/);
      appointmentFirstNameInput.value = existingPatient
        ? existingPatient.firstName
        : nameParts.shift() || '';
      appointmentLastNameInput.value = existingPatient
        ? existingPatient.lastName
        : nameParts.join(' ');
      if (existingPatient) {
        appointmentPhoneInput.value = existingPatient.phone || '';
        appointmentEmailInput.value = existingPatient.email || '';
        appointmentNoteInput.value = existingPatient.note || '';
      }
      initialPatientName = null;
    }
    appointmentModal.hidden = false;
    appointmentFirstNameInput.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (modal === appointmentModal) state.activeBooking = null;
    if (modal === manageModal) state.activeAppointment = null;
  }

  function updatePatientForAppointment(patient, date, time, chair, service, contact) {
    var doctor = getDentistName(chair);
    var visitDate = sameDate(date, new Date())
      ? 'Today, ' + time
      : formatDate(date, { weekday: 'short' }) + ', ' + time;
    var updates = {
      nextVisit: visitDate,
      nextVisitDetail: service + ' with ' + doctor + ', Chair ' + chair,
      dentist: doctor,
      status: 'confirmed',
      statusLabel: 'Confirmed',
      visitingToday: sameDate(date, new Date())
    };
    if (contact.phone) updates.phone = contact.phone;
    if (contact.email) updates.email = contact.email;
    if (contact.note) updates.note = contact.note;
    if (window.DentalStorage && typeof window.DentalStorage.updatePatient === 'function') {
      return window.DentalStorage.updatePatient(patient.id, updates);
    }
    return patient;
  }

  function createPatientForAppointment(firstName, lastName, date, time, chair, service, contact) {
    var name = firstName + ' ' + lastName;
    var existing = getPatientByContact(name, contact);
    if (existing) {
      if (normalizeName(fullName(existing)) !== normalizeName(name)) {
        throw new Error('This email address is already associated with a different patient.');
      }
      return updatePatientForAppointment(existing, date, time, chair, service, contact);
    }

    var now = new Date();
    var patient = window.DentalStorage.addPatient({
      firstName: firstName,
      lastName: lastName,
      lastVisit: 'None yet',
      phone: contact.phone,
      email: contact.email,
      dentist: getDentistName(chair),
      patientSince: formatDate(now, { month: 'long', year: 'numeric' }),
      isNew: true,
      visitingToday: sameDate(date, now),
      note: contact.note,
      history: []
    });
    return updatePatientForAppointment(patient, date, time, chair, service, contact);
  }

  appointmentForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (state.isSaving || !state.activeBooking) return;

    var firstName = appointmentFirstNameInput.value.trim().replace(/\s+/g, ' ');
    var lastName = appointmentLastNameInput.value.trim().replace(/\s+/g, ' ');
    var phone = appointmentPhoneInput.value.trim();
    var email = appointmentEmailInput.value.trim().toLowerCase();
    var service = appointmentServiceInput.value;
    var note = appointmentNoteInput.value.trim();
    var name = firstName + ' ' + lastName;
    var date = state.activeBooking.date;
    var time = state.activeBooking.time;
    var chair = Number(state.activeBooking.chair);

    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
      appointmentErrorEl.textContent = 'Enter first and last names up to 80 characters.';
      appointmentErrorEl.hidden = false;
      appointmentFirstNameInput.focus();
      return;
    }
    if (!window.DentalStorage.isValidPhoneNumber(phone)) {
      appointmentErrorEl.textContent = 'Enter a valid phone number with 7 to 15 digits.';
      appointmentErrorEl.hidden = false;
      appointmentPhoneInput.focus();
      return;
    }
    if (!window.DentalStorage.isValidEmailAddress(email)) {
      appointmentErrorEl.textContent = 'Enter a valid email address or leave it blank.';
      appointmentErrorEl.hidden = false;
      appointmentEmailInput.focus();
      return;
    }
    var existingPatient = getPatientByContact(name, { email: email, phone: phone });
    var emailOwner = email ? window.DentalStorage.findPatientByEmail(email) : null;
    if (email && window.DentalStorage.hasPatientEmail(email) &&
        (!emailOwner || !existingPatient || String(emailOwner.id) !== String(existingPatient.id))) {
      appointmentErrorEl.textContent = 'This email address is already associated with another patient.';
      appointmentErrorEl.hidden = false;
      appointmentEmailInput.focus();
      return;
    }
    if (existingPatient && normalizeName(fullName(existingPatient)) !== normalizeName(name)) {
      appointmentErrorEl.textContent = 'This email address is already associated with a different patient.';
      appointmentErrorEl.hidden = false;
      appointmentEmailInput.focus();
      return;
    }
    var maxChairs = Math.max(1, getChairsList().length);
    if (DEFAULT_TIMES.indexOf(time) < 0 || !Number.isInteger(chair) || chair < 1 || chair > maxChairs ||
        !service) {
      appointmentErrorEl.textContent = 'Choose a valid appointment time, chair, and service.';
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

    if (window.DentalStorage.hasPatientAtTime(schedule, {
      id: existingPatient && existingPatient.id,
      name: name,
      email: email,
      phone: phone
    }, time)) {
      appointmentErrorEl.textContent = 'This patient already has an appointment at that time.';
      appointmentErrorEl.hidden = false;
      return;
    }

    state.isSaving = true;
    try {
      var contact = { phone: phone, email: email, note: note };
      var previousPatient = existingPatient ? JSON.parse(JSON.stringify(existingPatient)) : null;
      var patient = createPatientForAppointment(firstName, lastName, date, time, chair, service, contact);
      if (!patient) throw new Error('The patient record could not be saved.');

      try {
        setSlot(date, time, chair, {
          patientId: patient.id,
          patientName: name,
          patientEmail: email,
          patientPhone: phone,
          service: service,
          dentist: getDentistName(chair),
          note: note,
          status: 'confirmed',
          statusLabel: 'Confirmed'
        });
        var savedSlot = getSlotAt(getSchedule(date), time, chair);
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
      return null;
    }
    return slot.patientId === undefined || slot.patientId === null
      ? getPatientByName(slot.patientName)
      : null;
  }

  function openManageModal(time, chair, slot) {
    state.activeAppointment = { date: new Date(state.selectedDate), time: time, chair: chair, slot: slot };
    document.getElementById('manage-patient').textContent = slot.patientName;
    document.getElementById('manage-info').textContent = formatDate(state.selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }) +
      ' · ' + time + ' · Chair ' + chair + ' (' + getDentistName(chair) + ')';
    document.getElementById('manage-service').textContent = slot.service || 'Appointment';
    document.getElementById('manage-status').value = slot.status || 'confirmed';
    var reschedForm = document.getElementById('manage-reschedule-form');
    var reschedErr = document.getElementById('manage-reschedule-error');
    if (reschedForm) reschedForm.hidden = true;
    if (reschedErr) reschedErr.hidden = true;
    document.getElementById('manage-status-field').hidden = false;
    document.getElementById('save-status').hidden = false;
    manageModal.hidden = false;
  }

  function updateManageRescheduleTimes() {
    var dateInput = document.getElementById('manage-reschedule-date');
    var chairInput = document.getElementById('manage-reschedule-chair');
    var error = document.getElementById('manage-reschedule-error');
    if (!dateInput.value || !chairInput.value) return;

    try {
      var source = state.activeAppointment
        ? {
          date: localDateKey(state.activeAppointment.date),
          time: state.activeAppointment.time,
          chair: state.activeAppointment.chair
        }
        : null;
      var availableTimes = window.DentalStorage.getAvailableAppointmentTimes(
        dateInput.value,
        Number(chairInput.value),
        source,
        manageRescheduleTimeOptions
      );
      manageRescheduleTimeInput.textContent = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = availableTimes.length
        ? 'Choose an available time'
        : 'No available times';
      manageRescheduleTimeInput.appendChild(placeholder);
      availableTimes.forEach(function (time) {
        var option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        manageRescheduleTimeInput.appendChild(option);
      });

      if (error) {
        error.textContent = availableTimes.length
          ? ''
          : 'No available times for this doctor on the selected date.';
        error.hidden = availableTimes.length > 0;
      }
    } catch (availabilityError) {
      if (error) {
        error.textContent = availabilityError.message || 'Could not check appointment availability.';
        error.hidden = false;
      }
    }
  }

  var openRescheduleBtn = document.getElementById('open-reschedule-appt');
  var manageRescheduleForm = document.getElementById('manage-reschedule-form');
  var cancelRescheduleBtn = document.getElementById('cancel-reschedule-appt');
  var manageRescheduleErr = document.getElementById('manage-reschedule-error');
  if (openRescheduleBtn && manageRescheduleForm) {
    openRescheduleBtn.addEventListener('click', function () {
      if (!state.activeAppointment) return;
      var dateInput = document.getElementById('manage-reschedule-date');
      var chairInput = document.getElementById('manage-reschedule-chair');
      if (dateInput) {
        dateInput.min = localDateKey(new Date());
        dateInput.value = localDateKey(state.activeAppointment.date);
      }
      if (chairInput) chairInput.value = String(state.activeAppointment.chair);
      if (manageRescheduleErr) manageRescheduleErr.hidden = true;
      manageRescheduleForm.hidden = !manageRescheduleForm.hidden;
      var rescheduling = !manageRescheduleForm.hidden;
      document.getElementById('manage-status-field').hidden = rescheduling;
      document.getElementById('save-status').hidden = rescheduling;
      if (!manageRescheduleForm.hidden) updateManageRescheduleTimes();
    });
    if (cancelRescheduleBtn) {
      cancelRescheduleBtn.addEventListener('click', function () {
        manageRescheduleForm.hidden = true;
        document.getElementById('manage-status-field').hidden = false;
        document.getElementById('save-status').hidden = false;
      });
    }
    ['manage-reschedule-date', 'manage-reschedule-chair'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', updateManageRescheduleTimes);
    });
    manageRescheduleTimeInput.addEventListener('change', function () {
      if (manageRescheduleErr) manageRescheduleErr.hidden = true;
    });
    manageRescheduleForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!state.activeAppointment || !window.DentalStorage || typeof window.DentalStorage.rescheduleSlot !== 'function') return;
      if (!manageRescheduleForm.reportValidity()) return;
      var fromDate = localDateKey(state.activeAppointment.date);
      var toDate = document.getElementById('manage-reschedule-date').value;
      var toTime = manageRescheduleTimeInput.value;
      var toChair = Number(document.getElementById('manage-reschedule-chair').value);
      try {
        var availableTimes = window.DentalStorage.getAvailableAppointmentTimes(
          toDate,
          toChair,
          { date: fromDate, time: state.activeAppointment.time, chair: state.activeAppointment.chair },
          manageRescheduleTimeOptions
        );
        if (availableTimes.indexOf(toTime) < 0) {
          manageRescheduleErr.textContent = 'That time is no longer available for this doctor. Choose another time.';
          manageRescheduleErr.hidden = false;
          updateManageRescheduleTimes();
          return;
        }
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

  if (initialReschedule) {
    var sourceSlot = getSlotAt(
      getSchedule(state.selectedDate),
      initialReschedule.time,
      initialReschedule.chair
    );
    var matchesPatientId = sourceSlot && initialReschedule.patientId &&
      String(sourceSlot.patientId) === String(initialReschedule.patientId);
    var matchesPatientName = sourceSlot &&
      normalizeName(sourceSlot.patientName) === normalizeName(initialReschedule.patientName);
    if (sourceSlot && sourceSlot.type !== 'break' && (matchesPatientId || matchesPatientName)) {
      openManageModal(initialReschedule.time, initialReschedule.chair, sourceSlot);
      openRescheduleBtn.click();
    } else {
      showToast('The appointment could not be found. Return to the patient page and refresh.');
    }
  } else if (initialPatientName) {
    showToast('Choose an open appointment slot to book for ' + initialPatientName + '.');
  }
})();
