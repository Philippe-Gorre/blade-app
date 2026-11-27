(function () {
  'use strict';

  var storage = window.DentalStorage;
  if (!storage || typeof storage.getCustomServices !== 'function') return;

  var services = storage.getCustomServices();
  var serviceSelectIds = ['pt-service', 'appointment-service', 'slot-service', 'ap-service'];

  function formatPrice(price) {
    return Number(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  serviceSelectIds.forEach(function (id) {
    var select = document.getElementById(id);
    if (!select) return;

    services.forEach(function (service) {
      var exists = Array.prototype.some.call(select.options, function (option) {
        return option.value.toLowerCase() === String(service.name).toLowerCase();
      });
      if (exists) return;

      var option = document.createElement('option');
      option.value = service.name;
      var sessions = Number(service.sessions) || 1;
      option.textContent = service.name + ' — ₱' + formatPrice(service.price) +
        ' (' + sessions + ' session' + (sessions === 1 ? '' : 's') + ')';
      select.appendChild(option);
    });
  });

  var invoiceServiceList = document.getElementById('invoice-service-list');
  if (invoiceServiceList) {
    services.forEach(function (service) {
      var option = document.createElement('option');
      option.value = service.name;
      option.label = '₱' + formatPrice(service.price);
      invoiceServiceList.appendChild(option);
    });
  }

  var serviceGrid = document.querySelector('.service-grid');
  if (serviceGrid) {
    services.forEach(function (service) {
      var card = document.createElement('div');
      card.className = 'service';
      var heading = document.createElement('div');
      heading.className = 'service__head';
      var title = document.createElement('h3');
      title.textContent = service.name;
      var price = document.createElement('span');
      price.className = 'service__price';
      price.textContent = '₱' + formatPrice(service.price);
      var description = document.createElement('p');
      var sessions = Number(service.sessions) || 1;
      description.textContent = sessions + ' session' + (sessions === 1 ? '' : 's') +
        '. Ask our team about scheduling and follow-up timing.';
      heading.appendChild(title);
      heading.appendChild(price);
      card.appendChild(heading);
      card.appendChild(description);
      serviceGrid.appendChild(card);
    });
  }
})();
