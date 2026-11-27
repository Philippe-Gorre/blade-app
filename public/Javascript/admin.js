(function () {
  'use strict';

  var page = document.querySelector('[data-admin-page]');
  var storage = window.DentalStorage;
  var toast = document.getElementById('admin-toast');
  if (!page || !storage) return;

  var toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 3500);
  }

  function formatSessionGap(value, unit) {
    var labels = { days: 'day', weeks: 'week', months: 'month' };
    var safeUnit = labels[unit] ? unit : 'weeks';
    var count = Number(value) || 4;
    return count + ' ' + labels[safeUnit] + (count === 1 ? '' : 's');
  }

  function formatMoney(amount) {
    return '₱' + Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function addCell(row, value, className) {
    var cell = document.createElement('td');
    cell.textContent = value;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function addEmptyRow(body, message, columns) {
    var row = document.createElement('tr');
    var cell = addCell(row, message, 'admin-table__empty');
    cell.colSpan = columns;
    body.appendChild(row);
  }

  function renderServices() {
    var body = document.getElementById('admin-services-list');
    if (!body) return;
    body.textContent = '';
    var services = storage.getCustomServices();

    if (!services.length) {
      addEmptyRow(body, 'No custom services yet. Add one above.', 5);
      return;
    }

    services.forEach(function (service) {
      var row = document.createElement('tr');
      addCell(row, service.name);
      addCell(row, formatMoney(service.price), 'admin-table__amount');
      addCell(row, String(Number(service.sessions) || 1));
      addCell(row, formatSessionGap(service.gapValue, service.gapUnit));
      var actionCell = document.createElement('td');
      actionCell.className = 'admin-table__action';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'workspace-button workspace-button--outline admin-remove-button';
      remove.textContent = 'Remove';
      remove.setAttribute('data-remove-service', service.id);
      actionCell.appendChild(remove);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
  }

  var serviceForm = document.getElementById('admin-service-form');
  if (serviceForm) {
    serviceForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!serviceForm.reportValidity()) return;

      var name = document.getElementById('admin-service-name').value.trim();
      var price = Number(document.getElementById('admin-service-price').value);
      var sessions = Number(document.getElementById('admin-service-sessions').value);
      var gapValue = Number(document.getElementById('admin-service-gap').value);
      var gapUnit = document.getElementById('admin-service-gap-unit').value;
      if (!name || !Number.isFinite(price) || price <= 0 ||
          !Number.isInteger(sessions) || sessions < 1 || sessions > 50 ||
          !Number.isInteger(gapValue) || gapValue < 1 || gapValue > 365 ||
          ['days', 'weeks', 'months'].indexOf(gapUnit) < 0) {
        showToast('Enter a service name, valid price, 1–50 sessions, and a gap from 1–365 days, weeks, or months.');
        return;
      }

      var services = storage.getCustomServices();
      var initialServices = JSON.parse(serviceForm.dataset.initialServices || '[]');
      var duplicate = initialServices.concat(services.map(function (service) {
        return service.name;
      })).some(function (serviceName) {
        return String(serviceName).toLowerCase() === name.toLowerCase();
      });
      if (duplicate) {
        showToast('A custom service with that name already exists.');
        return;
      }

      services.push({
        id: 'service-' + Date.now(),
        name: name,
        price: price,
        sessions: sessions,
        gapValue: gapValue,
        gapUnit: gapUnit
      });
      if (!storage.saveCustomServices(services)) {
        showToast('Could not save this service in browser storage.');
        return;
      }

      serviceForm.reset();
      renderServices();
      showToast('Service added with its session plan and available in service selectors.');
    });
  }

  var servicesList = document.getElementById('admin-services-list');
  if (servicesList) {
    servicesList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-service]');
      if (!button) return;

      var services = storage.getCustomServices().filter(function (service) {
        return String(service.id) !== button.getAttribute('data-remove-service');
      });
      if (!storage.saveCustomServices(services)) {
        showToast('Could not remove this service from browser storage.');
        return;
      }
      renderServices();
      showToast('Service removed from the clinic service list.');
    });
    renderServices();
  }

  async function requestAccounts(url, options) {
    var csrfToken = document.querySelector('meta[name="csrf-token"]');
    var headers = {
      'Accept': 'application/json',
      'X-CSRF-TOKEN': csrfToken ? csrfToken.content : ''
    };
    if (options && options.body) headers['Content-Type'] = 'application/json';
    var response = await fetch(url, Object.assign({}, options || {}, {
      credentials: 'same-origin',
      headers: headers
    }));
    var result = await response.json();
    if (!response.ok) {
      var errorMessage = result.message || 'The account request failed.';
      if (result.errors) {
        Object.keys(result.errors).some(function (key) {
          if (result.errors[key] && result.errors[key][0]) {
            errorMessage = result.errors[key][0];
            return true;
          }
          return false;
        });
      }
      throw new Error(errorMessage);
    }
    return result;
  }

  async function renderAccounts() {
    var body = document.getElementById('admin-accounts-list');
    if (!body) return;
    body.textContent = '';
    var accountForm = document.getElementById('admin-account-form');
    var accounts;
    try {
      accounts = await requestAccounts(accountForm.dataset.accountsUrl);
    } catch (error) {
      console.error('Failed to load staff accounts:', error);
      addEmptyRow(body, 'Staff accounts could not be loaded.', 4);
      return false;
    }

    if (!accounts.length) {
      addEmptyRow(body, 'No staff accounts have been created yet.', 4);
      return true;
    }

    accounts.forEach(function (account) {
      var row = document.createElement('tr');
      addCell(row, account.name);
      addCell(row, account.email);
      addCell(row, account.role === 'doctor' ? 'Doctor' : 'Front desk');
      var actionCell = document.createElement('td');
      actionCell.className = 'admin-table__action';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'workspace-button workspace-button--outline admin-remove-button';
      remove.textContent = 'Remove';
      remove.setAttribute('data-remove-account', account.id);
      actionCell.appendChild(remove);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
    return true;
  }

  var accountForm = document.getElementById('admin-account-form');
  if (accountForm) {
    accountForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!accountForm.reportValidity()) return;

      var name = document.getElementById('admin-account-name').value.trim();
      var email = document.getElementById('admin-account-email').value.trim().toLowerCase();
      var password = document.getElementById('admin-account-password').value;
      var role = document.getElementById('admin-account-role').value;
      if (!name || !email || password.length < 8 || ['front_desk', 'doctor'].indexOf(role) < 0) {
        showToast('Enter staff details, a password of at least 8 characters, and an access level.');
        return;
      }

      var submitButton = accountForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      try {
        await requestAccounts(accountForm.dataset.accountsUrl, {
          method: 'POST',
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            role: role
          })
        });

        accountForm.reset();
        var refreshed = await renderAccounts();
        showToast(refreshed
          ? 'Staff login account created.'
          : 'Staff account created, but the account list could not be refreshed.');
      } catch (error) {
        console.error('Failed to create staff account:', error);
        showToast(error.message);
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  var accountsList = document.getElementById('admin-accounts-list');
  if (accountsList) {
    accountsList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-account]');
      if (!button) return;

      requestAccounts(
        accountForm.dataset.accountsUrl + '/' + encodeURIComponent(button.getAttribute('data-remove-account')),
        { method: 'DELETE' }
      ).then(function () {
        return renderAccounts();
      }).then(function (refreshed) {
        showToast(refreshed
          ? 'Staff account removed.'
          : 'Staff account removed, but the account list could not be refreshed.');
      }).catch(function (error) {
        console.error('Failed to remove staff account:', error);
        showToast(error.message);
      });
    });
    renderAccounts().then(function (refreshed) {
      if (!refreshed) showToast('Staff accounts could not be loaded. Please try again.');
    });
  }

  function renderRevenue() {
    var invoices = typeof storage.getInvoices === 'function' ? storage.getInvoices() : [];
    var now = new Date();
    var today = localDateKey(now);
    var thisMonth = today.slice(0, 7);
    var collectedToday = 0;
    var collectedMonth = 0;
    var outstanding = 0;
    var paidCount = 0;
    var byService = Object.create(null);

    invoices.forEach(function (invoice) {
      var amount = Number(invoice.amount || 0);
      var paidAt = invoice.paidAt || invoice.date || today;
      var paidAmount = 0;

      if (invoice.status === 'Paid') {
        paidAmount = amount;
        paidCount += 1;
      } else if (invoice.status === 'Plan') {
        paidAmount = Math.min(amount, Number(invoice.planPaid || 0) * Number(invoice.installmentAmount || amount));
        outstanding += Math.max(0, (Number(invoice.planTotal || 1) - Number(invoice.planPaid || 0)) * Number(invoice.installmentAmount || amount));
      } else {
        outstanding += amount;
      }

      if (paidAmount > 0) {
        if (paidAt === today) collectedToday += paidAmount;
        if (String(paidAt).slice(0, 7) === thisMonth) collectedMonth += paidAmount;
        var serviceName = invoice.service || 'Other';
        if (!byService[serviceName]) byService[serviceName] = { count: 0, amount: 0 };
        byService[serviceName].count += 1;
        byService[serviceName].amount += paidAmount;
      }
    });

    document.getElementById('admin-revenue-today').textContent = formatMoney(collectedToday);
    document.getElementById('admin-revenue-month').textContent = formatMoney(collectedMonth);
    document.getElementById('admin-revenue-outstanding').textContent = formatMoney(outstanding);
    document.getElementById('admin-revenue-paid-count').textContent = String(paidCount);

    var body = document.getElementById('admin-revenue-services');
    body.textContent = '';
    var rows = Object.keys(byService).map(function (name) {
      return { name: name, count: byService[name].count, amount: byService[name].amount };
    }).sort(function (left, right) {
      return right.amount - left.amount;
    });

    if (!rows.length) {
      addEmptyRow(body, 'No paid invoices are available yet.', 3);
      return;
    }
    rows.forEach(function (item) {
      var row = document.createElement('tr');
      addCell(row, item.name);
      addCell(row, String(item.count));
      addCell(row, formatMoney(item.amount), 'admin-table__amount');
      body.appendChild(row);
    });
  }

  if (document.getElementById('admin-revenue-services')) {
    renderRevenue();
    window.addEventListener('storage', renderRevenue);
  }
})();
