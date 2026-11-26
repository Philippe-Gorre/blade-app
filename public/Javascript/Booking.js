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
  var accountModalCloseBtn = document.getElementById('account-modal-close');
  var accountModalCancelBtn = document.getElementById('account-modal-cancel');
  var bookingSteps = Array.prototype.slice.call(document.querySelectorAll('[data-booking-step]'));
  var progressSteps = Array.prototype.slice.call(document.querySelectorAll('[data-progress-step]'));
  var selectedSlot = null;
  var isSaving = false;
  var isComplete = false;
  var lastFocusedElement = null;
  var lastAccountFocusedElement = null;
  var TIMES = ['9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'];

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

  function createEmptyMessage(message) {
    var empty = document.createElement('p');
    empty.className = 'available-slots__empty';
    empty.textContent = message;
    availableSlotsEl.appendChild(empty);
  }

  function renderAvailableSlots() {
    selectedSlot = null;
    availableSlotsEl.textContent = '';

    if (!dateInput.value) {
      availabilityMessageEl.textContent = 'Select a date to see open appointment times.';
      createEmptyMessage('Choose a date first.');
      return;
    }

    var date = dateInput.value;
    var schedule;
    try {
      schedule = getSchedule(date);
    } catch (error) {
      console.error('Could not load appointment availability:', error);
      availabilityMessageEl.textContent = 'Availability could not be loaded.';
      createEmptyMessage('Please refresh the page or call the clinic.');
      return;
    }

    var offered = 0;
    availabilityMessageEl.textContent = 'Choose an available time and chair.';
    TIMES.forEach(function (time) {
      [1, 2].forEach(function (chair) {
        if (getSlot(schedule, time, chair) || isPastToday(date, time)) return;
        offered++;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'available-slot';
        button.setAttribute('aria-pressed', 'false');
        button.textContent = time + ' · Chair ' + chair + (chair === 1 ? ' (Dr. Mora)' : ' (Dr. Silva)');
        button.addEventListener('click', function () {
          selectedSlot = { time: time, chair: chair };
          setStatus('', '');
          availableSlotsEl.querySelectorAll('.available-slot').forEach(function (slotButton) {
            slotButton.setAttribute('aria-pressed', slotButton === button ? 'true' : 'false');
          });
        });
        availableSlotsEl.appendChild(button);
      });
    });

    if (offered === 0) {
      availabilityMessageEl.textContent = 'No appointment times are available on this date.';
      createEmptyMessage('Please choose another day.');
    }
  }

  function validateContact() {
    var first = firstInput.value.trim().replace(/\s+/g, ' ');
    var last = lastInput.value.trim().replace(/\s+/g, ' ');
    var phone = phoneInput.value.trim();
    var email = emailInput ? emailInput.value.trim() : '';
    var firstBad = !first || first.length > 80;
    var lastBad = !last || last.length > 80;
    var phoneBad = !window.DentalStorage || !window.DentalStorage.isValidPhoneNumber(phone);
    var emailBad = !window.DentalStorage || !window.DentalStorage.isValidEmailAddress(email);

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
      setStatus('Enter a valid phone number with 7 to 15 digits.', 'error');
      phoneInput.focus();
      return null;
    }
    if (emailBad && email) {
      setStatus('Enter a valid email address or leave the field blank.', 'error');
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
    var serviceBad = !serviceSelect.value;

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
    if (!selectedSlot) {
      setStatus('Choose an available time and chair.', 'error');
      availableSlotsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    if (TIMES.indexOf(selectedSlot.time) < 0 ||
        (selectedSlot.chair !== 1 && selectedSlot.chair !== 2)) {
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
      'Chair ' + data.chair + ' (' + (data.chair === 1 ? 'Dr. Mora' : 'Dr. Silva') + ')';
  }

  function findPatient(name) {
    if (window.DentalStorage && typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(name);
    }

    var patients = window.DentalStorage.getPatients();
    var target = name.trim().replace(/\s+/g, ' ').toLowerCase();
    for (var i = 0; i < patients.length; i++) {
      var patientName = ((patients[i].firstName || '') + ' ' + (patients[i].lastName || ''))
        .trim().replace(/\s+/g, ' ').toLowerCase();
      if (patientName === target) return patients[i];
    }
    return null;
  }

  function savePatient(data) {
    var date = new Date(data.date + 'T12:00:00');
    var isToday = data.date === localDateKey(new Date());
    var dentist = data.chair === 1 ? 'Dr. Mora' : 'Dr. Silva';
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

    var existing = findPatient(data.name);
    if (existing) return window.DentalStorage.updatePatient(existing.id, updates);

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
    if (window.DentalStorage.hasPatientAtTime(schedule, data.name, data.time)) {
      throw new Error('This patient already has an appointment at that time.');
    }

    var patient = savePatient(data);
    if (!patient) throw new Error('The patient record could not be saved.');

    window.DentalStorage.setSlotForDate(data.date, data.time, data.chair, {
      patientId: patient.id,
      patientName: data.name,
      service: data.service,
      status: 'confirmed',
      statusLabel: 'Confirmed'
    });

    var savedSlot = getSlot(getSchedule(data.date), data.time, data.chair);
    if (!savedSlot || savedSlot.patientId !== patient.id) {
      throw new Error('The appointment could not be saved. Please try again.');
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
    if (window.DentalStorage.hasPatientAtTime(currentSchedule, data.name, data.time)) {
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
      var dentist = data.chair === 1 ? 'Dr. Mora' : 'Dr. Silva';
      var dateLabel = formatBookingDate(data.date);
      var baseMsg = 'Appointment booked! Your ' + data.service + ' visit is confirmed for ' +
        dateLabel + ' at ' + data.time + ' (Chair ' + data.chair + ', ' + dentist + ').';
      var accountMsg = createdAccountEmail
        ? ' Your patient portal account (' + createdAccountEmail + ') is ready — sign in anytime using your email and password.'
        : ' We look forward to seeing you.';
      setStatus(baseMsg + accountMsg, 'ok');
      submitBtn.textContent = 'Done';
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

    var emailVal = String(accountEmailInput.value || '').trim();
    var passwordInputEl = document.getElementById('account-password');
    var passwordVal = passwordInputEl ? String(passwordInputEl.value || '') : '';
    if (emailVal && emailInput && !emailInput.value.trim()) {
      emailInput.value = emailVal;
    }
    var reviewEmailEl = document.getElementById('review-email');
    if (reviewEmailEl && emailVal) {
      reviewEmailEl.textContent = emailVal;
    }
    if (window.DentalStorage && typeof window.DentalStorage.addNotification === 'function') {
      window.DentalStorage.addNotification({
        title: 'Patient portal account created',
        meta: emailVal,
        href: '/patients'
      });
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
