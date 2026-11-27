<div class="modal-overlay" id="appointment-modal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title">
    <div class="modal-head">
      <h2 id="appointment-modal-title">Book appointment</h2>
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
    </div>
    <p class="appointment-slot-summary" id="appointment-slot-summary"></p>
    <form id="appointment-form">
      <div class="form-row">
        <div class="field">
          <label for="appointment-first-name">First name</label>
          <input id="appointment-first-name" class="input" type="text" autocomplete="given-name" maxlength="80" required>
        </div>
        <div class="field">
          <label for="appointment-last-name">Last name</label>
          <input id="appointment-last-name" class="input" type="text" autocomplete="family-name" maxlength="80" required>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="appointment-phone">Phone number</label>
          <input id="appointment-phone" class="input" type="tel" autocomplete="tel" placeholder="+63 912 345 6789" maxlength="20" required>
        </div>
        <div class="field">
          <label for="appointment-email">Email</label>
          <input id="appointment-email" class="input" type="email" autocomplete="email" maxlength="254" placeholder="patient@email.com">
        </div>
      </div>
      <div class="field">
        <label for="appointment-service">Service / Treatment</label>
        <select id="appointment-service" class="input">
          @foreach (config('clinic.services_staff') as $service)
            <option>{{ $service }}</option>
          @endforeach
        </select>
      </div>
      <div class="field">
        <label for="appointment-note">Front desk note</label>
        <textarea id="appointment-note" class="input appointment-note" maxlength="500" placeholder="Any notes about the patient…"></textarea>
      </div>
      <p class="form-error" id="appointment-error" role="alert" hidden></p>
      <div class="modal-actions">
        <button type="submit" class="btn btn--primary">Save appointment</button>
        <button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
      </div>
    </form>
  </div>
</div>
