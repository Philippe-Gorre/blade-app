(function () {
  'use strict';

  var form = document.getElementById('patient-portal-login');
  var emailInput = document.getElementById('portal-email');
  var passwordInput = document.getElementById('portal-password');
  var message = document.getElementById('portal-login-message');
  if (!form || !emailInput || !passwordInput || !message) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = String(emailInput.value || '').trim();
    var password = String(passwordInput.value || '');
    if (!email || !password) {
      message.textContent = 'Please enter your email address and password.';
      message.hidden = false;
      return;
    }

    if (!window.DentalStorage || typeof window.DentalStorage.verifyPortalLogin !== 'function') {
      message.textContent = 'Patient storage is unavailable. Please try again.';
      message.hidden = false;
      return;
    }

    var result = window.DentalStorage.verifyPortalLogin(email, password);
    if (!result.ok || !result.patient) {
      message.textContent = result.message || 'Incorrect email or password.';
      message.hidden = false;
      return;
    }

    window.DentalStorage.setPortalSession(result.patient.id);
    window.location.href = '/patient-portal/preview';
  });
})();
