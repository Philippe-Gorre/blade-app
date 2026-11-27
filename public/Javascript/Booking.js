/* Handles direct appointment booking on index.html. */
(function () {
  'use strict';

  var form = document.getElementById('booking-form');
  if (!form) return;

  var firstInput = document.getElementById('pt-fname');
  var lastInput = document.getElementById('pt-lname');
  var phoneInput = document.getElementById('pt-phone');
  var emailInput = document.getElementById('pt-email');
  var dateInput = document.getElementById('pt-date');
  var serviceSelect = document.getElementById('pt-service');
  var chairOptionsEl = document.getElementById('pt-chair-options');
  var timeOptionsEl = document.getElementById('pt-time-options');
  var availableSlotsEl = document.getElementById('pt-available-slots');
  var availabilityMessageEl = document.getElementById('pt-availability-message');
  var submitBtn = document.getElementById('pt-submit');
  var statusEl = document.getElementById('booking-status');
  var modal = document.getElementById('book');
  var closeModalBtn = document.getElementById('booking-close');
  var cancelBtn = document.getElementById('booking-cancel');
  var nextDetailsBtn = document.getElementById('booking-next-details');
  var nextReviewBtn = document.getElementById('booking-next-review');
  var backReviewBtn = document.getElementById('booking-back-review');
  var accountChoiceFieldset = document.getElementById('booking-account-choice');
  var accountChoiceInputs = Array.prototype.slice.call(
    document.querySelectorAll('input[name="account-requested"]')
  );
  var accountModal = document.getElementById('account-modal');
  var accountForm = document.getElementById('account-create-form');
  var accountEmailInput = document.getElementById('account-email');
  var accountFormStatus = document.getElementById('account-form-status');
  var bookingSuccessToast = document.getElementById('booking-success-toast');
  var accountModalCloseBtn = document.getElementById('account-modal-close');
  var accountModalCancelBtn = document.getElementById('account-modal-cancel');
  var bookingSteps = Array.prototype.slice.call(document.querySelectorAll('[data-booking-step]'));
  var progressSteps = Array.prototype.slice.call(document.querySelectorAll('[data-progress-step]'));
  var selectedSlot = null;
  var selectedChair = null;
  var isSaving = false;
  var isComplete = false;
  var bookingSuccessTimer = null;
  var lastFocusedElement = null;
  var lastAccountFocusedElement = null;
  var TIMES = Array.isArray(window.CLINIC_TIMES) && window.CLINIC_TIMES.length
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

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function timeInMinutes(time) {
    var match = String(time).match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!match) return Infinity;
    var hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'pm') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = 'booking-status' + (kind ? ' is-' + kind : '');
    statusEl.hidden = !message;
  }

  function showBookingSuccess(message) {
    if (!bookingSuccessToast) return;
    bookingSuccessToast.textContent = message;
    bookingSuccessToast.hidden = false;
    clearTimeout(bookingSuccessTimer);
    bookingSuccessTimer = setTimeout(function () {
      bookingSuccessToast.hidden = true;
    }, 7000);
  }

  function setStep(step) {
    bookingSteps.forEach(function (section) {
      section.hidden = Number(section.getAttribute('data-booking-step')) !== step;
    });
    progressSteps.forEach(function (item) {
      var itemStep = Number(item.getAttribute('data-progress-step'));
      if (itemStep === step) {
        item.setAttribute('aria-current', 'step');
      } else {
        item.removeAttribute('aria-current');
      }
      item.classList.toggle('is-complete', itemStep < step);
    });
    var dialog = modal.querySelector('.booking-dialog');
    if (dialog) dialog.scrollTop = 0;
  }

  function openModal() {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('booking-modal-open');
    setStep(1);
    renderAvailableSlots();
    closeModalBtn.focus();
  }

  function closeModal() {
    accountModal.hidden = true;
    accountForm.reset();
    accountFormStatus.hidden = true;
    modal.hidden = true;
    document.body.classList.remove('booking-modal-open');
    resetForm();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function openAccountModal() {
    lastAccountFocusedElement = document.activeElement;
    if (accountEmailInput && emailInput) {
      accountEmailInput.value = emailInput.value.trim();
    }
    accountModal.hidden = false;
    accountEmailInput.focus();
  }

  function closeAccountModal() {
    accountModal.hidden = true;
    accountForm.reset();
    accountFormStatus.hidden = true;
    if (lastAccountFocusedElement && typeof lastAccountFocusedElement.focus === 'function') {
      lastAccountFocusedElement.focus();
    }
  }

  function markInvalid(input, invalid) {
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
      input.style.borderColor = '#B3261E';
    } else {
      input.removeAttribute('aria-invalid');
      input.style.borderColor = '';
    }
  }

  function getSchedule(date) {
    if (!window.DentalStorage || typeof window.DentalStorage.getScheduleForDate !== 'function') {
      throw new Error('Appointment storage is unavailable.');
    }
    return window.DentalStorage.getScheduleForDate(date);
  }

  function getSlot(schedule, time, chair) {
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time).toLowerCase().trim() === time.toLowerCase()) {
        return chair === 1 ? schedule[i].chair1 : schedule[i].chair2;
      }
    }
    return null;
  }

  function isPastToday(date, time) {
    var now = new Date();
    if (date !== localDateKey(now)) return false;
    return timeInMinutes(time) <= now.getHours() * 60 + now.getMinutes();
  }

  function createEmptyMessage(container, message) {
    var empty = document.createElement('p');
    empty.className = 'available-slots__empty';
    empty.textContent = message;
    container.appendChild(empty);
  }

  function renderAvailableTimes(schedule, date, chair) {
    availableSlotsEl.textContent = '';
    timeOptionsEl.hidden = false;
    var chairLabel = 'Chair ' + chair + ' (' + getDentistName(chair) + ')';
    availabilityMessageEl.textContent = 'Step 2: Choose an available time for ' + chairLabel + '.';

    var offered = 0;
    TIMES.forEach(function (time) {
      if (getSlot(schedule, time, chair) || isPastToday(date, time)) return;
      offered++;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'available-slot';
      button.setAttribute('aria-pressed', 'false');
      button.textContent = time;
      button.addEventListener('click', function () {
        selectedSlot = { time: time, chair: chair };
        setStatus('', '');
        availableSlotsEl.querySelectorAll('.available-slot').forEach(function (slotButton) {
          slotButton.setAttribute('aria-pressed', slotButton === button ? 'true' : 'false');
        });
      });
      availableSlotsEl.appendChild(button);
    });

    if (offered === 0) {
      availabilityMessageEl.textContent = 'No appointment times are available for ' + chairLabel + '.';
      createEmptyMessage(availableSlotsEl, 'Choose another doctor and chair or date.');
    }
  }

  function renderAvailableSlots() {
    selectedSlot = null;
    selectedChair = null;
    chairOptionsEl.textContent = '';
    availableSlotsEl.textContent = '';
    timeOptionsEl.hidden = true;

    if (!dateInput.value) {
      availabilityMessageEl.textContent = 'Select a date to choose a doctor and chair.';
      createEmptyMessage(chairOptionsEl, 'Choose a date first.');
      return;
    }

    var date = dateInput.value;
    var schedule;
    try {
      schedule = getSchedule(date);
    } catch (error) {
      console.error('Could not load appointment availability:', error);
      availabilityMessageEl.textContent = 'Availability could not be loaded.';
      createEmptyMessage(chairOptionsEl, 'Please refresh the page or call the clinic.');
      return;
    }

    var chairs = getChairsList();
    if (!chairs.length) {
      availabilityMessageEl.textContent = 'No doctors are available for online booking yet.';
      createEmptyMessage(chairOptionsEl, 'Please contact the clinic.');
      return;
    }

    var availableChairs = chairs.filter(function (chairObj) {
      return TIMES.some(function (time) {
        return !getSlot(schedule, time, chairObj.id) && !isPastToday(date, time);
      });
    });

    if (!availableChairs.length) {
      availabilityMessageEl.textContent = 'No appointment times are available on this date.';
      createEmptyMessage(chairOptionsEl, 'Please choose another day.');
      return;
    }

    availabilityMessageEl.textContent = 'Step 1: Choose a doctor and chair.';
    availableChairs.forEach(function (chairObj) {
      var chair = chairObj.id;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'available-slot';
      button.setAttribute('aria-pressed', 'false');
      button.textContent = chairObj.name + ' · ' + chairObj.dentist;
      button.addEventListener('click', function () {
        selectedChair = chair;
        selectedSlot = null;
        setStatus('', '');
        chairOptionsEl.querySelectorAll('.available-slot').forEach(function (chairButton) {
          chairButton.setAttribute('aria-pressed', chairButton === button ? 'true' : 'false');
        });
        renderAvailableTimes(schedule, date, chair);
      });
      chairOptionsEl.appendChild(button);
    });
  }

  function validateContact() {
    var first = firstInput.value.trim().replace(/\s+/g, ' ');
    var last = lastInput.value.trim().replace(/\s+/g, ' ');
    var phone = String(phoneInput.value || '');
    var email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    var firstBad = !first || first.length > 80 || /[\u0000-\u001F\u007F]/.test(first);
    var lastBad = !last || last.length > 80 || /[\u0000-\u001F\u007F]/.test(last);
    var phoneBad = !/^\d{11}$/.test(phone);
    var emailBad = !email || !window.DentalStorage || !window.DentalStorage.isValidEmailAddress(email);
    var gmailBad = !emailBad && !/^[^\s@]+@gmail\.com$/.test(email);

    if (emailInput) emailInput.value = email;

    markInvalid(firstInput, firstBad);
    markInvalid(lastInput, lastBad);
    markInvalid(phoneInput, phoneBad);
    if (emailInput) markInvalid(emailInput, emailBad);

    if (firstBad) {
      setStatus('Enter a first name up to 80 characters.', 'error');
      firstInput.focus();
      return null;
    }
    if (lastBad) {
      setStatus('Enter a last name up to 80 characters.', 'error');
      lastInput.focus();
      return null;
    }
    if (phoneBad) {
      setStatus('Enter an 11-digit cellphone number using numbers only.', 'error');
      phoneInput.focus();
      return null;
    }
    if (emailBad) {
      setStatus('Enter a valid Gmail address.', 'error');
      emailInput.focus();
      return null;
    }
    if (gmailBad) {
      setStatus('Enter a valid Gmail address ending in @gmail.com.', 'error');
      emailInput.focus();
      return null;
    }

    return {
      firstName: first,
      lastName: last,
      name: first + ' ' + last,
      phone: phone,
      email: email
    };
  }

  function validateAppointment() {
    var appointmentDate = new Date(dateInput.value + 'T00:00:00');
    var dateBad = !dateInput.value || isNaN(appointmentDate.getTime()) ||
      localDateKey(appointmentDate) !== dateInput.value ||
      dateInput.value < localDateKey(new Date());
    var serviceBad = !Array.prototype.some.call(serviceSelect.options, function (option) {
      return option.value === serviceSelect.value && !option.disabled;
    });

    markInvalid(dateInput, dateBad);
    markInvalid(serviceSelect, serviceBad);
    if (dateBad) {
      setStatus('Choose today or a future appointment date.', 'error');
      dateInput.focus();
      return null;
    }
    if (serviceBad) {
      setStatus('Choose a service for your appointment.', 'error');
      serviceSelect.focus();
      return null;
    }
    if (!chairOptionsEl.querySelector('.available-slot')) {
      setStatus('No appointments are available on this date. Choose another date.', 'error');
      dateInput.focus();
      return null;
    }
    if (selectedChair !== 1 && selectedChair !== 2) {
      setStatus('Choose a doctor and chair first.', 'error');
      chairOptionsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    if (!selectedSlot) {
      setStatus('Choose an available time for the selected doctor and chair.', 'error');
      timeOptionsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    var maxChairs = Math.max(1, getChairsList().length);
    if (TIMES.indexOf(selectedSlot.time) < 0 ||
        !Number.isInteger(Number(selectedSlot.chair)) || Number(selectedSlot.chair) < 1 || Number(selectedSlot.chair) > maxChairs) {
      setStatus('Choose an available appointment time and chair.', 'error');
      return null;
    }

    return {
      date: dateInput.value,
      service: serviceSelect.value,
      time: selectedSlot.time,
      chair: selectedSlot.chair
    };
  }

  function getBookingData() {
    var contact = validateContact();
    if (!contact) {
      setStep(1);
      return null;
    }
    var appointment = validateAppointment();
    if (!appointment) {
      setStep(2);
      return null;
    }
    var accountRequested = validateAccountPreference();
    if (accountRequested === null) return null;
    return Object.assign({}, contact, appointment, {
      accountRequested: accountRequested
    });
  }

  function validateAccountPreference() {
    var selected = form.querySelector('input[name="account-requested"]:checked');
    if (!selected) {
      accountChoiceFieldset.setAttribute('aria-invalid', 'true');
      setStatus('Choose whether you would like a patient portal account.', 'error');
      accountChoiceInputs[0].focus();
      return null;
    }
    accountChoiceFieldset.removeAttribute('aria-invalid');
    return selected.value === 'yes';
  }

  function updateReview(data) {
    var appointmentDate = new Date(data.date + 'T12:00:00');
    var formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    document.getElementById('review-patient').textContent = data.name;
    document.getElementById('review-phone').textContent = data.phone;
    document.getElementById('review-email').textContent = data.email || 'Not provided';
    document.getElementById('review-datetime').textContent = formattedDate + ' at ' + data.time;
    document.getElementById('review-service').textContent = data.service;
    document.getElementById('review-chair').textContent =
      'Chair ' + data.chair + ' (' + getDentistName(data.chair) + ')';
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function findPatient(data) {
    if (!window.DentalStorage || typeof window.DentalStorage.findPatientByContact !== 'function') return null;
    return window.DentalStorage.findPatientByContact(data);
  }

  function savePatient(data) {
    var date = new Date(data.date + 'T12:00:00');
    var isToday = data.date === localDateKey(new Date());
    var dentist = getDentistName(data.chair);
    var visitDate = isToday
      ? 'Today, ' + data.time
      : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + data.time;
    var updates = {
      nextVisit: visitDate,
      nextVisitDetail: data.service + ' with ' + dentist + ', Chair ' + data.chair,
      dentist: dentist,
      status: 'confirmed',
      statusLabel: 'Confirmed',
      visitingToday: isToday,
      accountRequested: data.accountRequested
    };
    if (data.phone) updates.phone = data.phone;
    if (data.email) updates.email = data.email;
    if (data.portalAccountEmail) updates.portalEmail = data.portalAccountEmail;
    if (data.portalAccountPassword) updates.portalPassword = data.portalAccountPassword;

    var existing = findPatient(data);
    if (existing) {
      if (normalizeName(existing.firstName + ' ' + existing.lastName) !== normalizeName(data.name)) {
        throw new Error('This email address is already associated with a different patient.');
      }
      return window.DentalStorage.updatePatient(existing.id, updates);
    }

    var now = new Date();
    return window.DentalStorage.addPatient(Object.assign({
      firstName: data.firstName,
      lastName: data.lastName,
      lastVisit: 'None yet',
      phone: data.phone,
      email: data.email,
      dentist: dentist,
      patientSince: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isNew: true,
      note: '',
      history: []
    }, updates));
  }

  function saveBooking(data) {
    var schedule = getSchedule(data.date);
    if (getSlot(schedule, data.time, data.chair)) {
      renderAvailableSlots();
      throw new Error('That appointment was just booked. Please choose another available time.');
    }
    var existingPatient = findPatient(data);
    var emailOwner = window.DentalStorage.findPatientByEmail(data.email);
    if (window.DentalStorage.hasPatientEmail(data.email) &&
        (!emailOwner || !existingPatient || String(emailOwner.id) !== String(existingPatient.id))) {
      throw new Error('This email address is already associated with another patient.');
    }
    if (existingPatient &&
        normalizeName(existingPatient.firstName + ' ' + existingPatient.lastName) !== normalizeName(data.name)) {
      throw new Error('This email address is already associated with a different patient.');
    }
    if (window.DentalStorage.hasPatientAtTime(schedule, {
      id: existingPatient && existingPatient.id,
      name: data.name,
      email: data.email,
      phone: data.phone
    }, data.time)) {
      throw new Error('This patient already has an appointment at that time.');
    }

    var previousPatient = existingPatient ? JSON.parse(JSON.stringify(existingPatient)) : null;
    var patient = savePatient(data);
    if (!patient) throw new Error('The patient record could not be saved.');

    try {
      window.DentalStorage.setSlotForDate(data.date, data.time, data.chair, {
        patientId: patient.id,
        patientName: data.name,
        patientEmail: data.email,
        patientPhone: data.phone,
        service: data.service,
        status: 'confirmed',
        statusLabel: 'Confirmed'
      });
      var savedSlot = getSlot(getSchedule(data.date), data.time, data.chair);
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
  }

  function resetForm() {
    form.reset();
    dateInput.min = localDateKey(new Date());
    dateInput.value = localDateKey(new Date());
    selectedSlot = null;
    isComplete = false;
    submitBtn.textContent = 'Confirm appointment';
    submitBtn.disabled = false;
    backReviewBtn.hidden = false;
    [firstInput, lastInput, phoneInput, emailInput].filter(Boolean).forEach(function (input) {
      markInvalid(input, false);
    });
    [dateInput, serviceSelect].forEach(function (input) {
      markInvalid(input, false);
    });
    setStatus('', '');
    setStep(1);
    accountChoiceFieldset.removeAttribute('aria-invalid');
    renderAvailableSlots();
  }

  dateInput.min = localDateKey(new Date());
  dateInput.value = localDateKey(new Date());
  dateInput.addEventListener('change', function () {
    setStatus('', '');
    markInvalid(dateInput, false);
    renderAvailableSlots();
  });

  nextDetailsBtn.addEventListener('click', function () {
    if (!validateContact()) return;
    setStatus('', '');
    setStep(2);
    renderAvailableSlots();
  });

  nextReviewBtn.addEventListener('click', function () {
    var contact = validateContact();
    if (!contact) {
      setStep(1);
      return;
    }
    var appointment = validateAppointment();
    if (!appointment) return;
    updateReview(Object.assign({}, contact, appointment));
    setStatus('', '');
    setStep(3);
  });

  document.querySelectorAll('[data-booking-back]').forEach(function (button) {
    button.addEventListener('click', function () {
      setStatus('', '');
      setStep(1);
    });
  });

  backReviewBtn.addEventListener('click', function () {
    setStatus('', '');
    setStep(2);
  });

  document.querySelectorAll('[data-open-booking]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      openModal();
    });
  });

  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });
  modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.prototype.slice.call(modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'
    )).filter(function (element) {
      return element.getClientRects().length > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  accountChoiceInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      if (input.checked && input.value === 'yes') openAccountModal();
    });
  });

  accountModalCloseBtn.addEventListener('click', closeAccountModal);
  accountModalCancelBtn.addEventListener('click', closeAccountModal);
  accountModal.addEventListener('click', function (event) {
    if (event.target === accountModal) closeAccountModal();
  });
  accountModal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeAccountModal();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.prototype.slice.call(accountModal.querySelectorAll(
      'button:not([disabled]), input:not([disabled])'
    )).filter(function (element) {
      return element.getClientRects().length > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function formatBookingDate(dateKey) {
    var d = new Date(dateKey + 'T12:00:00');
    if (isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function completeBooking(createdAccountEmail, createdAccountPassword) {
    if (isSaving || isComplete) return;
    var data = getBookingData();
    if (!data) return;

    if (createdAccountEmail) {
      data.email = data.email || createdAccountEmail;
      data.portalAccountEmail = createdAccountEmail;
      data.portalAccountPassword = createdAccountPassword || '';
      data.accountRequested = true;
    }

    var currentSchedule;
    try {
      currentSchedule = getSchedule(data.date);
    } catch (error) {
      console.error('Could not confirm appointment availability:', error);
      setStatus(error.message || 'Availability could not be checked. Please try again.', 'error');
      return;
    }
    if (getSlot(currentSchedule, data.time, data.chair)) {
      setStep(2);
      renderAvailableSlots();
      setStatus('That appointment was just booked. Please choose another available time.', 'error');
      return;
    }
    var existingPatient = findPatient(data);
    var emailOwner = window.DentalStorage.findPatientByEmail(data.email);
    if (window.DentalStorage.hasPatientEmail(data.email) &&
        (!emailOwner || !existingPatient || String(emailOwner.id) !== String(existingPatient.id))) {
      setStatus('This email address is already associated with another patient.', 'error');
      setStep(1);
      emailInput.focus();
      return;
    }
    if (existingPatient &&
        normalizeName(existingPatient.firstName + ' ' + existingPatient.lastName) !== normalizeName(data.name)) {
      setStatus('This email address is already associated with a different patient.', 'error');
      setStep(1);
      emailInput.focus();
      return;
    }
    if (window.DentalStorage.hasPatientAtTime(currentSchedule, {
      id: existingPatient && existingPatient.id,
      name: data.name,
      email: data.email,
      phone: data.phone
    }, data.time)) {
      setStep(2);
      setStatus('This patient already has an appointment at that time.', 'error');
      return;
    }

    isSaving = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';
    try {
      saveBooking(data);
      isComplete = true;
      backReviewBtn.hidden = true;
      if (createdAccountEmail && window.DentalStorage && typeof window.DentalStorage.addNotification === 'function') {
        window.DentalStorage.addNotification({
          title: 'Patient portal account created',
          meta: createdAccountEmail,
          href: '/patients'
        });
      }
      var dentist = getDentistName(data.chair);
      var dateLabel = formatBookingDate(data.date);
      var baseMsg = 'Appointment booked! Your ' + data.service + ' visit is confirmed for ' +
        dateLabel + ' at ' + data.time + ' (Chair ' + data.chair + ', ' + dentist + ').';
      var accountMsg = createdAccountEmail
        ? ' Your patient portal account (' + createdAccountEmail + ') is ready — sign in anytime using your email and password.'
        : ' We look forward to seeing you.';
      if (createdAccountEmail) {
        closeModal();
        showBookingSuccess(baseMsg + accountMsg);
      } else {
        setStatus(baseMsg + accountMsg, 'ok');
        submitBtn.textContent = 'Done';
      }
    } catch (error) {
      console.error('Could not complete appointment booking:', error);
      setStatus(error.message || 'The appointment could not be booked. Please try again.', 'error');
    } finally {
      isSaving = false;
      submitBtn.disabled = false;
      if (!isComplete) submitBtn.textContent = 'Confirm appointment';
    }
  }

  accountForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!accountForm.reportValidity()) return;

    var emailVal = String(accountEmailInput.value || '').trim().toLowerCase();
    accountEmailInput.value = emailVal;
    var passwordInputEl = document.getElementById('account-password');
    var passwordVal = passwordInputEl ? String(passwordInputEl.value || '') : '';
    if (emailVal && emailInput && !emailInput.value.trim()) {
      emailInput.value = emailVal;
    }
    var reviewEmailEl = document.getElementById('review-email');
    if (reviewEmailEl && emailVal) {
      reviewEmailEl.textContent = emailVal;
    }
    closeAccountModal();
    completeBooking(emailVal, passwordVal);
  });

  form.querySelectorAll('input, select').forEach(function (input) {
    input.addEventListener('input', function () {
      markInvalid(input, false);
      if (input.name === 'account-requested') accountChoiceFieldset.removeAttribute('aria-invalid');
      if (!isComplete) setStatus('', '');
    });
    input.addEventListener('change', function () {
      markInvalid(input, false);
      if (input.name === 'account-requested') accountChoiceFieldset.removeAttribute('aria-invalid');
      if (!isComplete) setStatus('', '');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isComplete) {
      closeModal();
      return;
    }
    completeBooking(null);
  });

  renderAvailableSlots();
})();
