(function () {
  'use strict';

  var form = document.getElementById('patient-portal-login');
  var emailInput = document.getElementById('portal-email');
  var passwordInput = document.getElementById('portal-password');
  var message = document.getElementById('portal-login-message');
  if (!form || !emailInput || !passwordInput || !message) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var email = String(emailInput.value || '').trim();
    var password = String(passwordInput.value || '');
    if (!email || !password) {
      message.textContent = 'Please enter your email address and password.';
      message.hidden = false;
      return;
    }

    message.hidden = true;
    try {
      var csrfToken = document.querySelector('meta[name="csrf-token"]');
      var response = await fetch(form.dataset.authUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken ? csrfToken.content : ''
        },
        body: JSON.stringify({ email: email, password: password })
      });
      var serverResult = await response.json();
      if (response.status === 419) {
        window.location.reload();
        return;
      }
      if (response.ok && serverResult.redirect) {
        try {
          localStorage.setItem('dental_auth_session_marker', JSON.stringify({
            at: Date.now(),
            email: email
          }));
        } catch (e) { /* ignore */ }
        window.location.href = serverResult.redirect;
        return;
      }
      if (!response.ok || serverResult.notStaff !== true) {
        message.textContent = serverResult.message || 'Unable to sign in. Please try again.';
        message.hidden = false;
        return;
      }
    } catch (error) {
      console.error('Server sign-in failed:', error);
      message.textContent = 'Unable to verify your account right now. Please try again.';
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
