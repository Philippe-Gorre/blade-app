/* storage.js
   Central storage layer using browser localStorage.
   Handles persistent saving, retrieval, and updating of:
   - Patients (list, history, notes, statuses)
*/
(function (global) {
  'use strict';

  var PATIENTS_KEY = 'dental_patients';
  var DATED_SCHEDULES_KEY = 'dental_schedules_by_date';
  var INVOICES_KEY = 'dental_invoices';
  var CUSTOM_SERVICES_KEY = 'dental_custom_services';
  var STAFF_ACCOUNTS_KEY = 'dental_staff_accounts';
  var RECALLS_SENT_KEY = 'dental_recalls_sent';
  var PORTAL_SESSION_KEY = 'dental_portal_patient_id';
  var NOTIFICATIONS_KEY = 'dental_notifications';
  var XRAY_DATABASE_NAME = 'dental_xray_files';

  function openXrayDatabase() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('X-ray file storage is not available in this browser.'));
        return;
      }

      var request = global.indexedDB.open(XRAY_DATABASE_NAME, 1);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains('attachments')) {
          var store = database.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error || new Error('Could not open X-ray file storage.'));
      };
    });
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function addSessionGap(dateKey, gapValue, gapUnit) {
    var parts = dateKey.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (gapUnit === 'days') {
      date.setDate(date.getDate() + gapValue);
    } else if (gapUnit === 'weeks') {
      date.setDate(date.getDate() + gapValue * 7);
    } else if (gapUnit === 'months') {
      var day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + gapValue);
      var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(day, lastDay));
    } else {
      throw new Error('Choose a valid session gap unit.');
    }
    return localDateKey(date);
  }

  function isValidDateKey(date) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
    if (!match) return false;
    var parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return localDateKey(parsed) === date;
  }

  function sortSchedule(schedule) {
    return schedule.sort(function (a, b) {
      return timeInMinutes(a.time) - timeInMinutes(b.time);
    });
  }

  function timeInMinutes(time) {
    var match = String(time || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!match) return Infinity;
    var hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'pm') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function normalizePatientName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function normalizePatientEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function normalizePatientPhone(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.slice(0, 2) === '63'
      ? '0' + digits.slice(2)
      : digits;
  }

  function getPatientName(patient) {
    return normalizePatientName((patient.firstName || '') + ' ' + (patient.lastName || ''));
  }

  function getFullName(patient) {
    return String(patient.firstName || '') + ' ' + String(patient.lastName || '');
  }

  function patientEmails(patient) {
    return [patient.email, patient.portalEmail].map(normalizePatientEmail).filter(function (email, index, emails) {
      return email && emails.indexOf(email) === index;
    });
  }

  function hasDuplicateEmail(patients, email, ignoredId) {
    var normalizedEmail = normalizePatientEmail(email);
    if (!normalizedEmail) return false;
    return patients.some(function (patient) {
      var isIgnored = ignoredId !== undefined && ignoredId !== null &&
        String(patient.id) === String(ignoredId);
      return !isIgnored && patientEmails(patient).indexOf(normalizedEmail) >= 0;
    });
  }

  function hasDuplicatePatientEmails(patients) {
    var seen = [];
    for (var i = 0; i < patients.length; i++) {
      var emails = patientEmails(patients[i]);
      for (var j = 0; j < emails.length; j++) {
        if (seen.indexOf(emails[j]) >= 0) return true;
        seen.push(emails[j]);
      }
    }
    return false;
  }

  function patientEmailMatches(patient, email) {
    var target = normalizePatientEmail(email);
    return target && patientEmails(patient).indexOf(target) >= 0;
  }

  function patientIdentityMatches(slot, identity) {
    if (!slot) return false;
    if (identity.id !== undefined && identity.id !== null &&
        slot.patientId !== undefined && slot.patientId !== null) {
      return String(slot.patientId) === String(identity.id);
    }
    var email = normalizePatientEmail(identity.email);
    var slotEmail = normalizePatientEmail(slot.patientEmail);
    if (email && slotEmail) return slotEmail === email;
    var phone = normalizePatientPhone(identity.phone);
    var name = normalizePatientName(identity.name || getFullName(identity));
    if (phone && name && normalizePatientPhone(slot.patientPhone) === phone &&
        normalizePatientName(slot.patientName) === name) return true;
    if (identity.id !== undefined && identity.id !== null &&
        (slot.patientId === undefined || slot.patientId === null) &&
        !slot.patientEmail && !slot.patientPhone && name && typeof DentalStorage !== 'undefined') {
      var uniquePatient = DentalStorage.findPatientByName(name);
      return Boolean(uniquePatient && String(uniquePatient.id) === String(identity.id) &&
        normalizePatientName(slot.patientName) === name);
    }
    return false;
  }

  function isOccupiedByDifferentPatient(existingSlot, slotData) {
    if (!existingSlot || !slotData) return false;
    if (existingSlot === slotData) return false;
    if (existingSlot.patientId !== undefined && existingSlot.patientId !== null &&
        slotData.patientId !== undefined && slotData.patientId !== null) {
      return String(existingSlot.patientId) !== String(slotData.patientId);
    }
    if ((existingSlot.patientId !== undefined && existingSlot.patientId !== null) ||
        (slotData.patientId !== undefined && slotData.patientId !== null)) return true;
    if (existingSlot.type === 'break' || slotData.type === 'break') return true;
    var existingEmail = normalizePatientEmail(existingSlot.patientEmail);
    var newEmail = normalizePatientEmail(slotData.patientEmail);
    if (existingEmail || newEmail) return !existingEmail || !newEmail || existingEmail !== newEmail;
    var existingPhone = normalizePatientPhone(existingSlot.patientPhone);
    var newPhone = normalizePatientPhone(slotData.patientPhone);
    if (existingPhone || newPhone) return !existingPhone || !newPhone || existingPhone !== newPhone;
    return normalizePatientName(existingSlot.patientName) !==
      normalizePatientName(slotData.patientName);
  }

  function getClinicChairs() {
    return Array.isArray(global.CLINIC_CHAIRS) ? global.CLINIC_CHAIRS : [];
  }

  function getClinicTimes() {
    return Array.isArray(global.CLINIC_TIMES) && global.CLINIC_TIMES.length
      ? global.CLINIC_TIMES
      : ['8:00 am', '9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm', '5:00 pm'];
  }

  function getDentistForChair(chairNum) {
    var chairs = getClinicChairs();
    var target = Number(chairNum);
    for (var i = 0; i < chairs.length; i++) {
      if (Number(chairs[i].id) === target) return chairs[i].dentist || ('Doctor ' + target);
    }
    return 'Doctor ' + target;
  }

  function getScheduleSlot(schedule, time, chairNum) {
    var normalizedTime = String(time || '').trim().toLowerCase();
    var chair = Number(chairNum);
    var key = 'chair' + chair;
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time || '').trim().toLowerCase() !== normalizedTime) continue;
      return schedule[i][key] || null;
    }
    return null;
  }

  function hasPatientInOtherChair(schedule, time, chairNum, slotData) {
    if (!slotData || slotData.type === 'break') return false;
    var chair = Number(chairNum);
    var totalChairs = Math.max(2, getClinicChairs().length);
    var identity = {
      id: slotData.patientId,
      name: slotData.patientName,
      email: slotData.patientEmail,
      phone: slotData.patientPhone
    };
    for (var c = 1; c <= totalChairs; c++) {
      if (c === chair) continue;
      if (patientIdentityMatches(getScheduleSlot(schedule, time, c), identity)) return true;
    }
    return false;
  }

  function setScheduleSlot(schedule, time, chairNum, slotData) {
    var normalizedTime = String(time || '').trim().toLowerCase();
    var chair = Number(chairNum);
    var key = 'chair' + chair;
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time || '').trim().toLowerCase() !== normalizedTime) continue;
      schedule[i][key] = slotData;
      sortSchedule(schedule);
      return;
    }
    if (!time) throw new Error('A valid appointment time is required.');
    var newRow = { time: time };
    var totalChairs = Math.max(chair, getClinicChairs().length);
    for (var c = 1; c <= totalChairs; c++) {
      newRow['chair' + c] = c === chair ? slotData : null;
    }
    schedule.push(newRow);
    sortSchedule(schedule);
  }

  function isValidPhoneNumber(value) {
    var phone = String(value || '').trim();
    var digits = phone.replace(/\D/g, '');
    return phone.length <= 20 && /^\+?[\d\s().-]+$/.test(phone) &&
      digits.length >= 7 && digits.length <= 15;
  }

  function isValidEmailAddress(value) {
    var email = String(value || '').trim();
    return email.length <= 254 && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }

  var DentalStorage = {
    // ---------- PATIENTS STORAGE ----------
    getPatients: function () {
      try {
        var raw = localStorage.getItem(PATIENTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to load patients from storage:', e);
        return [];
      }
    },

    savePatients: function (patients) {
      if (!Array.isArray(patients) || hasDuplicatePatientEmails(patients)) {
        console.error('Patient records must have unique email addresses.');
        return false;
      }
      try {
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
        return true;
      } catch (e) {
        console.error('Failed to save patients to storage:', e);
        return false;
      }
    },

    getPatientById: function (id) {
      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].id === id || String(patients[i].id) === String(id)) {
          return patients[i];
        }
      }
      return null;
    },

    findPatientByName: function (name) {
      var target = normalizePatientName(name);
      if (!target) return null;

      var matches = this.getPatients().filter(function (patient) {
        return getPatientName(patient) === target;
      });
      return matches.length === 1 ? matches[0] : null;
    },

    findPatientByEmail: function (email) {
      var target = normalizePatientEmail(email);
      if (!target) return null;

      var matches = this.getPatients().filter(function (patient) {
        return patientEmailMatches(patient, target);
      });
      return matches.length === 1 ? matches[0] : null;
    },

    findPatientByContact: function (contact) {
      contact = contact || {};
      var email = normalizePatientEmail(contact.email);
      if (email) {
        var matchesByEmail = this.getPatients().filter(function (patient) {
          return patientEmailMatches(patient, email);
        });
        return matchesByEmail.length === 1 ? matchesByEmail[0] : null;
      }

      var phone = normalizePatientPhone(contact.phone);
      var name = normalizePatientName(contact.name || getFullName(contact));
      if (!phone || !name) return null;

      var matchesByContact = this.getPatients().filter(function (patient) {
        return normalizePatientPhone(patient.phone) === phone && getPatientName(patient) === name;
      });
      return matchesByContact.length === 1 ? matchesByContact[0] : null;
    },

    hasPatientEmail: function (email, ignoredId) {
      return hasDuplicateEmail(this.getPatients(), email, ignoredId);
    },

    isValidPhoneNumber: isValidPhoneNumber,
    isValidEmailAddress: isValidEmailAddress,

    hasPatientAtTime: function (schedule, patientIdentity, time) {
      var identity = typeof patientIdentity === 'string'
        ? { name: patientIdentity }
        : (patientIdentity || {});
      var targetName = normalizePatientName(identity.name || getFullName(identity));
      var targetEmail = normalizePatientEmail(identity.email);
      var targetPhone = normalizePatientPhone(identity.phone);
      var targetId = identity.id;
      var targetTime = String(time || '').trim().toLowerCase();
      var uniqueNameMatch = typeof patientIdentity === 'string'
        ? this.findPatientByName(targetName)
        : null;
      if (!targetTime || (targetId === undefined && !targetEmail && !targetPhone && !targetName)) return false;

      return schedule.some(function (row) {
        if (String(row.time || '').trim().toLowerCase() !== targetTime) return false;
        var totalChairs = Math.max(2, getClinicChairs().length);
        for (var c = 1; c <= totalChairs; c++) {
          var slot = row['chair' + c];
          if (patientIdentityMatches(slot, identity)) return true;
          if (uniqueNameMatch && slot &&
              (slot.patientId === undefined || slot.patientId === null) &&
              !slot.patientEmail && !slot.patientPhone &&
              normalizePatientName(slot && slot.patientName) === targetName) {
            return true;
          }
        }
        return false;
      });
    },

    addPatient: function (patientData) {
      var patients = this.getPatients();
      var firstName = String(patientData.firstName || '').trim().replace(/\s+/g, ' ');
      var lastName = String(patientData.lastName || '').trim().replace(/\s+/g, ' ');
      if (!firstName || !lastName) throw new Error('First and last names are required.');
      var email = normalizePatientEmail(patientData.email);
      var portalEmail = normalizePatientEmail(patientData.portalEmail);
      if (email && !isValidEmailAddress(email)) throw new Error('Enter a valid email address.');
      if (portalEmail && !isValidEmailAddress(portalEmail)) throw new Error('Enter a valid portal email address.');
      if (this.hasPatientEmail(email) || this.hasPatientEmail(portalEmail)) {
        throw new Error('This email address is already used by another patient.');
      }

      var id = patientData.id || Date.now();
      var newPatient = Object.assign({}, patientData, {
        id: id,
        firstName: firstName,
        lastName: lastName,
        email: email,
        portalEmail: portalEmail
      });
      patients.push(newPatient);
      if (!this.savePatients(patients)) throw new Error('The patient record could not be saved.');
      return newPatient;
    },

    updatePatient: function (id, updates) {
      var patients = this.getPatients();
      var found = null;
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].id === id || String(patients[i].id) === String(id)) {
          var nextPatient = Object.assign({}, patients[i], updates);
          var email = normalizePatientEmail(nextPatient.email);
          var portalEmail = normalizePatientEmail(nextPatient.portalEmail);
          if (email && !isValidEmailAddress(email)) throw new Error('Enter a valid email address.');
          if (portalEmail && !isValidEmailAddress(portalEmail)) throw new Error('Enter a valid portal email address.');
          if (this.hasPatientEmail(email, patients[i].id) ||
              this.hasPatientEmail(portalEmail, patients[i].id)) {
            throw new Error('This email address is already used by another patient.');
          }
          nextPatient.email = email;
          nextPatient.portalEmail = portalEmail;
          Object.assign(patients[i], nextPatient);
          found = patients[i];
          break;
        }
      }
      if (found) {
        if (!this.savePatients(patients)) throw new Error('The patient record could not be saved.');
      }
      return found;
    },

    deletePatient: function (id) {
      var patients = this.getPatients();
      var filtered = patients.filter(function (p) {
        return p.id !== id && String(p.id) !== String(id);
      });
      this.savePatients(filtered);
      return filtered;
    },

    // ---------- SCHEDULE / CHAIR GRID STORAGE ----------
    getChairs: function () {
      return getClinicChairs();
    },

    getDentistName: function (chairNum) {
      return getDentistForChair(chairNum);
    },

    normalizeScheduleRows: function (rows) {
      var list = Array.isArray(rows) ? rows.slice() : [];
      var times = getClinicTimes();
      var totalChairs = Math.max(1, getClinicChairs().length);

      times.forEach(function (time) {
        var exists = list.some(function (r) {
          return String(r.time || '').trim().toLowerCase() === String(time).toLowerCase();
        });
        if (!exists) {
          var row = { time: time };
          for (var c = 1; c <= totalChairs; c++) row['chair' + c] = null;
          list.push(row);
        }
      });

      list.forEach(function (row) {
        for (var c = 1; c <= totalChairs; c++) {
          if (!Object.prototype.hasOwnProperty.call(row, 'chair' + c)) {
            row['chair' + c] = null;
          }
        }
      });

      return sortSchedule(list);
    },

    getDefaultSchedule: function () {
      var times = getClinicTimes();
      var totalChairs = Math.max(1, getClinicChairs().length);
      return times.map(function (time) {
        var row = { time: time };
        for (var c = 1; c <= totalChairs; c++) {
          row['chair' + c] = null;
        }
        return row;
      });
    },

    getSchedule: function () {
      var SCHEDULE_KEY = 'dental_schedule';
      try {
        var raw = localStorage.getItem(SCHEDULE_KEY);
        if (raw) return this.normalizeScheduleRows(JSON.parse(raw));
        return this.getDefaultSchedule();
      } catch (e) {
        console.error('Failed to load schedule from storage:', e);
        return this.getDefaultSchedule();
      }
    },

    saveSchedule: function (schedule) {
      var SCHEDULE_KEY = 'dental_schedule';
      try {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
        return true;
      } catch (e) {
        console.error('Failed to save schedule to storage:', e);
        return false;
      }
    },

    getScheduleForDate: function (date) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.getSchedule();

      try {
        var schedules = JSON.parse(localStorage.getItem(DATED_SCHEDULES_KEY) || '{}');
        return schedules[date] ? this.normalizeScheduleRows(schedules[date]) : this.getDefaultSchedule();
      } catch (e) {
        console.error('Failed to load dated schedule from storage:', e);
        return this.getDefaultSchedule();
      }
    },

    getAvailableAppointmentTimes: function (date, chairNum, sourceSlot, candidateTimes) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      var chair = Number(chairNum);
      var maxChairs = Math.max(1, getClinicChairs().length);
      if (!Number.isInteger(chair) || chair < 1 || chair > maxChairs) {
        throw new Error('A valid chair is required to check availability.');
      }
      if (!Array.isArray(candidateTimes)) {
        throw new Error('Appointment time options are required to check availability.');
      }

      var schedule = this.getScheduleForDate(date);
      var todayKey = localDateKey(new Date());
      var now = new Date();
      var currentMinutes = now.getHours() * 60 + now.getMinutes();
      var sourceIdentity = null;
      if (sourceSlot && isValidDateKey(sourceSlot.date) &&
          timeInMinutes(sourceSlot.time) !== Infinity &&
          Number.isInteger(Number(sourceSlot.chair)) && Number(sourceSlot.chair) >= 1) {
        var sourceSchedule = this.getScheduleForDate(sourceSlot.date);
        var sourceAppointment = getScheduleSlot(sourceSchedule, sourceSlot.time, sourceSlot.chair);
        var sourcePatient = sourceAppointment && sourceAppointment.patientId
          ? this.getPatientById(sourceAppointment.patientId)
          : null;
        if (!sourcePatient && sourceAppointment) {
          sourcePatient = this.findPatientByContact({
            name: sourceAppointment.patientName,
            email: sourceAppointment.patientEmail,
            phone: sourceAppointment.patientPhone
          });
        }
        if (!sourcePatient && sourceAppointment) {
          sourcePatient = this.findPatientByName(sourceAppointment.patientName);
        }
        if (sourceAppointment) {
          sourceIdentity = {
            id: sourceAppointment.patientId || (sourcePatient && sourcePatient.id),
            name: sourceAppointment.patientName,
            email: sourceAppointment.patientEmail || (sourcePatient && sourcePatient.email),
            phone: sourceAppointment.patientPhone || (sourcePatient && sourcePatient.phone)
          };
        }
      }
      var self = this;

      return candidateTimes.filter(function (candidateTime) {
        var time = String(candidateTime || '').trim();
        var minutes = timeInMinutes(time);
        if (!time || minutes === Infinity) return false;
        if (date === todayKey && minutes <= currentMinutes) return false;
        if (sourceSlot && sourceSlot.date === date &&
            String(sourceSlot.time).toLowerCase().trim() === time.toLowerCase() &&
            Number(sourceSlot.chair) === chair) {
          return false;
        }

        var occupied = Boolean(getScheduleSlot(schedule, time, chair));
        if (occupied) return false;
        var sameDateAndTimeAsSource = sourceSlot && sourceSlot.date === date &&
          String(sourceSlot.time).toLowerCase().trim() === time.toLowerCase();
        if (!sameDateAndTimeAsSource && sourceIdentity &&
            self.hasPatientAtTime(schedule, sourceIdentity, time)) return false;
        return true;
      });
    },

    getServiceTreatmentPlan: function (serviceName) {
      var customServices = this.getCustomServices();
      var service = customServices.find(function (item) {
        return String(item.name || '').toLowerCase() === String(serviceName || '').toLowerCase();
      });
      var sessions = service ? Number(service.sessions) : 1;
      var gapValue = service ? Number(service.gapValue) : 4;
      var gapUnit = service && ['days', 'weeks', 'months'].indexOf(service.gapUnit) >= 0
        ? service.gapUnit
        : 'weeks';

      return {
        totalSessions: Number.isInteger(sessions) && sessions >= 1 && sessions <= 50 ? sessions : 1,
        sessionNumber: 1,
        gapValue: Number.isInteger(gapValue) && gapValue >= 1 && gapValue <= 365 ? gapValue : 4,
        gapUnit: gapUnit
      };
    },

    bookFollowUpSession: function (record, gapValue, gapUnit) {
      var value = Number(gapValue);
      if (!Number.isInteger(value) || value < 1 || value > 365) {
        throw new Error('Enter a session gap from 1 to 365.');
      }
      if (['days', 'weeks', 'months'].indexOf(gapUnit) < 0) {
        throw new Error('Choose a valid session gap unit.');
      }
      if (!record || !isValidDateKey(record.date) || !record.slot) {
        throw new Error('The completed appointment could not be found.');
      }
      if (timeInMinutes(record.time) === Infinity ||
          (Number(record.chair) !== 1 && Number(record.chair) !== 2)) {
        throw new Error('The follow-up appointment has an invalid time or chair.');
      }

      var source = record.slot;
      var plan = source.treatmentPlan || this.getServiceTreatmentPlan(source.service);
      var currentSession = Number(plan.sessionNumber) || 1;
      var totalSessions = Number(plan.totalSessions) || 1;
      if (currentSession >= totalSessions) {
        throw new Error('There are no remaining sessions to book.');
      }

      var targetDate = addSessionGap(record.date, value, gapUnit);
      var appointmentDate = null;
      for (var offset = 0; offset <= 365; offset++) {
        var candidate = new Date(
          Number(targetDate.slice(0, 4)),
          Number(targetDate.slice(5, 7)) - 1,
          Number(targetDate.slice(8, 10)) + offset
        );
        var candidateKey = localDateKey(candidate);
        var schedule = this.getScheduleForDate(candidateKey);
        var timeRow = schedule.find(function (row) {
          return String(row.time || '').toLowerCase().trim() === String(record.time).toLowerCase().trim();
        });
        var occupied = timeRow && (Number(record.chair) === 1 ? timeRow.chair1 : timeRow.chair2);
        var patient = source.patientId ? this.getPatientById(source.patientId) :
          this.findPatientByContact({
            name: source.patientName,
            email: source.patientEmail,
            phone: source.patientPhone
          });
        var identity = {
          id: source.patientId || (patient && patient.id),
          name: source.patientName,
          email: source.patientEmail || (patient && patient.email),
          phone: source.patientPhone || (patient && patient.phone)
        };
        if (!occupied && !this.hasPatientAtTime(schedule, identity, record.time)) {
          appointmentDate = candidateKey;
          break;
        }
      }
      if (!appointmentDate) {
        throw new Error('No matching chair and time are available within 1 year of the requested gap.');
      }

      var followUp = Object.assign({}, source, {
        status: 'confirmed',
        statusLabel: 'Confirmed',
        treatmentPlan: Object.assign({}, plan, {
          sessionNumber: currentSession + 1,
          gapValue: value,
          gapUnit: gapUnit
        })
      });
      delete followUp.session;
      delete followUp.seatedAt;
      delete followUp.checkedInAt;
      delete followUp.completedAt;
      delete followUp.followUpAppointment;

      this.setSlotForDate(appointmentDate, record.time, record.chair, Object.assign({}, followUp, {
        patientEmail: identity.email || '',
        patientPhone: identity.phone || ''
      }));
      var savedSchedule = this.getScheduleForDate(appointmentDate);
      var savedRow = savedSchedule.find(function (row) {
        return String(row.time || '').toLowerCase().trim() === String(record.time).toLowerCase().trim();
      });
      var savedSlot = savedRow && (Number(record.chair) === 1 ? savedRow.chair1 : savedRow.chair2);
      if (!savedSlot || String(savedSlot.patientId) !== String(source.patientId)) {
        throw new Error('The follow-up appointment could not be saved.');
      }

      var patient = source.patientId ? this.getPatientById(source.patientId) : this.findPatientByName(source.patientName);
      if (patient) {
        var dateParts = appointmentDate.split('-').map(Number);
        var nextDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        var dentist = Number(record.chair) === 1 ? 'Dr. Mora' : 'Dr. Silva';
        this.updatePatient(patient.id, {
          nextVisit: nextDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }) + ', ' + record.time,
          nextVisitDetail: (source.service || 'Dental care') + ' with ' + dentist + ', Chair ' + record.chair,
          dentist: dentist,
          visitingToday: appointmentDate === localDateKey(new Date()),
          status: 'confirmed',
          statusLabel: 'Confirmed'
        });
      }

      return {
        date: appointmentDate,
        requestedDate: targetDate,
        slot: savedSlot
      };
    },

    saveScheduleForDate: function (date, schedule) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.saveSchedule(schedule);

      try {
        var schedules = JSON.parse(localStorage.getItem(DATED_SCHEDULES_KEY) || '{}');
        schedules[date] = schedule;
        localStorage.setItem(DATED_SCHEDULES_KEY, JSON.stringify(schedules));
        return true;
      } catch (e) {
        console.error('Failed to save dated schedule to storage:', e);
        return false;
      }
    },

    setSlotForDate: function (date, time, chairNum, slotData) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      slotData = this.withServiceTreatmentPlan(slotData);
      if (date === localDateKey(new Date())) return this.setSlot(time, chairNum, slotData);

      var schedule = this.getScheduleForDate(date);
      var chair = Number(chairNum);
      var maxChairs = Math.max(2, getClinicChairs().length);
      if (!Number.isInteger(chair) || chair < 1 || chair > maxChairs) throw new Error('A valid chair is required.');
      var existingSlot = getScheduleSlot(schedule, time, chair);
      if (isOccupiedByDifferentPatient(existingSlot, slotData)) {
        throw new Error('That chair and time are already booked.');
      }
      if (hasPatientInOtherChair(schedule, time, chair, slotData)) {
        throw new Error('This patient already has an appointment at that time.');
      }

      setScheduleSlot(schedule, time, chair, slotData);
      if (!this.saveScheduleForDate(date, schedule)) {
        throw new Error('The appointment schedule could not be saved.');
      }
      return schedule;
    },

    checkInSlotForDate: function (date, time, chairNum) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.checkInSlot(time, chairNum);

      var schedule = this.getScheduleForDate(date);
      var key = 'chair' + Number(chairNum);
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          var target = schedule[i][key];
          if (target && target.type !== 'break') {
            target.status = 'checked-in';
            target.statusLabel = 'Checked in';
          }
          break;
        }
      }
      this.saveScheduleForDate(date, schedule);
      return schedule;
    },

    setSlot: function (time, chairNum, slotData) {
      slotData = this.withServiceTreatmentPlan(slotData);
      var schedule = this.getSchedule();
      var chair = Number(chairNum);
      var maxChairs = Math.max(2, getClinicChairs().length);
      if (!Number.isInteger(chair) || chair < 1 || chair > maxChairs) throw new Error('A valid chair is required.');
      var existingSlot = getScheduleSlot(schedule, time, chair);
      if (isOccupiedByDifferentPatient(existingSlot, slotData)) {
        throw new Error('That chair and time are already booked.');
      }
      if (hasPatientInOtherChair(schedule, time, chair, slotData)) {
        throw new Error('This patient already has an appointment at that time.');
      }

      setScheduleSlot(schedule, time, chair, slotData);
      if (!this.saveSchedule(schedule)) {
        throw new Error('The appointment schedule could not be saved.');
      }
      return schedule;
    },

    withServiceTreatmentPlan: function (slotData) {
      if (!slotData || slotData.type === 'break' || slotData.treatmentPlan || !slotData.service) {
        return slotData;
      }
      return Object.assign({}, slotData, {
        treatmentPlan: this.getServiceTreatmentPlan(slotData.service)
      });
    },

    clearSlot: function (time, chairNum) {
      return this.setSlot(time, chairNum, null);
    },

    rescheduleSlot: function (fromDate, fromTime, fromChair, toDate, toTime, toChair) {
      if (!isValidDateKey(fromDate) || !isValidDateKey(toDate)) {
        throw new Error('A valid YYYY-MM-DD date is required.');
      }
      var fromChairNum = Number(fromChair);
      var toChairNum = Number(toChair);
      var maxChairs = Math.max(2, getClinicChairs().length);
      if (!Number.isInteger(fromChairNum) || fromChairNum < 1 || fromChairNum > maxChairs ||
          !Number.isInteger(toChairNum) || toChairNum < 1 || toChairNum > maxChairs ||
          timeInMinutes(fromTime) === Infinity || timeInMinutes(toTime) === Infinity) {
        throw new Error('Choose a valid appointment time and chair.');
      }
      var todayKey = localDateKey(new Date());
      if (toDate < todayKey ||
          (toDate === todayKey && timeInMinutes(toTime) <=
            new Date().getHours() * 60 + new Date().getMinutes())) {
        throw new Error('Choose a future appointment time.');
      }
      var sameSpot = fromDate === toDate &&
        String(fromTime).toLowerCase().trim() === String(toTime).toLowerCase().trim() &&
        fromChairNum === toChairNum;
      if (sameSpot) {
        throw new Error('Choose a different date, time, or chair.');
      }

      var fromSchedule = this.getScheduleForDate(fromDate);
      var sourceSlot = getScheduleSlot(fromSchedule, fromTime, fromChairNum);
      if (!sourceSlot || sourceSlot.type === 'break') {
        throw new Error('The original appointment could not be found.');
      }

      var toSchedule = fromDate === toDate ? fromSchedule : this.getScheduleForDate(toDate);
      var existingTarget = getScheduleSlot(toSchedule, toTime, toChairNum);
      if (existingTarget) {
        throw new Error(existingTarget.type === 'break'
          ? 'That slot is a clinic break. Please choose another time.'
          : 'That chair and time are already booked.');
      }

      var patient = sourceSlot.patientId ? this.getPatientById(sourceSlot.patientId) : null;
      if (!patient) {
        patient = this.findPatientByContact({
          name: sourceSlot.patientName,
          email: sourceSlot.patientEmail,
          phone: sourceSlot.patientPhone
        });
      }
      if (!patient) patient = this.findPatientByName(sourceSlot.patientName);
      var identity = {
        id: sourceSlot.patientId || (patient && patient.id),
        name: sourceSlot.patientName,
        email: sourceSlot.patientEmail || (patient && patient.email),
        phone: sourceSlot.patientPhone || (patient && patient.phone)
      };
      var sameDateAndTime = fromDate === toDate &&
        String(fromTime).toLowerCase().trim() === String(toTime).toLowerCase().trim();
      if (!sameDateAndTime && this.hasPatientAtTime(toSchedule, identity, toTime)) {
        throw new Error('This patient already has an appointment at that time.');
      }

      var dentist = getDentistForChair(toChairNum);
      var movedSlot = Object.assign({}, sourceSlot, {
        dentist: dentist,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        rescheduledAt: new Date().toISOString()
      });

      if (fromDate === toDate) {
        var sameDateSchedule = JSON.parse(JSON.stringify(fromSchedule));
        setScheduleSlot(sameDateSchedule, fromTime, fromChairNum, null);
        setScheduleSlot(sameDateSchedule, toTime, toChairNum, movedSlot);
        if (!this.saveScheduleForDate(fromDate, sameDateSchedule)) {
          throw new Error('The appointment could not be rescheduled. The original booking is unchanged.');
        }
      } else {
        var sourceCopy = JSON.parse(JSON.stringify(fromSchedule));
        var targetCopy = JSON.parse(JSON.stringify(toSchedule));
        setScheduleSlot(sourceCopy, fromTime, fromChairNum, null);
        setScheduleSlot(targetCopy, toTime, toChairNum, movedSlot);
        if (!this.saveScheduleForDate(toDate, targetCopy)) {
          throw new Error('The new appointment time could not be saved. The original booking is unchanged.');
        }
        if (!this.saveScheduleForDate(fromDate, sourceCopy)) {
          if (!this.saveScheduleForDate(toDate, toSchedule)) {
            throw new Error('Rescheduling failed and the new slot could not be rolled back. Contact the clinic administrator.');
          }
          throw new Error('The original booking could not be moved. The new booking was rolled back.');
        }
      }

      var isToday = toDate === todayKey;
      if (patient) {
        this.updatePatient(patient.id, {
          nextVisit: (isToday ? 'Today, ' : toDate + ', ') + toTime,
          nextVisitDetail: (movedSlot.service || 'Dental care') + ' with ' + dentist + ', Chair ' + toChairNum,
          dentist: dentist,
          visitingToday: isToday,
          status: movedSlot.status || 'confirmed',
          statusLabel: movedSlot.statusLabel || 'Confirmed'
        });
      }

      return movedSlot;
    },

    checkInSlot: function (time, chairNum) {
      var schedule = this.getSchedule();
      var key = 'chair' + Number(chairNum);

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          var target = schedule[i][key];
          if (target && target.type !== 'break') {
            target.status = 'checked-in';
            target.statusLabel = 'Checked in';
          }
          break;
        }
      }
      this.saveSchedule(schedule);
      return schedule;
    },

    setLunchBreak: function (date, time, chairNum, dentistName) {
      var keyDate = date || localDateKey(new Date());
      var schedule = this.getScheduleForDate(keyDate);
      var existing = getScheduleSlot(schedule, time, chairNum);
      if (existing && existing.type !== 'break' && existing.patientName) {
        throw new Error('There is already a patient booked at ' + time + '. Reschedule or choose another time.');
      }
      var dentist = dentistName || getDentistForChair(chairNum);
      return this.setSlotForDate(keyDate, time, chairNum, {
        type: 'break',
        label: 'Lunch break',
        dentist: dentist,
        createdAt: new Date().toISOString()
      });
    },

    clearLunchBreak: function (date, time, chairNum) {
      var keyDate = date || localDateKey(new Date());
      var schedule = this.getScheduleForDate(keyDate);
      var existing = getScheduleSlot(schedule, time, chairNum);
      if (!existing || existing.type !== 'break') return schedule;
      return this.setSlotForDate(keyDate, time, chairNum, null);
    },

    syncPatientCheckIn: function (patientName) {
      if (!patientName) return;
      var schedule = this.getSchedule();
      var patient = this.getPatientById(patientName);
      var targetId = patient ? String(patient.id) : null;
      var targetName = patient ? getPatientName(patient) : normalizePatientName(patientName);
      var uniqueNameMatch = this.findPatientByName(patient ? getFullName(patient) : patientName);
      var canMatchName = uniqueNameMatch &&
        (!targetId || String(uniqueNameMatch.id) === targetId);
      var changed = false;

      for (var i = 0; i < schedule.length; i++) {
        [schedule[i].chair1, schedule[i].chair2].forEach(function (slot) {
          if (!slot) return;
          var matchesId = targetId && slot.patientId !== undefined && slot.patientId !== null &&
            String(slot.patientId) === targetId;
          var matchesName = canMatchName && (slot.patientId === undefined || slot.patientId === null) &&
            normalizePatientName(slot.patientName) === targetName;
          if (matchesId || matchesName) {
            slot.status = 'checked-in';
            slot.statusLabel = 'Checked in';
            changed = true;
          }
        });
      }
      if (changed) {
        this.saveSchedule(schedule);
      }
    },

    saveXrayAttachment: function (sessionId, file) {
      return openXrayDatabase().then(function (database) {
        return new Promise(function (resolve, reject) {
          var transaction = database.transaction('attachments', 'readwrite');
          var id = 'xray-' + Date.now() + '-' + Math.random().toString(36).slice(2);
          transaction.objectStore('attachments').add({
            id: id,
            sessionId: sessionId,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            createdAt: new Date().toISOString(),
            file: file
          });
          transaction.oncomplete = function () {
            database.close();
            resolve({
              id: id,
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size
            });
          };
          transaction.onerror = function () {
            database.close();
            reject(transaction.error || new Error('Could not save the X-ray file.'));
          };
          transaction.onabort = function () {
            database.close();
            reject(transaction.error || new Error('Saving the X-ray file was cancelled.'));
          };
        });
      });
    },

    getXrayAttachment: function (id) {
      return openXrayDatabase().then(function (database) {
        return new Promise(function (resolve, reject) {
          var transaction = database.transaction('attachments', 'readonly');
          var request = transaction.objectStore('attachments').get(id);
          request.onsuccess = function () {
            database.close();
            resolve(request.result || null);
          };
          request.onerror = function () {
            database.close();
            reject(request.error || new Error('Could not load the X-ray file.'));
          };
          transaction.onabort = function () {
            database.close();
            reject(transaction.error || new Error('Loading the X-ray file was cancelled.'));
          };
        });
      });
    },

    deleteXrayAttachment: function (id) {
      return openXrayDatabase().then(function (database) {
        return new Promise(function (resolve, reject) {
          var transaction = database.transaction('attachments', 'readwrite');
          transaction.objectStore('attachments').delete(id);
          transaction.oncomplete = function () {
            database.close();
            resolve();
          };
          transaction.onerror = function () {
            database.close();
            reject(transaction.error || new Error('Could not remove the X-ray file.'));
          };
          transaction.onabort = function () {
            database.close();
            reject(transaction.error || new Error('Removing the X-ray file was cancelled.'));
          };
        });
      });
    },

    clearAll: function () {
      localStorage.removeItem(PATIENTS_KEY);
      localStorage.removeItem('dental_requests');
      localStorage.removeItem('dental_schedule');
      localStorage.removeItem(DATED_SCHEDULES_KEY);
      localStorage.removeItem(INVOICES_KEY);
      localStorage.removeItem(CUSTOM_SERVICES_KEY);
      localStorage.removeItem(STAFF_ACCOUNTS_KEY);
      localStorage.removeItem(RECALLS_SENT_KEY);
      localStorage.removeItem(NOTIFICATIONS_KEY);
      sessionStorage.removeItem(PORTAL_SESSION_KEY);
      localStorage.removeItem(PORTAL_SESSION_KEY);
      return new Promise(function (resolve, reject) {
        if (!global.indexedDB) {
          resolve();
          return;
        }
        var request = global.indexedDB.deleteDatabase(XRAY_DATABASE_NAME);
        request.onsuccess = function () {
          resolve();
        };
        request.onerror = function () {
          reject(request.error || new Error('Could not clear X-ray file storage.'));
        };
        request.onblocked = function () {
          reject(new Error('X-ray file storage is in use and could not be cleared.'));
        };
      });
    },

    // ---------- PHONE & PORTAL SESSION ----------
    normalizePhoneDigits: function (phone) {
      var digits = String(phone || '').replace(/\D/g, '');
      if (digits.length >= 10 && digits.slice(0, 2) === '63') {
        digits = '0' + digits.slice(2);
      }
      return digits;
    },

    findPatientByPhone: function (phone) {
      var target = this.normalizePhoneDigits(phone);
      if (!target || target.length < 7) return null;
      var matches = this.getPatients().filter(function (patient) {
        var pDigits = this.normalizePhoneDigits(patient.phone);
        return pDigits && (pDigits === target || pDigits.slice(-10) === target.slice(-10));
      }, this);
      return matches.length === 1 ? matches[0] : null;
    },

    verifyPortalLogin: function (email, password) {
      var patient = this.findPatientByEmail(email);
      if (!patient) {
        return { ok: false, message: 'No patient portal account found for that email address.' };
      }
      if (!patient.portalPassword) {
        return { ok: false, message: 'No portal password is set for this email yet. Create an account when booking or contact the clinic.' };
      }
      if (patient.portalPassword !== String(password || '')) {
        return { ok: false, message: 'Incorrect email or password.' };
      }
      return { ok: true, patient: patient };
    },

    getPortalSession: function () {
      try {
        var id = sessionStorage.getItem(PORTAL_SESSION_KEY) || localStorage.getItem(PORTAL_SESSION_KEY);
        return id ? this.getPatientById(id) : null;
      } catch (e) {
        return null;
      }
    },

    setPortalSession: function (patientId) {
      try {
        sessionStorage.setItem(PORTAL_SESSION_KEY, String(patientId));
        localStorage.setItem(PORTAL_SESSION_KEY, String(patientId));
      } catch (e) { /* ignore */ }
    },

    clearPortalSession: function () {
      try {
        sessionStorage.removeItem(PORTAL_SESSION_KEY);
        localStorage.removeItem(PORTAL_SESSION_KEY);
      } catch (e) { /* ignore */ }
    },

    // ---------- ALL SCHEDULES & PATIENT APPOINTMENTS ----------
    getAllSchedulesByDate: function () {
      var map = {};
      try {
        map = JSON.parse(localStorage.getItem(DATED_SCHEDULES_KEY) || '{}') || {};
      } catch (e) {
        map = {};
      }
      var todayKey = localDateKey(new Date());
      map[todayKey] = this.getSchedule();
      return map;
    },

    getPatientAppointments: function (patient) {
      if (!patient) return { upcoming: [], past: [] };
      var targetId = patient.id !== undefined && patient.id !== null ? String(patient.id) : null;
      var targetName = getPatientName(patient);
      var uniqueNameMatch = this.findPatientByName(getFullName(patient));
      var canMatchName = uniqueNameMatch &&
        (!targetId || String(uniqueNameMatch.id) === targetId);
      var todayKey = localDateKey(new Date());
      var map = this.getAllSchedulesByDate();
      var upcoming = [];
      var past = [];

      Object.keys(map).sort().forEach(function (dateKey) {
        var rows = Array.isArray(map[dateKey]) ? map[dateKey] : [];
        rows.forEach(function (row) {
          [1, 2].forEach(function (chairNum) {
            var slot = chairNum === 1 ? row.chair1 : row.chair2;
            if (!slot || slot.type === 'break') return;
            var matchesId = targetId && slot.patientId !== undefined && slot.patientId !== null && String(slot.patientId) === targetId;
            var matchesName = canMatchName && (slot.patientId === undefined || slot.patientId === null) &&
              normalizePatientName(slot.patientName) === targetName;
            if (!matchesId && !matchesName) return;

            var item = {
              date: dateKey,
              time: row.time,
              chair: chairNum,
              dentist: slot.dentist || (chairNum === 1 ? 'Dr. Mora' : 'Dr. Silva'),
              service: slot.service || 'Dental care',
              status: slot.status || 'confirmed',
              statusLabel: slot.statusLabel || 'Confirmed',
              note: slot.note || '',
              session: slot.session || null
            };
            if (slot.status === 'completed' || dateKey < todayKey) {
              past.push(item);
            } else {
              upcoming.push(item);
            }
          });
        });
      });

      past.reverse();
      return { upcoming: upcoming, past: past };
    },

    // ---------- INVOICES / BILLING ----------
    getInvoices: function () {
      try {
        var raw = localStorage.getItem(INVOICES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to load invoices from storage:', e);
        return [];
      }
    },

    saveInvoices: function (invoices) {
      try {
        localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
        return true;
      } catch (e) {
        return false;
      }
    },

    getCustomServices: function () {
      try {
        var services = JSON.parse(localStorage.getItem(CUSTOM_SERVICES_KEY) || '[]');
        return Array.isArray(services) ? services : [];
      } catch (e) {
        console.error('Failed to load custom services from storage:', e);
        return [];
      }
    },

    saveCustomServices: function (services) {
      try {
        localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(services));
        return true;
      } catch (e) {
        console.error('Failed to save custom services to storage:', e);
        return false;
      }
    },

    getStaffAccounts: function () {
      try {
        var accounts = JSON.parse(localStorage.getItem(STAFF_ACCOUNTS_KEY) || '[]');
        return Array.isArray(accounts) ? accounts : [];
      } catch (e) {
        console.error('Failed to load staff accounts from storage:', e);
        return [];
      }
    },

    saveStaffAccounts: function (accounts) {
      try {
        localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(accounts));
        return true;
      } catch (e) {
        console.error('Failed to save staff accounts to storage:', e);
        return false;
      }
    },

    addInvoice: function (data) {
      var invoices = this.getInvoices();
      var nextNum = invoices.length + 1;
      invoices.forEach(function (inv) {
        var match = String(inv.id || '').match(/(\d+)$/);
        if (match && Number(match[1]) >= nextNum) nextNum = Number(match[1]) + 1;
      });
      var today = localDateKey(new Date());
      var amount = Number(data.amount) || 0;
      var status = data.status || 'Due';
      var invoice = {
        id: data.id || ('INV-' + nextNum),
        patientId: data.patientId || null,
        patientName: String(data.patientName || '').trim() || 'Patient',
        service: String(data.service || '').trim() || 'Dental care',
        amount: amount,
        status: status,
        date: data.date || today,
        paidAt: status === 'Paid' ? (data.paidAt || today) : null,
        method: data.method || null,
        items: Array.isArray(data.items) && data.items.length
          ? data.items
          : [{ name: String(data.service || 'Dental care').trim(), amount: amount }]
      };
      invoices.unshift(invoice);
      this.saveInvoices(invoices);
      return invoice;
    },

    recordInvoicePayment: function (invoiceId, method) {
      var invoices = this.getInvoices();
      var today = localDateKey(new Date());
      var updated = null;
      for (var i = 0; i < invoices.length; i++) {
        if (invoices[i].id === invoiceId) {
          var inv = invoices[i];
          if (inv.status === 'Plan' && inv.planTotal) {
            inv.planPaid = Math.min(inv.planTotal, (inv.planPaid || 0) + 1);
            inv.method = method || inv.method || 'Card';
            inv.paidAt = today;
            if (inv.planPaid >= inv.planTotal) {
              inv.status = 'Paid';
            }
          } else {
            inv.status = 'Paid';
            inv.method = method || 'Card';
            inv.paidAt = today;
          }
          updated = inv;
          break;
        }
      }
      if (updated) this.saveInvoices(invoices);
      return updated;
    },

    setupPaymentPlan: function (invoiceId, totalInstallments) {
      var invoices = this.getInvoices();
      var count = Number(totalInstallments) || 3;
      var updated = null;
      for (var i = 0; i < invoices.length; i++) {
        if (invoices[i].id === invoiceId) {
          var inv = invoices[i];
          inv.status = 'Plan';
          inv.planTotal = count;
          inv.planPaid = inv.planPaid || 0;
          inv.installmentAmount = Math.round((Number(inv.amount) / count) * 100) / 100;
          updated = inv;
          break;
        }
      }
      if (updated) this.saveInvoices(invoices);
      return updated;
    },

    // ---------- RECALLS & NOTIFICATIONS ----------
    getRecallCandidates: function (referenceDate) {
      var today = referenceDate instanceof Date ? referenceDate : new Date();
      var todayKey = localDateKey(today);
      var monthEndKey = localDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      var recalls = { overdue: [], month: [], upcoming: [] };

      this.getPatients().forEach(function (patient) {
        var dueDate = String(patient.recallDueDate || '');
        if (!isValidDateKey(dueDate)) return;
        var dateParts = dueDate.split('-').map(Number);
        var due = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        var item = {
          id: patient.id,
          name: String(patient.firstName || '') + ' ' + String(patient.lastName || ''),
          email: String(patient.email || patient.portalEmail || ''),
          last: patient.lastVisit || 'Not recorded',
          dueDate: dueDate,
          due: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        if (dueDate < todayKey) recalls.overdue.push(item);
        else if (dueDate <= monthEndKey) recalls.month.push(item);
        else recalls.upcoming.push(item);
      });

      Object.keys(recalls).forEach(function (key) {
        recalls[key].sort(function (first, second) {
          return first.dueDate.localeCompare(second.dueDate) ||
            first.name.localeCompare(second.name);
        });
      });
      return recalls;
    },

    getRecallsSent: function () {
      try {
        return JSON.parse(localStorage.getItem(RECALLS_SENT_KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    },

    markRecallSent: function (patientKey, dueDate, channel, email) {
      if (patientKey === undefined || patientKey === null || !isValidDateKey(dueDate)) {
        throw new Error('A patient and valid recall date are required.');
      }
      var map = this.getRecallsSent();
      if (!map.scheduled) map.scheduled = {};
      if (!map.scheduled[patientKey]) map.scheduled[patientKey] = {};
      map.scheduled[patientKey][dueDate] = {
        channel: channel || 'Email',
        sentAt: new Date().toISOString(),
        email: normalizePatientEmail(email)
      };
      try {
        localStorage.setItem(RECALLS_SENT_KEY, JSON.stringify(map));
      } catch (e) {
        console.error('Failed to save recall reminder status:', e);
        throw new Error('The reminder status could not be saved.');
      }
      return map;
    },

    getNotifications: function () {
      try {
        return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    addNotification: function (item) {
      var list = this.getNotifications();
      list.unshift(Object.assign({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
        read: false
      }, item));
      if (list.length > 30) list = list.slice(0, 30);
      try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
      } catch (e) { /* ignore */ }
      return list;
    },

    clearNotifications: function () {
      try {
        localStorage.setItem(NOTIFICATIONS_KEY, '[]');
      } catch (e) { /* ignore */ }
    }
  };

  global.DentalStorage = DentalStorage;
})(typeof window !== 'undefined' ? window : this);
