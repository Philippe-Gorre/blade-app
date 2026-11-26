(function () {
  'use strict';

  var page = document.querySelector('[data-workspace-page]');
  if (!page) return;

  var storage = window.DentalStorage;
  var toast = document.getElementById('workspace-toast');
  var toastTimer = null;
  var locale = 'en-US';

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 4000);
  }

  function formatAmount(amount) {
    return Number(amount || 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function downloadFile(filename, content, mimeType) {
    var file = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(file);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  document.querySelectorAll('[data-demo-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      showToast(button.getAttribute('data-demo-action'));
    });
  });

  // ==================== BILLING ====================
  if (page.getAttribute('data-workspace-page') === 'billing') {
    var invoiceListEl = document.getElementById('invoice-list');
    var itemList = document.getElementById('invoice-items');
    var invoiceDialog = document.getElementById('invoice-dialog');
    var invoiceForm = document.getElementById('invoice-form');
    var takePaymentBtn = document.getElementById('take-payment');
    var setupPlanBtn = document.getElementById('setup-plan-btn');
    var selectedInvoiceId = null;
    var paymentMethod = 'Card';

    function getInvoices() {
      return storage && typeof storage.getInvoices === 'function' ? storage.getInvoices() : [];
    }

    function updateSummary(invoices) {
      var today = localDateKey(new Date());
      var collected = 0;
      var outstanding = 0;
      var overdueCount = 0;
      var planCount = 0;

      invoices.forEach(function (inv) {
        var amount = Number(inv.amount || 0);
        if (inv.status === 'Paid') {
          if (!inv.paidAt || inv.paidAt === today) collected += amount;
        } else if (inv.status === 'Plan') {
          planCount += 1;
          var remaining = Math.max(0, (inv.planTotal || 1) - (inv.planPaid || 0));
          outstanding += remaining * Number(inv.installmentAmount || amount);
        } else {
          outstanding += amount;
          if (inv.status === 'Overdue') overdueCount += 1;
        }
      });

      var collectedEl = document.getElementById('billing-collected');
      var outstandingEl = document.getElementById('billing-outstanding');
      var overdueEl = document.getElementById('billing-overdue');
      var plansEl = document.getElementById('billing-plans');
      if (collectedEl) collectedEl.textContent = formatAmount(collected);
      if (outstandingEl) outstandingEl.textContent = formatAmount(outstanding);
      if (overdueEl) overdueEl.textContent = String(overdueCount);
      if (plansEl) plansEl.textContent = String(planCount);
    }

    function renderSelectedDetail(inv) {
      if (!inv) return;
      selectedInvoiceId = inv.id;
      document.getElementById('detail-patient').textContent = inv.patientName;
      document.getElementById('detail-invoice').textContent = inv.id;
      document.getElementById('detail-total').textContent = formatAmount(inv.amount);

      var statusEl = document.getElementById('detail-status');
      statusEl.textContent = inv.status;
      statusEl.className = 'invoice-status invoice-status--' +
        String(inv.status || 'due').toLowerCase().replace(/\s+/g, '-');

      itemList.textContent = '';
      var items = Array.isArray(inv.items) && inv.items.length
        ? inv.items
        : [{ name: inv.service, amount: inv.amount }];
      items.forEach(function (it) {
        var line = document.createElement('div');
        var description = document.createElement('span');
        var price = document.createElement('strong');
        description.textContent = it.name;
        price.textContent = formatAmount(it.amount);
        line.appendChild(description);
        line.appendChild(price);
        itemList.appendChild(line);
      });

      if (inv.status === 'Plan' && inv.planTotal) {
        var planNote = document.createElement('div');
        var planLabel = document.createElement('span');
        var planProg = document.createElement('strong');
        planLabel.textContent = 'Payment plan progress';
        planProg.textContent = (inv.planPaid || 0) + ' of ' + inv.planTotal + ' paid';
        planNote.appendChild(planLabel);
        planNote.appendChild(planProg);
        itemList.appendChild(planNote);
      }

      if (inv.status === 'Paid') {
        takePaymentBtn.disabled = true;
        takePaymentBtn.textContent = 'Paid by ' + (inv.method || 'card').toLowerCase();
        if (setupPlanBtn) setupPlanBtn.disabled = true;
      } else if (inv.status === 'Plan' && inv.installmentAmount) {
        takePaymentBtn.disabled = false;
        takePaymentBtn.textContent = 'Take installment of ' + formatAmount(inv.installmentAmount) + ' by ' + paymentMethod.toLowerCase();
        if (setupPlanBtn) setupPlanBtn.disabled = true;
      } else {
        takePaymentBtn.disabled = false;
        takePaymentBtn.textContent = 'Take payment of ' + formatAmount(inv.amount) + ' by ' + paymentMethod.toLowerCase();
        if (setupPlanBtn) setupPlanBtn.disabled = false;
      }
    }

    function renderInvoices() {
      var invoices = getInvoices();
      updateSummary(invoices);
      invoiceListEl.textContent = '';

      var selected = null;
      invoices.forEach(function (inv) {
        if (!selectedInvoiceId && inv.id === 'INV-1043') selected = inv;
        if (selectedInvoiceId && inv.id === selectedInvoiceId) selected = inv;
      });
      if (!selected && invoices.length) selected = invoices[0];

      invoices.forEach(function (inv) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'invoice-row' + (selected && inv.id === selected.id ? ' is-selected' : '');

        var num = document.createElement('span');
        num.className = 'invoice-number';
        num.textContent = inv.id;

        var patient = document.createElement('span');
        patient.className = 'invoice-patient';
        var pName = document.createElement('strong');
        pName.textContent = inv.patientName;
        var pServ = document.createElement('small');
        pServ.textContent = inv.service;
        patient.appendChild(pName);
        patient.appendChild(pServ);

        var amount = document.createElement('strong');
        amount.className = 'invoice-amount';
        amount.textContent = formatAmount(inv.amount);

        var status = document.createElement('span');
        status.className = 'invoice-status invoice-status--' + String(inv.status || 'due').toLowerCase().replace(/\s+/g, '-');
        status.textContent = inv.status;

        btn.appendChild(num);
        btn.appendChild(patient);
        btn.appendChild(amount);
        btn.appendChild(status);
        btn.addEventListener('click', function () {
          selectedInvoiceId = inv.id;
          renderInvoices();
        });
        invoiceListEl.appendChild(btn);
      });

      if (selected) renderSelectedDetail(selected);
    }

    document.querySelectorAll('[data-billing-method]').forEach(function (button) {
      button.addEventListener('click', function () {
        paymentMethod = button.getAttribute('data-billing-method');
        document.querySelectorAll('[data-billing-method]').forEach(function (method) {
          var selected = method === button;
          method.classList.toggle('is-active', selected);
          method.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        renderInvoices();
      });
    });

    takePaymentBtn.addEventListener('click', function () {
      if (!selectedInvoiceId || !storage) return;
      var updated = storage.recordInvoicePayment(selectedInvoiceId, paymentMethod);
      if (updated) {
        renderInvoices();
        showToast('Payment recorded for ' + updated.id + ' via ' + paymentMethod + '.');
      }
    });

    if (setupPlanBtn) {
      setupPlanBtn.addEventListener('click', function () {
        if (!selectedInvoiceId || !storage) return;
        var updated = storage.setupPaymentPlan(selectedInvoiceId, 3);
        if (updated) {
          renderInvoices();
          showToast('3-installment payment plan set up for ' + updated.id + '.');
        }
      });
    }

    document.getElementById('new-invoice').addEventListener('click', function () {
      invoiceForm.reset();
      var datalist = document.getElementById('invoice-patients-list');
      if (datalist && storage) {
        datalist.textContent = '';
        storage.getPatients().forEach(function (p) {
          var opt = document.createElement('option');
          opt.value = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
          datalist.appendChild(opt);
        });
      }
      invoiceDialog.showModal();
    });

    document.querySelectorAll('[data-close-dialog]').forEach(function (button) {
      button.addEventListener('click', function () {
        button.closest('dialog').close();
      });
    });

    invoiceDialog.addEventListener('click', function (event) {
      if (event.target === invoiceDialog) invoiceDialog.close();
    });

    invoiceForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!invoiceForm.reportValidity() || !storage) return;
      var patientName = document.getElementById('invoice-patient').value.trim();
      var service = document.getElementById('invoice-service').value.trim();
      var amount = Number(document.getElementById('invoice-amount').value);
      var matchedPatient = storage.findPatientByName(patientName);
      var created = storage.addInvoice({
        patientId: matchedPatient ? matchedPatient.id : null,
        patientName: patientName,
        service: service,
        amount: amount,
        status: 'Due'
      });
      selectedInvoiceId = created.id;
      invoiceDialog.close();
      renderInvoices();
      showToast('Invoice ' + created.id + ' created for ' + created.patientName + '.');
    });

    document.getElementById('print-invoice').addEventListener('click', function () {
      window.print();
    });

    renderInvoices();
  }

  // ==================== RECALLS ====================
  if (page.getAttribute('data-workspace-page') === 'recalls') {
    var baseRecalls = {
      overdue: [
        { id: 'kiko', name: 'Kiko Ramos', visit: '6-month check-up', last: '21 Apr', due: '1 month late' },
        { id: 'rosa', name: 'Rosa Aquino', visit: 'Scale and polish', last: '2 Mar', due: '3 months late' },
        { id: 'dan', name: 'Dan Flores', visit: 'Scale and polish', last: '14 Feb', due: '4 months late' }
      ],
      month: [
        { id: 'bea', name: 'Bea Santos', visit: 'Check-up', last: '26 May', due: 'Due this month' },
        { id: 'jon', name: 'Jon Dela Cruz', visit: 'Cleaning', last: '27 May', due: 'Due this month' },
        { id: 'aya', name: 'Aya Tan', visit: 'Check-up', last: '28 May', due: 'Due this month' }
      ],
      upcoming: [
        { id: 'luis', name: 'Luis Garcia', visit: '6-month check-up', last: '9 Jun', due: 'Due in 2 weeks' },
        { id: 'maria', name: 'Maria Reyes', visit: 'Check-up', last: '16 Jun', due: 'Due in 3 weeks' },
        { id: 'ana', name: 'Ana Villar', visit: 'Cleaning', last: '25 Jun', due: 'Due next month' }
      ]
    };

    function buildRecalls() {
      var data = {
        overdue: baseRecalls.overdue.slice(),
        month: baseRecalls.month.slice(),
        upcoming: baseRecalls.upcoming.slice()
      };
      if (storage) {
        var existingNames = {};
        ['overdue', 'month', 'upcoming'].forEach(function (k) {
          data[k].forEach(function (item) {
            existingNames[item.name.toLowerCase()] = true;
          });
        });
        storage.getPatients().forEach(function (p) {
          var name = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
          if (!name || existingNames[name.toLowerCase()]) return;
          existingNames[name.toLowerCase()] = true;
          data.upcoming.push({
            id: 'pt-' + p.id,
            name: name,
            visit: p.service || '6-month check-up',
            last: p.lastVisit || 'Recent',
            due: 'Due in 6 months'
          });
        });
      }
      return data;
    }

    var recalls = buildRecalls();
    var sentByList = storage && typeof storage.getRecallsSent === 'function'
      ? storage.getRecallsSent()
      : { overdue: {}, month: {}, upcoming: {} };
    var activeList = 'overdue';
    var activeChannel = 'SMS';
    var recallList = document.getElementById('recall-list');
    var template = document.getElementById('recall-template');

    function updateFilterCounts() {
      document.querySelectorAll('[data-recall-filter]').forEach(function (btn) {
        var key = btn.getAttribute('data-recall-filter');
        var label = key === 'overdue' ? 'Overdue' : key === 'month' ? 'Due this month' : 'Upcoming';
        btn.textContent = label + ' (' + (recalls[key] ? recalls[key].length : 0) + ')';
      });
    }

    function updateRecallProgress() {
      var listSent = sentByList[activeList] || {};
      var sentCount = Object.keys(listSent).length;
      var total = recalls[activeList].length;
      document.getElementById('reminder-count').textContent = String(sentCount);
      document.getElementById('reminder-total').textContent = String(total);
      var progress = document.getElementById('reminder-progress');
      progress.max = Math.max(1, total);
      progress.value = sentCount;
    }

    function sendReminder(patient) {
      if (storage && typeof storage.markRecallSent === 'function') {
        sentByList = storage.markRecallSent(activeList, patient.id, activeChannel);
      } else {
        if (!sentByList[activeList]) sentByList[activeList] = {};
        sentByList[activeList][patient.id] = true;
      }
      renderRecalls();
      showToast(activeChannel + ' recall reminder logged for ' + patient.name + '.');
    }

    function renderRecalls() {
      updateFilterCounts();
      recallList.textContent = '';
      var listSent = sentByList[activeList] || {};
      recalls[activeList].forEach(function (patient) {
        var row = document.createElement('div');
        row.className = 'recall-row';
        var person = document.createElement('span');
        person.className = 'recall-person';
        var name = document.createElement('strong');
        var visit = document.createElement('small');
        name.textContent = patient.name;
        visit.textContent = patient.visit;
        person.appendChild(name);
        person.appendChild(visit);

        var lastVisit = document.createElement('span');
        lastVisit.textContent = patient.last;
        var due = document.createElement('span');
        due.className = 'recall-due';
        due.textContent = patient.due;

        var actions = document.createElement('span');
        actions.style.display = 'inline-flex';
        actions.style.gap = '6px';
        actions.style.alignItems = 'center';

        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'workspace-button workspace-button--outline recall-send';
        send.textContent = listSent[patient.id] ? 'Sent' : 'Send ' + activeChannel;
        send.disabled = Boolean(listSent[patient.id]);
        send.addEventListener('click', function () {
          sendReminder(patient);
        });

        var bookLink = document.createElement('a');
        bookLink.className = 'workspace-button workspace-button--outline';
        bookLink.href = '/appointments?patient=' + encodeURIComponent(patient.name);
        bookLink.textContent = 'Book';
        bookLink.style.textDecoration = 'none';

        actions.appendChild(send);
        actions.appendChild(bookLink);

        row.appendChild(person);
        row.appendChild(lastVisit);
        row.appendChild(due);
        row.appendChild(actions);
        recallList.appendChild(row);
      });
      updateRecallProgress();
    }

    document.querySelectorAll('[data-recall-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeList = button.getAttribute('data-recall-filter');
        document.querySelectorAll('[data-recall-filter]').forEach(function (filter) {
          var selected = filter === button;
          filter.classList.toggle('is-active', selected);
          filter.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        renderRecalls();
      });
    });

    document.querySelectorAll('[data-message-channel]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeChannel = button.getAttribute('data-message-channel');
        document.querySelectorAll('[data-message-channel]').forEach(function (channel) {
          var selected = channel === button;
          channel.classList.toggle('is-active', selected);
          channel.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        template.value = activeChannel === 'SMS'
          ? 'Hi [PATIENT], it is time for your [VISIT] at Dentistry With a Smile. Pick a time that suits you: [BOOKING LINK]. Reply here if you need help.'
          : 'Subject: Time for your next dental visit\n\nHi [PATIENT],\n\nIt is time for your [VISIT] at Dentistry With a Smile. Choose a time that suits you: [BOOKING LINK].\n\nReply to this email if you need help.';
        renderRecalls();
      });
    });

    document.getElementById('send-all-reminders').addEventListener('click', function () {
      recalls[activeList].forEach(function (patient) {
        if (storage && typeof storage.markRecallSent === 'function') {
          sentByList = storage.markRecallSent(activeList, patient.id, activeChannel);
        } else {
          if (!sentByList[activeList]) sentByList[activeList] = {};
          sentByList[activeList][patient.id] = true;
        }
      });
      renderRecalls();
      showToast('Logged ' + activeChannel + ' reminders for all patients in this list.');
    });

    renderRecalls();
  }

  // ==================== REPORTS ====================
  if (page.getAttribute('data-workspace-page') === 'reports') {
    var currentPeriod = 'week';

    function computeLiveReport(period) {
      var daysBack = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      var cutoffKey = localDateKey(cutoff);

      var schedules = storage ? storage.getAllSchedulesByDate() : {};
      var patients = storage ? storage.getPatients() : [];

      var totalAppts = 0;
      var completedOrChecked = 0;
      var totalSlots = 0;
      var dayBuckets = [0, 0, 0, 0, 0, 0]; // Mon..Sat
      var treatmentCounts = {
        checkup: 0,
        filling: 0,
        whitening: 0,
        aligner: 0,
        crown: 0,
        other: 0
      };

      Object.keys(schedules).forEach(function (dateKey) {
        if (dateKey < cutoffKey) return;
        var parts = dateKey.split('-');
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        var dow = d.getDay(); // 0=Sun, 1=Mon..6=Sat
        var rows = Array.isArray(schedules[dateKey]) ? schedules[dateKey] : [];
        rows.forEach(function (row) {
          [row.chair1, row.chair2].forEach(function (slot) {
            totalSlots += 1;
            if (!slot || slot.type === 'break') return;
            totalAppts += 1;
            if (slot.status === 'completed' || slot.status === 'checked-in' || slot.status === 'in-session') {
              completedOrChecked += 1;
            }
            if (dow >= 1 && dow <= 6) {
              dayBuckets[dow - 1] += 1;
            }
            var svc = String(slot.service || '').toLowerCase();
            if (svc.indexOf('check') >= 0 || svc.indexOf('clean') >= 0) treatmentCounts.checkup += 1;
            else if (svc.indexOf('fill') >= 0 || svc.indexOf('repair') >= 0 || svc.indexOf('tooth') >= 0) treatmentCounts.filling += 1;
            else if (svc.indexOf('whiten') >= 0) treatmentCounts.whitening += 1;
            else if (svc.indexOf('align') >= 0 || svc.indexOf('brace') >= 0) treatmentCounts.aligner += 1;
            else if (svc.indexOf('crown') >= 0 || svc.indexOf('implant') >= 0) treatmentCounts.crown += 1;
            else treatmentCounts.other += 1;
          });
        });
      });

      var chairPct = totalSlots > 0 ? Math.round((totalAppts / totalSlots) * 100) : 0;
      var newPatientsCount = patients.filter(function (p) { return p.isNew !== false; }).length;
      var noShowRate = totalAppts > 0
        ? (((totalAppts - completedOrChecked) / totalAppts) * 10).toFixed(1) + '%'
        : '0.0%';

      var pct = function (val) {
        return totalAppts > 0 ? Math.round((val / totalAppts) * 100) : 0;
      };

      return {
        appointments: String(totalAppts),
        noShow: noShowRate,
        newPatients: String(newPatientsCount),
        chairTime: chairPct + '%',
        bars: dayBuckets,
        treatments: [
          pct(treatmentCounts.checkup),
          pct(treatmentCounts.filling),
          pct(treatmentCounts.whitening),
          pct(treatmentCounts.aligner),
          pct(treatmentCounts.crown),
          pct(treatmentCounts.other)
        ]
      };
    }

    function renderReport(period) {
      currentPeriod = period;
      var data = computeLiveReport(period);
      document.querySelector('[data-report-stat="appointments"]').textContent = data.appointments;
      document.querySelector('[data-report-stat="noShow"]').textContent = data.noShow;
      document.querySelector('[data-report-stat="newPatients"]').textContent = data.newPatients;
      document.querySelector('[data-report-stat="chairTime"]').textContent = data.chairTime;

      var maxAppointments = Math.max.apply(Math, data.bars.concat([1]));
      document.querySelectorAll('.bar-chart__item').forEach(function (bar, index) {
        bar.querySelector('[data-bar-value]').textContent = String(data.bars[index]);
        bar.querySelector('.bar-chart__bar').style.setProperty(
          '--bar-height',
          Math.max(12, Math.round(data.bars[index] / maxAppointments * 100)) + '%'
        );
      });
      document.querySelectorAll('.treatment-row').forEach(function (row, index) {
        row.querySelector('strong').textContent = data.treatments[index] + '%';
        row.querySelector('progress').value = data.treatments[index];
      });
    }

    document.querySelectorAll('[data-report-period]').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('[data-report-period]').forEach(function (periodButton) {
          var selected = periodButton === button;
          periodButton.classList.toggle('is-active', selected);
          periodButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        renderReport(button.getAttribute('data-report-period'));
      });
    });

    document.getElementById('download-report').addEventListener('click', function () {
      var data = computeLiveReport(currentPeriod);
      var rows = [
        ['Report period', currentPeriod],
        ['Appointments', data.appointments],
        ['No-show rate', data.noShow],
        ['New patients', data.newPatients],
        ['Chair time used', data.chairTime],
        [],
        ['Day', 'Appointments']
      ];
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (day, index) {
        rows.push([day, data.bars[index]]);
      });
      var csv = rows.map(function (row) {
        return row.map(function (value) {
          return '"' + String(value === undefined ? '' : value).replace(/"/g, '""') + '"';
        }).join(',');
      }).join('\r\n');
      downloadFile('clinic-report-' + currentPeriod + '.csv', csv, 'text/csv');
      showToast('Downloaded the clinic report CSV.');
    });

    renderReport('week');
  }
})();
