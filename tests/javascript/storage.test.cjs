const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const storageSource = fs.readFileSync(
  path.resolve(__dirname, '../../public/Javascript/storage.js'),
  'utf8'
);

function createStorage() {
  const values = new Map();
  const localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
  const context = {
    window: {},
    localStorage,
    sessionStorage: localStorage,
    console,
    Date
  };
  vm.runInNewContext(storageSource, context, { filename: 'storage.js' });
  return context.window.DentalStorage;
}

function dateKey(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

test('allows namesakes but enforces unique case-insensitive email addresses', () => {
  const storage = createStorage();
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.addPatient({ id: 'patient-2', firstName: 'Alex', lastName: 'Kim', email: 'other@gmail.com' });

  assert.equal(storage.getPatients().length, 2);
  assert.equal(storage.findPatientByName('Alex Kim'), null);
  assert.equal(storage.findPatientByEmail('ALEX@GMAIL.COM').id, 'patient-1');
  assert.throws(
    () => storage.addPatient({ firstName: 'A. ', lastName: 'Kim', email: 'Alex@Gmail.com' }),
    /already used/
  );
  assert.throws(
    () => storage.updatePatient('patient-2', { email: 'Alex@Gmail.com' }),
    /already used/
  );
});

test('identifies patients by email or matching name and phone, not name alone', () => {
  const storage = createStorage();
  const first = storage.addPatient({
    id: 'patient-1',
    firstName: 'Alex',
    lastName: 'Kim',
    email: 'alex@gmail.com',
    phone: '+63 912 345 6789'
  });
  storage.addPatient({
    id: 'patient-2',
    firstName: 'Alex',
    lastName: 'Kim',
    email: 'other@gmail.com',
    phone: '09123456780'
  });

  assert.equal(storage.findPatientByContact({ email: 'ALEX@gmail.com' }).id, first.id);
  assert.equal(storage.findPatientByContact({
    name: ' alex   kim ',
    phone: '0912 345 6789'
  }).id, first.id);
  assert.equal(storage.findPatientByContact({ name: 'Alex Kim' }), null);
});

test('prevents a patient from occupying two chairs at the same time and protects occupied slots', () => {
  const storage = createStorage();
  const date = dateKey(addDays(new Date(), 1));
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.addPatient({ id: 'patient-2', firstName: 'Alex', lastName: 'Kim', email: 'other@gmail.com' });
  storage.setSlotForDate(date, '9:00 am', 1, {
    patientId: 'patient-1',
    patientName: 'Alex Kim',
    patientEmail: 'alex@gmail.com'
  });

  assert.throws(
    () => storage.setSlotForDate(date, '9:00 am', 1, {
      patientId: 'patient-2',
      patientName: 'Alex Kim',
      patientEmail: 'other@gmail.com'
    }),
    /already booked/
  );
  storage.setSlotForDate(date, '9:00 am', 2, {
    patientId: 'patient-2',
    patientName: 'Alex Kim',
    patientEmail: 'other@gmail.com'
  });
  storage.setSlotForDate(date, '10:00 am', 1, {
    patientId: 'patient-1',
    patientName: 'Alex Kim',
    patientEmail: 'alex@gmail.com'
  });
  assert.throws(
    () => storage.setSlotForDate(date, '10:00 am', 2, {
      patientId: 'patient-1',
      patientName: 'Alex Kim',
      patientEmail: 'alex@gmail.com'
    }),
    /already has an appointment/
  );

  storage.setSlotForDate(date, '9:00 am', 1, {
    patientId: 'patient-1',
    patientName: 'Alex Kim',
    status: 'checked-in'
  });
  assert.equal(
    storage.getScheduleForDate(date).find((row) => row.time === '9:00 am').chair1.status,
    'checked-in'
  );
});

test('legacy name-only matching is safe for namesakes and occupied slots compare contact details', () => {
  const storage = createStorage();
  const date = dateKey(addDays(new Date(), 1));
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.addPatient({ id: 'patient-2', firstName: 'Alex', lastName: 'Kim', email: 'other@gmail.com' });
  storage.addPatient({ id: 'patient-3', firstName: 'Sam', lastName: 'Lee', email: 'sam@gmail.com' });
  storage.setSlotForDate(date, '11:00 am', 1, { patientName: 'Alex Kim' });
  storage.setSlotForDate(date, '12:00 pm', 1, { patientName: 'Sam Lee' });

  const schedule = storage.getScheduleForDate(date);
  assert.equal(storage.hasPatientAtTime(schedule, 'Alex Kim', '11:00 am'), false);
  assert.equal(storage.hasPatientAtTime(schedule, 'Sam Lee', '12:00 pm'), true);

  storage.setSlotForDate(date, '1:00 pm', 1, {
    patientName: 'Alex Kim',
    patientEmail: 'alex@gmail.com'
  });
  assert.throws(
    () => storage.setSlotForDate(date, '1:00 pm', 1, {
      patientName: 'Alex Kim',
      patientEmail: 'other@gmail.com'
    }),
    /already booked/
  );
});

test('follow-up booking skips a date when the patient already has another chair at that time', () => {
  const storage = createStorage();
  const today = dateKey(new Date());
  const requestedDate = dateKey(addDays(new Date(), 1));
  const nextDate = dateKey(addDays(new Date(), 2));
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.setSlotForDate(requestedDate, '9:00 am', 2, {
    patientId: 'patient-1',
    patientName: 'Alex Kim'
  });

  const result = storage.bookFollowUpSession({
    date: today,
    time: '9:00 am',
    chair: 1,
    slot: {
      patientId: 'patient-1',
      patientName: 'Alex Kim',
      service: 'Braces',
      treatmentPlan: { totalSessions: 2, sessionNumber: 1 }
    }
  }, 1, 'days');

  assert.equal(result.requestedDate, requestedDate);
  assert.equal(result.date, nextDate);
});

test('reschedule availability hides times when the patient already has another chair booked', () => {
  const storage = createStorage();
  const today = dateKey(new Date());
  const targetDate = dateKey(addDays(new Date(), 1));
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.setSlotForDate(today, '9:00 am', 1, {
    patientId: 'patient-1',
    patientName: 'Alex Kim'
  });
  storage.setSlotForDate(targetDate, '10:00 am', 2, {
    patientId: 'patient-1',
    patientName: 'Alex Kim'
  });

  const available = storage.getAvailableAppointmentTimes(
    targetDate,
    1,
    { date: today, time: '9:00 am', chair: 1 },
    ['10:00 am', '12:00 pm']
  );
  assert.equal(Array.from(available).join(','), '12:00 pm');
});

test('reschedule rolls back the destination when saving the source fails', () => {
  const storage = createStorage();
  const today = dateKey(new Date());
  const tomorrow = dateKey(addDays(new Date(), 1));
  storage.addPatient({ id: 'patient-1', firstName: 'Alex', lastName: 'Kim', email: 'alex@gmail.com' });
  storage.setSlotForDate(today, '9:00 am', 1, {
    patientId: 'patient-1',
    patientName: 'Alex Kim'
  });

  const saveScheduleForDate = storage.saveScheduleForDate.bind(storage);
  storage.saveScheduleForDate = function (date, schedule) {
    if (date === today) return false;
    return saveScheduleForDate(date, schedule);
  };

  assert.throws(
    () => storage.rescheduleSlot(today, '9:00 am', 1, tomorrow, '10:00 am', 1),
    /rolled back/
  );
  assert.ok(storage.getScheduleForDate(today).find((row) => row.time === '9:00 am').chair1);
  const rolledBackTarget = storage.getScheduleForDate(tomorrow).find((row) => row.time === '10:00 am');
  assert.ok(!rolledBackTarget || !rolledBackTarget.chair1);
});

test('recall candidates are grouped by manually scheduled due date and reminder logs are date-specific', () => {
  const storage = createStorage();
  storage.addPatient({ id: 'overdue', firstName: 'A', lastName: 'One', recallDueDate: '2026-11-25' });
  storage.addPatient({ id: 'month', firstName: 'B', lastName: 'Two', recallDueDate: '2026-11-30' });
  storage.addPatient({ id: 'upcoming', firstName: 'C', lastName: 'Three', recallDueDate: '2026-12-01' });
  storage.addPatient({ id: 'invalid', firstName: 'D', lastName: 'Four', recallDueDate: '2026-02-31' });

  const candidates = storage.getRecallCandidates(new Date(2026, 10, 26));
  assert.equal(Array.from(candidates.overdue, (patient) => patient.id).join(','), 'overdue');
  assert.equal(Array.from(candidates.month, (patient) => patient.id).join(','), 'month');
  assert.equal(Array.from(candidates.upcoming, (patient) => patient.id).join(','), 'upcoming');

  const logged = storage.markRecallSent('month', '2026-11-30', 'Email', 'TEST@GMAIL.COM');
  assert.equal(logged.scheduled.month['2026-11-30'].email, 'test@gmail.com');
});
