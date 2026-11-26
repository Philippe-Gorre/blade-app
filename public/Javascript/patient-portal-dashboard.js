(function () {
  'use strict';

  var mainTabs = Array.prototype.slice.call(document.querySelectorAll('[data-main-tab]'));
  var mainViews = {
    sessions: document.getElementById('sessions-view'),
    payments: document.getElementById('payments-view')
  };
  var sessionTabs = Array.prototype.slice.call(document.querySelectorAll('[data-session-tab]'));
  var sessionPanels = Array.prototype.slice.call(document.querySelectorAll('[data-session-panel]'));
  var toast = document.getElementById('patient-toast');
  var toastTimer = null;
  var selectedPaymentMethod = 'Card';
  var rescheduleDialog = document.getElementById('reschedule-dialog');
  var rescheduleForm = document.getElementById('reschedule-form');
  var rescheduleDate = document.getElementById('reschedule-date');
  var rescheduleVisitName = document.getElementById('reschedule-visit-name');
  var activeRescheduleVisit = null;

  var storage = window.DentalStorage;
  var activePatient = storage && typeof storage.getPortalSession === 'function'
    ? storage.getPortalSession()
    : null;

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 4000);
  }

  function setMainView(view) {
    mainTabs.forEach(function (tab) {
      var selected = tab.getAttribute('data-main-tab') === view;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    Object.keys(mainViews).forEach(function (key) {
      mainViews[key].hidden = key !== view;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setSessionView(view) {
    sessionTabs.forEach(function (tab) {
      var selected = tab.getAttribute('data-session-tab') === view;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    sessionPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-session-panel') !== view;
    });
  }

  function downloadText(filename, content, mimeType) {
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

  function formatAmount(amount) {
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function dateParts(dateKey) {
    var parts = String(dateKey || '').split('-');
    var date = parts.length === 3
      ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      : new Date();
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: String(date.getDate()),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    };
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  mainTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setMainView(tab.getAttribute('data-main-tab'));
    });
  });

  sessionTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      setSessionView(tab.getAttribute('data-session-tab'));
    });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var offset = event.key === 'ArrowRight' ? 1 : -1;
      var nextIndex = (index + offset + sessionTabs.length) % sessionTabs.length;
      sessionTabs[nextIndex].focus();
      setSessionView(sessionTabs[nextIndex].getAttribute('data-session-tab'));
    });
  });

  document.getElementById('close-reschedule').addEventListener('click', function () {
    rescheduleDialog.close();
  });
  rescheduleDialog.addEventListener('click', function (event) {
    if (event.target === rescheduleDialog) rescheduleDialog.close();
  });

  // ---------- LIVE PATIENT PORTAL MODE ----------
  if (activePatient) {
    var fullName = ((activePatient.firstName || '') + ' ' + (activePatient.lastName || '')).trim() || 'Patient';
    var initials = (((activePatient.firstName || '')[0] || '') + ((activePatient.lastName || '')[0] || '')).toUpperCase() || 'PT';

    var noticeEl = document.getElementById('portal-demo-notice');
    if (noticeEl) noticeEl.hidden = true;

    var nameEl = document.getElementById('portal-patient-name');
    var sinceEl = document.getElementById('portal-patient-since');
    var avatarEl = document.getElementById('portal-patient-avatar');
    var signoutBtn = document.getElementById('portal-signout-btn');
    if (nameEl) nameEl.textContent = fullName;
    if (sinceEl) sinceEl.textContent = activePatient.portalEmail || activePatient.email || activePatient.phone || 'Patient account';
    if (avatarEl) avatarEl.textContent = initials;
    if (signoutBtn) {
      signoutBtn.hidden = false;
      signoutBtn.addEventListener('click', function () {
        storage.clearPortalSession();
        window.location.href = '/patient-portal';
      });
    }

    var dialogNote = rescheduleDialog.querySelector('.dialog-note');
    if (dialogNote) {
      dialogNote.textContent = 'Your reschedule request will be sent to the clinic front desk.';
    }

    function renderLiveSessions() {
      var data = storage.getPatientAppointments(activePatient);
      var heading = document.getElementById('sessions-heading');
      var nextCard = document.querySelector('.next-visit-card');
      var upcomingTab = document.getElementById('upcoming-tab');
      var upcomingPanel = document.getElementById('upcoming-panel');
      var pastPanel = document.getElementById('past-panel');
      var historyPanel = document.getElementById('history-panel');

      if (upcomingTab) upcomingTab.textContent = 'Upcoming (' + data.upcoming.length + ')';

      if (data.upcoming.length > 0) {
        var next = data.upcoming[0];
        var nextParts = dateParts(next.date);
        if (heading) heading.textContent = 'Hi ' + (activePatient.firstName || fullName) + ', here is your next visit';
        if (nextCard) {
          nextCard.hidden = false;
          var tile = nextCard.querySelector('.date-tile');
          if (tile) {
            tile.setAttribute('aria-label', nextParts.full);
            tile.innerHTML = '';
            tile.appendChild(el('span', '', nextParts.weekday));
            tile.appendChild(el('strong', '', nextParts.day));
            tile.appendChild(el('span', '', nextParts.month));
          }
          var details = nextCard.querySelector('.next-visit-card__details');
          if (details) {
            details.innerHTML = '';
            details.appendChild(el('h2', '', next.service));
            details.appendChild(el('p', '', next.time + ' · ' + next.dentist));
            details.appendChild(el('p', '', 'Chair ' + next.chair));
          }
          var addCalBtn = document.getElementById('add-calendar');
          if (addCalBtn) {
            addCalBtn.onclick = function () {
              var compactDate = next.date.replace(/-/g, '');
              downloadText(
                'dental-visit-' + next.date + '.ics',
                'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Dentistry With a Smile//Patient Portal//EN\nBEGIN:VEVENT\nDTSTART:' + compactDate + 'T090000\nDTEND:' + compactDate + 'T100000\nSUMMARY:' + next.service + ' - ' + fullName + '\nEND:VEVENT\nEND:VCALENDAR',
                'text/calendar'
              );
              showToast('Downloaded calendar file for ' + next.service + '.');
            };
          }
        }
      } else {
        if (heading) heading.textContent = 'Hi ' + (activePatient.firstName || fullName) + ', you have no upcoming visits';
        if (nextCard) nextCard.hidden = true;
      }

      if (upcomingPanel) {
        upcomingPanel.innerHTML = '';
        if (!data.upcoming.length) {
          upcomingPanel.appendChild(el('p', 'patient-cancel-note', 'No upcoming appointments scheduled. Book a visit on our homepage or call the clinic.'));
        } else {
          data.upcoming.forEach(function (visit) {
            var parts = dateParts(visit.date);
            var card = el('article', 'visit-card');
            var tile = el('div', 'date-tile');
            tile.appendChild(el('span', '', parts.weekday));
            tile.appendChild(el('strong', '', parts.day));
            tile.appendChild(el('span', '', parts.month));

            var details = el('div', 'visit-card__details');
            var titleRow = el('div', 'visit-card__title');
            titleRow.appendChild(el('h2', '', visit.service));
            var pill = el('span', 'status-pill ' + (visit.status === 'confirmed' || visit.status === 'checked-in' ? 'status-pill--confirmed' : 'status-pill--confirm'), visit.statusLabel);
            titleRow.appendChild(pill);
            details.appendChild(titleRow);
            details.appendChild(el('p', '', visit.time + ' · ' + visit.dentist + ' · Chair ' + visit.chair));
            if (visit.note) details.appendChild(el('p', 'visit-note', visit.note));

            var actions = el('div', 'visit-card__actions');
            if (visit.status !== 'confirmed' && visit.status !== 'checked-in') {
              var confirmBtn = el('button', 'patient-button patient-button--dark', 'Confirm visit');
              confirmBtn.type = 'button';
              confirmBtn.addEventListener('click', function () {
                var schedule = storage.getScheduleForDate(visit.date);
                schedule.forEach(function (row) {
                  if (String(row.time).toLowerCase().trim() === String(visit.time).toLowerCase().trim()) {
                    var target = visit.chair === 1 ? row.chair1 : row.chair2;
                    if (target) {
                      target.status = 'confirmed';
                      target.statusLabel = 'Confirmed';
                    }
                  }
                });
                storage.saveScheduleForDate(visit.date, schedule);
                storage.addNotification({
                  title: fullName + ' confirmed their visit',
                  meta: visit.date + ' · ' + visit.time + ' · ' + visit.service,
                  href: '/appointments'
                });
                showToast('Your visit is confirmed.');
                renderLiveSessions();
              });
              actions.appendChild(confirmBtn);
            }

            var reschedBtn = el('button', 'patient-button patient-button--outline', 'Reschedule');
            reschedBtn.type = 'button';
            reschedBtn.addEventListener('click', function () {
              activeRescheduleVisit = visit;
              rescheduleVisitName.textContent = visit.service + ' (' + visit.date + ' at ' + visit.time + ')';
              rescheduleForm.reset();
              rescheduleDate.min = localDateKey(new Date());
              rescheduleDialog.showModal();
            });
            actions.appendChild(reschedBtn);

            card.appendChild(tile);
            card.appendChild(details);
            card.appendChild(actions);
            upcomingPanel.appendChild(card);
          });
          upcomingPanel.appendChild(el('p', 'patient-cancel-note', 'Need to cancel? Contact the clinic at least 24 hours before your visit.'));
        }
      }

      if (pastPanel) {
        pastPanel.innerHTML = '';
        var pastWrap = el('div', 'past-visits');
        if (!data.past.length) {
          pastWrap.appendChild(el('p', 'patient-cancel-note', 'No completed visits recorded yet.'));
        } else {
          data.past.forEach(function (visit) {
            var parts = dateParts(visit.date);
            var item = el('article', 'past-visit');
            var timeEl = el('time', '', parts.day + ' ' + parts.month);
            timeEl.setAttribute('datetime', visit.date);
            var body = el('div', 'past-visit__body');
            body.appendChild(el('h2', '', visit.service));
            body.appendChild(el('p', '', visit.dentist + ' · ' + visit.statusLabel));

            var noteText = (visit.session && visit.session.notes) || visit.note || '';
            if (noteText) {
              var noteBox = el('div', 'visit-note visit-note--expanded');
              noteBox.appendChild(el('strong', '', 'Notes from your dentist'));
              noteBox.appendChild(el('p', '', noteText));
              var dlBtn = el('button', 'patient-button patient-button--outline', 'Download visit summary');
              dlBtn.type = 'button';
              dlBtn.addEventListener('click', function () {
                downloadText(
                  'visit-summary-' + visit.date + '.txt',
                  'Visit Summary\nPatient: ' + fullName + '\nDate: ' + visit.date + '\nService: ' + visit.service + '\nDentist: ' + visit.dentist + '\n\nNotes:\n' + noteText,
                  'text/plain'
                );
                showToast('Downloaded visit summary.');
              });
              noteBox.appendChild(dlBtn);
              body.appendChild(noteBox);
            }
            item.appendChild(timeEl);
            item.appendChild(body);
            pastWrap.appendChild(item);
          });
        }
        pastPanel.appendChild(pastWrap);
      }

      if (historyPanel) {
        var historyList = historyPanel.querySelector('.history-card');
        if (historyList) {
          historyList.innerHTML = '';
          historyList.appendChild(el('h2', '', 'Visit history'));
          var ul = el('ul', 'history-list');
          if (!data.past.length && !data.upcoming.length) {
            var emptyLi = el('li', '');
            emptyLi.appendChild(el('span', '', 'No visits recorded yet.'));
            ul.appendChild(emptyLi);
          } else {
            data.past.concat(data.upcoming).forEach(function (v) {
              var li = el('li', '');
              var left = el('span', '');
              left.appendChild(el('strong', '', v.service));
              left.appendChild(el('small', '', v.dentist + ' · ' + v.statusLabel));
              li.appendChild(left);
              li.appendChild(el('time', '', v.date));
              ul.appendChild(li);
            });
          }
          historyList.appendChild(ul);
        }
      }
    }

    function renderLivePayments() {
      var allInvoices = storage.getInvoices();
      var targetName = fullName.toLowerCase();
      var myInvoices = allInvoices.filter(function (inv) {
        return (inv.patientId && String(inv.patientId) === String(activePatient.id)) ||
          String(inv.patientName || '').trim().toLowerCase() === targetName;
      });

      var unpaid = myInvoices.filter(function (inv) { return inv.status !== 'Paid'; });
      var paid = myInvoices.filter(function (inv) { return inv.status === 'Paid'; });
      var totalBalance = unpaid.reduce(function (sum, inv) {
        if (inv.status === 'Plan' && inv.planTotal) {
          var remaining = Math.max(0, inv.planTotal - (inv.planPaid || 0));
          return sum + remaining * (inv.installmentAmount || 0);
        }
        return sum + Number(inv.amount || 0);
      }, 0);

      var balanceCard = document.querySelector('.balance-card');
      if (balanceCard) {
        balanceCard.innerHTML = '';
        balanceCard.appendChild(el('span', '', 'Outstanding balance'));
        balanceCard.appendChild(el('strong', '', formatAmount(totalBalance)));
        balanceCard.appendChild(el('p', '', unpaid.length ? (unpaid.length + ' open invoice(s) on your account.') : 'All invoices are paid.'));
      }

      var nextPayable = unpaid[0] || null;
      var nextAmount = nextPayable
        ? (nextPayable.status === 'Plan' && nextPayable.installmentAmount ? nextPayable.installmentAmount : nextPayable.amount)
        : 0;

      var payBtn = document.getElementById('pay-next');
      if (payBtn) {
        payBtn.disabled = !nextPayable;
        payBtn.textContent = nextPayable
          ? ('Pay ' + formatAmount(nextAmount) + ' by ' + selectedPaymentMethod.toLowerCase())
          : 'No balance due';
        payBtn.onclick = function () {
          if (!nextPayable) return;
          storage.recordInvoicePayment(nextPayable.id, selectedPaymentMethod);
          storage.addNotification({
            title: fullName + ' paid ' + formatAmount(nextAmount),
            meta: nextPayable.id + ' via ' + selectedPaymentMethod,
            href: '/billing'
          });
          showToast('Payment of ' + formatAmount(nextAmount) + ' recorded.');
          renderLivePayments();
        };
      }

      var fineprint = document.querySelector('.payment-fineprint');
      if (fineprint) {
        fineprint.textContent = 'Payments update your clinic billing record immediately.';
      }

      var listCards = document.querySelectorAll('.payment-list-card');
      if (listCards[0]) {
        listCards[0].innerHTML = '';
        listCards[0].appendChild(el('h2', '', 'Upcoming payments'));
        if (!unpaid.length) {
          listCards[0].appendChild(el('p', 'patient-cancel-note', 'No upcoming payments due.'));
        } else {
          unpaid.forEach(function (inv) {
            var row = el('div', 'payment-row');
            var info = el('span', '');
            info.appendChild(el('strong', '', inv.service));
            info.appendChild(el('small', '', inv.id + ' · ' + inv.date));
            row.appendChild(info);
            row.appendChild(el('span', 'status-pill status-pill--confirm', inv.status));
            row.appendChild(el('strong', '', formatAmount(inv.amount)));
            listCards[0].appendChild(row);
          });
        }
      }

      if (listCards[1]) {
        listCards[1].innerHTML = '';
        listCards[1].appendChild(el('h2', '', 'Payment history'));
        if (!paid.length) {
          listCards[1].appendChild(el('p', 'patient-cancel-note', 'No past payments yet.'));
        } else {
          paid.forEach(function (inv) {
            var row = el('div', 'payment-row');
            var info = el('span', '');
            info.appendChild(el('strong', '', inv.service));
            info.appendChild(el('small', '', (inv.paidAt || inv.date) + ' · ' + (inv.method || 'Paid')));
            row.appendChild(info);
            row.appendChild(el('strong', '', formatAmount(inv.amount)));
            var receiptBtn = el('button', 'patient-button patient-button--outline', 'Receipt');
            receiptBtn.type = 'button';
            receiptBtn.addEventListener('click', function () {
              downloadText(
                'receipt-' + inv.id + '.txt',
                'PAYMENT RECEIPT\nInvoice: ' + inv.id + '\nPatient: ' + fullName + '\nService: ' + inv.service + '\nAmount: ' + formatAmount(inv.amount) + '\nMethod: ' + (inv.method || 'Paid') + '\nDate: ' + (inv.paidAt || inv.date),
                'text/plain'
              );
              showToast('Downloaded receipt for ' + inv.id + '.');
            });
            row.appendChild(receiptBtn);
            listCards[1].appendChild(row);
          });
        }
      }
    }

    document.querySelectorAll('[data-payment-method]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedPaymentMethod = button.getAttribute('data-payment-method');
        document.querySelectorAll('[data-payment-method]').forEach(function (method) {
          var selected = method === button;
          method.classList.toggle('is-active', selected);
          method.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        renderLivePayments();
      });
    });

    rescheduleForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!rescheduleForm.reportValidity()) return;
      var preferredDate = rescheduleDate.value;
      var preferredTime = document.getElementById('reschedule-time').value;

      if (activeRescheduleVisit && typeof storage.rescheduleSlot === 'function') {
        var morningTimes = ['9:00 am', '10:00 am', '11:00 am'];
        var afternoonTimes = ['12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'];
        var candidateTimes = preferredTime.indexOf('Morning') >= 0 ? morningTimes : afternoonTimes;
        var targetSchedule = storage.getScheduleForDate(preferredDate);
        var chosen = null;

        for (var t = 0; t < candidateTimes.length && !chosen; t++) {
          var timeStr = candidateTimes[t];
          var rowMatch = null;
          for (var r = 0; r < targetSchedule.length; r++) {
            if (String(targetSchedule[r].time).toLowerCase().trim() === timeStr) {
              rowMatch = targetSchedule[r];
              break;
            }
          }
          if (!rowMatch) {
            chosen = { time: timeStr, chair: 1 };
          } else if (!rowMatch.chair1) {
            chosen = { time: timeStr, chair: 1 };
          } else if (!rowMatch.chair2) {
            chosen = { time: timeStr, chair: 2 };
          }
        }

        if (!chosen) {
          showToast('No open ' + preferredTime.toLowerCase() + ' slots on ' + preferredDate + '. Please choose another date.');
          return;
        }

        try {
          storage.rescheduleSlot(
            activeRescheduleVisit.date,
            activeRescheduleVisit.time,
            activeRescheduleVisit.chair,
            preferredDate,
            chosen.time,
            chosen.chair
          );
          storage.addNotification({
            title: fullName + ' rescheduled visit',
            meta: activeRescheduleVisit.service + ' -> ' + preferredDate + ' at ' + chosen.time,
            href: '/appointments'
          });
          rescheduleDialog.close();
          renderLiveSessions();
          showToast('Appointment rescheduled to ' + preferredDate + ' at ' + chosen.time + '.');
          return;
        } catch (err) {
          showToast(err.message || 'Could not reschedule visit.');
          return;
        }
      }

      storage.addNotification({
        title: fullName + ' requested reschedule',
        meta: (activeRescheduleVisit ? activeRescheduleVisit.service + ' -> ' : '') + preferredDate + ' (' + preferredTime + ')',
        href: '/appointments'
      });
      rescheduleDialog.close();
      showToast('Reschedule request sent to the clinic front desk.');
    });

    renderLiveSessions();
    renderLivePayments();
    setSessionView('upcoming');
    return;
  }

  // ---------- SAMPLE PREVIEW MODE (NOT SIGNED IN) ----------
  document.querySelectorAll('[data-confirm-visit]').forEach(function (button) {
    button.addEventListener('click', function () {
      var status = document.querySelector('[data-visit-status="cleaning"]');
      status.textContent = 'Confirmed';
      status.classList.remove('status-pill--confirm');
      status.classList.add('status-pill--confirmed');
      button.remove();
      showToast('Visit confirmed in this sample preview only.');
    });
  });

  document.querySelectorAll('[data-reschedule]').forEach(function (button) {
    button.addEventListener('click', function () {
      rescheduleVisitName.textContent = button.getAttribute('data-reschedule');
      rescheduleForm.reset();
      rescheduleDate.min = localDateKey(new Date());
      rescheduleDialog.showModal();
    });
  });

  rescheduleForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!rescheduleForm.reportValidity()) return;
    rescheduleDialog.close();
    showToast('Reschedule request previewed. No request was sent to the clinic.');
  });

  document.querySelectorAll('[data-toggle-notes]').forEach(function (button) {
    button.addEventListener('click', function () {
      var note = button.closest('.past-visit').querySelector('[data-visit-notes]');
      if (!note) {
        showToast('Notes for this visit are not included in the sample preview.');
        return;
      }
      note.hidden = !note.hidden;
      button.textContent = note.hidden ? 'View notes' : 'Hide notes';
    });
  });

  document.querySelectorAll('[data-download-summary]').forEach(function (button) {
    button.addEventListener('click', function () {
      downloadText(
        'sample-visit-summary.txt',
        'Sample visit summary\nMaria Reyes\n18 November 2026\nCheck-up and X-ray\n\nTeeth and gums look healthy. One small area on the lower left to keep an eye on.',
        'text/plain'
      );
      showToast('Downloaded the sample visit summary.');
    });
  });

  document.getElementById('add-calendar').addEventListener('click', function () {
    downloadText(
      'sample-dental-visit.ics',
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Dentistry With a Smile//Patient Portal//EN\nBEGIN:VEVENT\nDTSTART:20261126T093000\nDTEND:20261126T103000\nSUMMARY:Filling follow-up - Maria Reyes\nLOCATION:128 Willow Street\\, Suite 4\nEND:VEVENT\nEND:VCALENDAR',
      'text/calendar'
    );
    showToast('Added the sample visit to a calendar file.');
  });

  document.querySelectorAll('[data-payment-method]').forEach(function (button) {
    button.addEventListener('click', function () {
      selectedPaymentMethod = button.getAttribute('data-payment-method');
      document.querySelectorAll('[data-payment-method]').forEach(function (method) {
        var selected = method === button;
        method.classList.toggle('is-active', selected);
        method.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      document.getElementById('pay-next').textContent = 'Pay 2,000.00 by ' + selectedPaymentMethod.toLowerCase();
    });
  });

  document.getElementById('pay-next').addEventListener('click', function () {
    showToast('No payment has been processed or saved. This is a sample preview.');
  });

  document.querySelectorAll('[data-demo-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      showToast(button.getAttribute('data-demo-action'));
    });
  });

  setSessionView('upcoming');
})();
