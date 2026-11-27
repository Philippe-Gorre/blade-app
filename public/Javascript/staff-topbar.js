(function () {
  'use strict';

  var btn = document.getElementById('staff-notifications-btn');
  var badge = document.getElementById('staff-notifications-badge');
  var popover = document.getElementById('staff-notifications-popover');
  var listEl = document.getElementById('staff-notifications-list');
  var clearBtn = document.getElementById('staff-notifications-clear');
  if (!btn || !popover || !listEl) return;

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function gatherNotifications() {
    var items = [];
    var storage = window.DentalStorage;
    if (!storage) return items;

    var schedule = storage.getScheduleForDate(localDateKey(new Date()));
    schedule.forEach(function (row) {
      [1, 2].forEach(function (chair) {
        var slot = chair === 1 ? row.chair1 : row.chair2;
        if (!slot || slot.type === 'break') return;
        if (slot.status === 'seated') {
          var isDoctor = window.location.pathname === '/in-session' ||
            new URLSearchParams(window.location.search).get('workspace') === 'doctor';
          items.push({
            title: slot.patientName + ' is seated for doctor',
            meta: row.time + ' · Chair ' + chair + ' · ' + (slot.service || 'Visit'),
            href: isDoctor ? '/in-session' : '/dashboard'
          });
        } else if (slot.status === 'checked-in') {
          items.push({
            title: slot.patientName + ' checked in',
            meta: row.time + ' · Chair ' + chair,
            href: '/dashboard'
          });
        }
      });
    });

    var invoices = typeof storage.getInvoices === 'function' ? storage.getInvoices() : [];
    invoices.forEach(function (inv) {
      if (inv.status === 'Overdue') {
        items.push({
          title: 'Overdue invoice ' + inv.id + ' (' + inv.patientName + ')',
          meta: Number(inv.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' · ' + inv.service,
          href: '/billing'
        });
      }
    });

    var stored = typeof storage.getNotifications === 'function' ? storage.getNotifications() : [];
    stored.forEach(function (n) {
      items.push({
        title: n.title || 'Clinic update',
        meta: n.meta || '',
        href: n.href || '/appointments'
      });
    });

    return items;
  }

  function renderNotifications() {
    var items = gatherNotifications();
    if (badge) {
      badge.textContent = String(items.length);
      badge.hidden = items.length === 0;
    }

    listEl.textContent = '';
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'notif-empty';
      empty.textContent = 'No new notifications.';
      listEl.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      var link = document.createElement('a');
      link.className = 'notif-item';
      link.href = item.href || '/dashboard';
      var title = document.createElement('strong');
      title.textContent = item.title;
      var meta = document.createElement('small');
      meta.textContent = item.meta;
      link.appendChild(title);
      if (item.meta) link.appendChild(meta);
      listEl.appendChild(link);
    });
  }

  btn.addEventListener('click', function (event) {
    event.stopPropagation();
    var opening = popover.hidden;
    if (opening) renderNotifications();
    popover.hidden = !opening;
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (window.DentalStorage && typeof window.DentalStorage.clearNotifications === 'function') {
        window.DentalStorage.clearNotifications();
      }
      renderNotifications();
    });
  }

  document.addEventListener('click', function (event) {
    if (!popover.hidden && !popover.contains(event.target) && event.target !== btn) {
      popover.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  renderNotifications();

  // Auto-logout stale tabs if another tab logs in or logs out
  document.querySelectorAll('.topbar__logout').forEach(function (logoutBtn) {
    var form = logoutBtn.closest('form');
    if (!form) return;
    form.addEventListener('submit', function () {
      try {
        localStorage.setItem('dental_auth_logout', String(Date.now()));
      } catch (e) { /* ignore */ }
    });
  });

  window.addEventListener('storage', function (event) {
    if (event.key === 'dental_auth_session_marker' || event.key === 'dental_auth_logout') {
      var isAdmin = window.location.pathname.indexOf('/admin') === 0;
      window.location.href = isAdmin ? '/admin/login' : '/patient-portal';
    }
  });
})();
