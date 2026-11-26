<div class="modal-overlay" id="modal-book-slot" hidden>
  <div class="modal modal--booking" role="dialog" aria-labelledby="book-slot-title" aria-modal="true">
    <div class="modal__head">
      <h2 id="book-slot-title">Book appointment</h2>
      <button class="modal__close" type="button" id="close-book-modal" aria-label="Close">✕</button>
    </div>
    <form id="form-book-slot">
      <h3 class="modal__section-title">Personal information</h3>
      <div class="modal__row">
        <div class="modal__field">
          <label for="slot-patient-first-name">First name</label>
          <input class="modal__input" type="text" id="slot-patient-first-name" autocomplete="given-name" maxlength="80" required>
        </div>
        <div class="modal__field">
          <label for="slot-patient-last-name">Last name</label>
          <input class="modal__input" type="text" id="slot-patient-last-name" autocomplete="family-name" maxlength="80" required>
        </div>
      </div>
      <div class="modal__row">
        <div class="modal__field">
          <label for="slot-patient-phone">Phone number</label>
          <input class="modal__input" type="tel" id="slot-patient-phone" autocomplete="tel" placeholder="+63 912 345 6789" maxlength="20" required>
        </div>
        <div class="modal__field">
          <label for="slot-patient-email">Email</label>
          <input class="modal__input" type="email" id="slot-patient-email" autocomplete="email" maxlength="254" placeholder="patient@email.com">
        </div>
      </div>

      <h3 class="modal__section-title">Appointment details</h3>
      <div class="modal__field">
        <label for="slot-service">Service / Treatment</label>
        <select class="modal__input" id="slot-service">
          @foreach (config('clinic.services_staff') as $service)
            <option>{{ $service }}</option>
          @endforeach
        </select>
      </div>
      <div class="modal__field">
        <label for="slot-note">Front desk note</label>
        <textarea class="modal__input modal__textarea" id="slot-note" maxlength="500" placeholder="Any notes about the patient…"></textarea>
      </div>
      <div class="modal__field">
        <label for="slot-status">Status</label>
        <select class="modal__input" id="slot-status">
          @foreach (config('clinic.booking_statuses') as $key)
            <option value="{{ $key }}">{{ config('clinic.statuses.' . $key) }}</option>
          @endforeach
        </select>
      </div>
      <div class="modal__actions">
        <button class="btn btn--primary" type="submit">Save appointment</button>
        <button class="btn btn--outline" type="button" id="cancel-book-modal">Cancel</button>
      </div>
    </form>
  </div>
</div>
