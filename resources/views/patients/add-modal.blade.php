<div class="modal-overlay" id="modal-overlay" hidden>
  <div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">

    <div class="modal__header">
      <h2 id="modal-title">Add patient</h2>
      <button class="modal__close" type="button" id="modal-close-btn" aria-label="Close">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"></path></svg>
      </button>
    </div>

    <form class="modal__body" id="add-patient-form" novalidate>

      <h3 class="modal__section-title">Personal information</h3>
      <div class="modal__row">
        <div class="modal__field">
          <label for="ap-fname">First name</label>
          <input class="modal__input" id="ap-fname" type="text" autocomplete="given-name" maxlength="80" required>
        </div>
        <div class="modal__field">
          <label for="ap-lname">Last name</label>
          <input class="modal__input" id="ap-lname" type="text" autocomplete="family-name" maxlength="80" required>
        </div>
      </div>
      <div class="modal__row">
        <div class="modal__field">
          <label for="ap-phone">Phone number</label>
          <input class="modal__input" id="ap-phone" type="tel" autocomplete="tel" placeholder="+63 912 345 6789" maxlength="11" required>
        </div>
        <div class="modal__field">
          <label for="ap-email">Email</label>
          <input class="modal__input" id="ap-email" type="email" autocomplete="email" maxlength="254" placeholder="patient@email.com">
        </div>
      </div>

      <h3 class="modal__section-title">Appointment details</h3>
      <div class="modal__row">
        <div class="modal__field">
          <label for="ap-service">What is it for?</label>
          <select class="modal__input" id="ap-service">
            @foreach (config('clinic.services_public') as $service)
              <option>{{ $service }}</option>
            @endforeach
          </select>
        </div>
        <div class="modal__field">
          <label for="ap-dentist">Dentist</label>
          <select class="modal__input" id="ap-dentist">
            @foreach (collect(config('clinic.chairs'))->pluck('dentist') as $dentist)
              <option>{{ $dentist }}</option>
            @endforeach
          </select>
        </div>
      </div>

      <div class="modal__field">
        <span class="modal__label">Preferred day</span>
        <div class="modal__chips" id="ap-day-chips">
          @foreach (config('clinic.days') as $day)
            <button class="modal__chip" type="button" aria-pressed="{{ $day === 'Tue' ? 'true' : 'false' }}">{{ $day }}</button>
          @endforeach
        </div>
      </div>

      <div class="modal__row">
        <div class="modal__field">
          <label for="ap-time">Preferred time</label>
          <select class="modal__input" id="ap-time">
            @foreach (config('clinic.time_slots') as $slot)
              <option>{{ $slot }}</option>
            @endforeach
          </select>
        </div>
        <div class="modal__field">
          <label for="ap-chair">Chair</label>
          <select class="modal__input" id="ap-chair">
            @foreach (config('clinic.chairs') as $chair)
              <option>{{ $chair['name'] }}</option>
            @endforeach
          </select>
        </div>
      </div>

      <div class="modal__field">
        <label for="ap-note">Front desk note</label>
        <textarea class="modal__input modal__textarea" id="ap-note" maxlength="500" placeholder="Any notes about the patient…"></textarea>
      </div>

      <p class="modal__error" id="ap-error" hidden></p>

      <div class="modal__actions">
        <button class="btn btn--primary" type="submit">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"></path></svg>
          Add patient
        </button>
        <button class="btn btn--outline" type="button" id="modal-cancel-btn">Cancel</button>
      </div>
    </form>

  </div>
</div>
