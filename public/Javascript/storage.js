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

  function isValidDateKey(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(date));
  }

  function sortSchedule(schedule) {
    function minutes(time) {
      var match = String(time).match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
      if (!match) return Infinity;
      var hour = Number(match[1]) % 12;
      if (match[3].toLowerCase() === 'pm') hour += 12;
      return hour * 60 + Number(match[2]);
    }

    return schedule.sort(function (a, b) {
      return minutes(a.time) - minutes(b.time);
    });
  }

  function normalizePatientName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function getPatientName(patient) {
    return normalizePatientName((patient.firstName || '') + ' ' + (patient.lastName || ''));
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

      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        if (getPatientName(patients[i]) === target) return patients[i];
      }
      return null;
    },

    isValidPhoneNumber: isValidPhoneNumber,
    isValidEmailAddress: isValidEmailAddress,

    hasPatientAtTime: function (schedule, patientName, time) {
      var targetName = normalizePatientName(patientName);
      var targetTime = String(time || '').trim().toLowerCase();
      if (!targetName || !targetTime) return false;

      return schedule.some(function (row) {
        if (String(row.time || '').trim().toLowerCase() !== targetTime) return false;
        return [row.chair1, row.chair2].some(function (slot) {
          return slot && normalizePatientName(slot.patientName) === targetName;
        });
      });
    },

    addPatient: function (patientData) {
      var patients = this.getPatients();
      var firstName = String(patientData.firstName || '').trim().replace(/\s+/g, ' ');
      var lastName = String(patientData.lastName || '').trim().replace(/\s+/g, ' ');
      if (!firstName || !lastName) throw new Error('First and last names are required.');
      if (this.findPatientByName(firstName + ' ' + lastName)) {
        throw new Error('A patient with this name already exists.');
      }

      var id = patientData.id || Date.now();
      var newPatient = Object.assign({}, patientData, {
        id: id,
        firstName: firstName,
        lastName: lastName
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
          Object.assign(patients[i], updates);
          found = patients[i];
          break;
        }
      }
      if (found) {
        this.savePatients(patients);
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
    getDefaultSchedule: function () {
      return [
        {
          time: '11:00 am',
          chair1: null,
          chair2: { type: 'break', label: 'Lunch break' }
        },
        {
          time: '12:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '1:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '2:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '3:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '4:00 pm',
          chair1: null,
          chair2: null
        }
      ];
    },

    getSchedule: function () {
      var SCHEDULE_KEY = 'dental_schedule';
      try {
        var raw = localStorage.getItem(SCHEDULE_KEY);
        if (raw) return JSON.parse(raw);
        var def = this.getDefaultSchedule();
        this.saveSchedule(def);
        return def;
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
        return schedules[date] || this.getDefaultSchedule();
      } catch (e) {
        console.error('Failed to load dated schedule from storage:', e);
        return this.getDefaultSchedule();
      }
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
      if (date === localDateKey(new Date())) return this.setSlot(time, chairNum, slotData);

      var schedule = this.getScheduleForDate(date);
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;
      var found = false;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          if (isChair1) {
            schedule[i].chair1 = slotData;
          } else {
            schedule[i].chair2 = slotData;
          }
          found = true;
          break;
        }
      }

      if (!found && time) {
        schedule.push({
          time: time,
          chair1: isChair1 ? slotData : null,
          chair2: isChair1 ? null : slotData
        });
      }

      sortSchedule(schedule);
      this.saveScheduleForDate(date, schedule);
      return schedule;
    },

    checkInSlotForDate: function (date, time, chairNum) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.checkInSlot(time, chairNum);

      var schedule = this.getScheduleForDate(date);
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          var target = isChair1 ? schedule[i].chair1 : schedule[i].chair2;
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
      var schedule = this.getSchedule();
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;
      var found = false;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          if (isChair1) {
            schedule[i].chair1 = slotData;
          } else {
            schedule[i].chair2 = slotData;
          }
          found = true;
          break;
        }
      }

      if (!found && time) {
        var newRow = {
          time: time,
          chair1: isChair1 ? slotData : null,
          chair2: isChair1 ? null : slotData
        };
        schedule.push(newRow);
      }

      sortSchedule(schedule);
      this.saveSchedule(schedule);
      return schedule;
    },

    clearSlot: function (time, chairNum) {
      return this.setSlot(time, chairNum, null);
    },

    rescheduleSlot: function (fromDate, fromTime, fromChair, toDate, toTime, toChair) {
      if (!isValidDateKey(fromDate) || !isValidDateKey(toDate)) {
        throw new Error('A valid YYYY-MM-DD date is required.');
      }
      var fromChairNum = (fromChair === 1 || fromChair === '1' || String(fromChair).indexOf('1') >= 0) ? 1 : 2;
      var toChairNum = (toChair === 1 || toChair === '1' || String(toChair).indexOf('1') >= 0) ? 1 : 2;
      var sameSpot = fromDate === toDate &&
        String(fromTime).toLowerCase().trim() === String(toTime).toLowerCase().trim() &&
        fromChairNum === toChairNum;
      if (sameSpot) {
        throw new Error('Choose a different date, time, or chair.');
      }

      var fromSchedule = this.getScheduleForDate(fromDate);
      var sourceSlot = null;
      for (var i = 0; i < fromSchedule.length; i++) {
        if (String(fromSchedule[i].time).toLowerCase().trim() === String(fromTime).toLowerCase().trim()) {
          sourceSlot = fromChairNum === 1 ? fromSchedule[i].chair1 : fromSchedule[i].chair2;
          break;
        }
      }
      if (!sourceSlot || sourceSlot.type === 'break') {
        throw new Error('The original appointment could not be found.');
      }

      var toSchedule = fromDate === toDate ? fromSchedule : this.getScheduleForDate(toDate);
      for (var j = 0; j < toSchedule.length; j++) {
        if (String(toSchedule[j].time).toLowerCase().trim() === String(toTime).toLowerCase().trim()) {
          var existingTarget = toChairNum === 1 ? toSchedule[j].chair1 : toSchedule[j].chair2;
          if (existingTarget) {
            throw new Error(existingTarget.type === 'break'
              ? 'That slot is a clinic break. Please choose another time.'
              : 'That chair and time are already booked.');
          }
        }
      }

      if (this.hasPatientAtTime(toSchedule, sourceSlot.patientName, toTime)) {
        var sameTimeSameDate = fromDate === toDate &&
          String(fromTime).toLowerCase().trim() === String(toTime).toLowerCase().trim();
        if (!sameTimeSameDate) {
          throw new Error('This patient already has an appointment at that time.');
        }
      }

      var dentist = toChairNum === 1 ? 'Dr. Mora' : 'Dr. Silva';
      var movedSlot = Object.assign({}, sourceSlot, {
        dentist: dentist,
        rescheduledAt: new Date().toISOString()
      });
      if (movedSlot.status === 'seated' || movedSlot.status === 'checked-in') {
        movedSlot.status = 'confirmed';
        movedSlot.statusLabel = 'Confirmed';
      }

      this.setSlotForDate(fromDate, fromTime, fromChairNum, null);
      this.setSlotForDate(toDate, toTime, toChairNum, movedSlot);

      var todayKey = localDateKey(new Date());
      var isToday = toDate === todayKey;
      var patient = movedSlot.patientId
        ? this.getPatientById(movedSlot.patientId)
        : this.findPatientByName(movedSlot.patientName);
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
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          var target = isChair1 ? schedule[i].chair1 : schedule[i].chair2;
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

    syncPatientCheckIn: function (patientName) {
      if (!patientName) return;
      var schedule = this.getSchedule();
      var lowerName = patientName.toLowerCase().trim();
      var changed = false;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].chair1 && schedule[i].chair1.patientName && schedule[i].chair1.patientName.toLowerCase().trim() === lowerName) {
          schedule[i].chair1.status = 'checked-in';
          schedule[i].chair1.statusLabel = 'Checked in';
          changed = true;
        }
        if (schedule[i].chair2 && schedule[i].chair2.patientName && schedule[i].chair2.patientName.toLowerCase().trim() === lowerName) {
          schedule[i].chair2.status = 'checked-in';
          schedule[i].chair2.statusLabel = 'Checked in';
          changed = true;
        }
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
      localStorage.removeItem(RECALLS_SENT_KEY);
      localStorage.removeItem(NOTIFICATIONS_KEY);
      sessionStorage.removeItem(PORTAL_SESSION_KEY);
      localStorage.removeItem(PORTAL_SESSION_KEY);
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
      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        var pDigits = this.normalizePhoneDigits(patients[i].phone);
        if (!pDigits) continue;
        if (pDigits === target || pDigits.slice(-10) === target.slice(-10)) {
          return patients[i];
        }
      }
      return null;
    },

    findPatientByEmail: function (email) {
      var target = String(email || '').trim().toLowerCase();
      if (!target) return null;
      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        var pEmail = String(patients[i].portalEmail || patients[i].email || '').trim().toLowerCase();
        if (pEmail && pEmail === target) return patients[i];
      }
      return null;
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
            var matchesName = targetName && normalizePatientName(slot.patientName) === targetName;
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
    getDefaultInvoices: function () {
      var today = localDateKey(new Date());
      return [
        {
          id: 'INV-1041',
          patientName: 'Bea Santos',
          service: 'Extraction',
          amount: 1850,
          status: 'Overdue',
          date: today,
          paidAt: null,
          method: null,
          items: [{ name: 'Extraction', amount: 1850 }]
        },
        {
          id: 'INV-1042',
          patientName: 'Jon Dela Cruz',
          service: 'Whitening',
          amount: 4500,
          status: 'Paid',
          date: today,
          paidAt: today,
          method: 'Card',
          items: [{ name: 'Whitening', amount: 4500 }]
        },
        {
          id: 'INV-1043',
          patientName: 'Luis Garcia',
          service: 'Filling',
          amount: 2200,
          status: 'Due',
          date: today,
          paidAt: null,
          method: null,
          items: [
            { name: 'Filling', amount: 2000 },
            { name: 'Local anaesthetic', amount: 200 }
          ]
        },
        {
          id: 'INV-1044',
          patientName: 'Maria Reyes',
          service: 'Check-up',
          amount: 800,
          status: 'Paid',
          date: today,
          paidAt: today,
          method: 'Card',
          items: [{ name: 'Check-up', amount: 800 }]
        },
        {
          id: 'INV-1045',
          patientName: 'Ana Villar',
          service: 'Crown',
          amount: 12000,
          status: 'Plan',
          date: today,
          paidAt: null,
          method: 'Card',
          planTotal: 6,
          planPaid: 3,
          installmentAmount: 2000,
          items: [{ name: 'Crown', amount: 12000 }]
        },
        {
          id: 'INV-1046',
          patientName: 'Aya Tan',
          service: 'Cleaning',
          amount: 1200,
          status: 'Paid',
          date: today,
          paidAt: today,
          method: 'Cash',
          items: [{ name: 'Cleaning', amount: 1200 }]
        }
      ];
    },

    getInvoices: function () {
      try {
        var raw = localStorage.getItem(INVOICES_KEY);
        if (raw) return JSON.parse(raw);
        var defaults = this.getDefaultInvoices();
        this.saveInvoices(defaults);
        return defaults;
      } catch (e) {
        return this.getDefaultInvoices();
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

    addInvoice: function (data) {
      var invoices = this.getInvoices();
      var nextNum = 1041 + invoices.length;
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
    getRecallsSent: function () {
      try {
        return JSON.parse(localStorage.getItem(RECALLS_SENT_KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    },

    markRecallSent: function (listKey, patientKey, channel) {
      var map = this.getRecallsSent();
      if (!map[listKey]) map[listKey] = {};
      map[listKey][patientKey] = {
        channel: channel || 'SMS',
        sentAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(RECALLS_SENT_KEY, JSON.stringify(map));
      } catch (e) { /* ignore */ }
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
