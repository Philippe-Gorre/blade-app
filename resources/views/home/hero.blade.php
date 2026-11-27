                  <div class="wrap hero-inner">
  <div class="hero-copy">
    <h1>Gentle dental care, explained as we go.</h1>
    <p class="hero-lead">Check-ups, fillings, whitening and emergency visits for adults and children. Your first appointment starts with a conversation, not a drill.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#book" data-open-booking>Book a visit</a>
      <a class="btn btn-outline" href="#services">See our services</a>
    </div>
    <ul class="checks">
      @foreach (['Adults and children', 'Emergency appointments', 'Costs agreed before treatment'] as $point)
        <li>
          <x-icon-check />
          {{ $point }}
        </li>
      @endforeach
    </ul>
  </div>

  <div class="booking-modal-overlay" id="book" hidden>
    <section class="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <header class="booking-modal-head">
        <div>
          <span class="booking-kicker">Online booking</span>
          <h2 id="booking-title">Book an appointment</h2>
        </div>
        <button class="booking-close" id="booking-close" type="button" aria-label="Close booking">
          <span aria-hidden="true">&times;</span>
        </button>
      </header>

      <ol class="booking-progress" aria-label="Booking steps">
        <li data-progress-step="1" aria-current="step"><span>1</span> Your details</li>
        <li data-progress-step="2"><span>2</span> Date and service</li>
        <li data-progress-step="3"><span>3</span> Confirm</li>
      </ol>

      <form class="booking-form" id="booking-form" novalidate>
        <section class="booking-step" data-booking-step="1" aria-labelledby="booking-step-one">
          <h3 id="booking-step-one">First, tell us about yourself</h3>
          <p class="booking-help">We’ll use these details to contact you about your visit.</p>
          <div class="booking-form-grid">
            <div class="field">
              <label for="pt-fname">First name</label>
              <input class="input" id="pt-fname" type="text" autocomplete="given-name" maxlength="80" required>
            </div>
            <div class="field">
              <label for="pt-lname">Last name</label>
              <input class="input" id="pt-lname" type="text" autocomplete="family-name" maxlength="80" required>
            </div>
            <div class="field">
              <label for="pt-phone">Cellphone number</label>
              <input class="input" id="pt-phone" type="tel" inputmode="numeric" autocomplete="tel" minlength="11" maxlength="11" pattern="[0-9]{11}" required>
            </div>
            <div class="field">
              <label for="pt-email">Gmail address</label>
              <input class="input" id="pt-email" type="email" autocomplete="email" maxlength="254" placeholder="you@gmail.com" pattern=".+@[Gg][Mm][Aa][Ii][Ll][.]com" required>
            </div>
          </div>
          <div class="booking-actions">
            <button class="btn btn-outline" id="booking-cancel" type="button">Cancel</button>
            <button class="btn btn-primary" id="booking-next-details" type="button">Choose a time</button>
          </div>
        </section>

        <section class="booking-step" data-booking-step="2" aria-labelledby="booking-step-two" hidden>
          <h3 id="booking-step-two">Choose a date and service</h3>
          <p class="booking-help">Select a day, tell us what you need, then choose an available time.</p>
          <div class="booking-form-grid">
            <div class="field">
              <label for="pt-date">Appointment date</label>
              <input class="input" id="pt-date" type="date" required>
            </div>
            <div class="field">
              <label for="pt-service">What is it for?</label>
              <select class="input" id="pt-service" required>
                <option value="" selected disabled>Choose a service</option>
                @foreach (config('clinic.services_public', []) ?? [] as $service)
                  @php($price = config('clinic.service_prices.' . $service))
                  <option value="{{ $service }}">{{ $service }}{{ $price ? ' — ' . $price : '' }}</option>
                @endforeach
              </select>
            </div>
          </div>
          <fieldset class="group booking-availability" aria-describedby="pt-availability-message">
            <legend class="group-label">Choose a doctor and chair</legend>
            <p class="availability-message" id="pt-availability-message" aria-live="polite"></p>
            <div class="available-slots" id="pt-chair-options" role="group" aria-label="Available doctors and chairs"></div>
            <div class="booking-time-options" id="pt-time-options" hidden>
              <h4>2. Choose an available time</h4>
              <div class="available-slots" id="pt-available-slots" role="group" aria-label="Available appointment times"></div>
            </div>
          </fieldset>
          <div class="booking-actions">
            <button class="btn btn-outline" data-booking-back type="button">Back</button>
            <button class="btn btn-primary" id="booking-next-review" type="button">Review booking</button>
          </div>
        </section>

        <section class="booking-step" data-booking-step="3" aria-labelledby="booking-step-three" hidden>
          <h3 id="booking-step-three">Review your appointment</h3>
          <p class="booking-help">Please check your details before confirming.</p>
          <dl class="booking-review">
            <div><dt>Patient</dt><dd id="review-patient"></dd></div>
            <div><dt>Cellphone</dt><dd id="review-phone"></dd></div>
            <div><dt>Email</dt><dd id="review-email"></dd></div>
            <div><dt>Date and time</dt><dd id="review-datetime"></dd></div>
            <div><dt>Service</dt><dd id="review-service"></dd></div>
            <div><dt>Dentist and chair</dt><dd id="review-chair"></dd></div>
          </dl>
          <fieldset class="booking-account-choice" id="booking-account-choice" aria-describedby="booking-account-help">
            <legend>Would you like a patient portal account?</legend>
            <div class="booking-account-options">
              <label>
                <input type="radio" name="account-requested" value="yes" required>
                Yes, I’m interested
              </label>
              <label>
                <input type="radio" name="account-requested" value="no" required>
                No, continue without one
              </label>
            </div>
            <p id="booking-account-help">An account isn’t required to book. Choosing Yes lets you create a portal account and complete your booking.</p>
          </fieldset>
          <div class="booking-actions">
            <button class="btn btn-outline" id="booking-back-review" type="button">Back</button>
            <button class="btn btn-primary" id="pt-submit" type="submit">Confirm appointment</button>
          </div>
        </section>

        <p id="booking-status" class="booking-status" role="status" aria-live="polite" hidden></p>
      </form>
    </section>
  </div>

  <div class="account-modal-overlay" id="account-modal" hidden>
    <section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
      <header class="account-modal-head">
        <div>
          <span class="booking-kicker">Optional</span>
          <h2 id="account-modal-title">Create a patient portal account</h2>
        </div>
        <button class="booking-close" id="account-modal-close" type="button" aria-label="Close account form">
          <span aria-hidden="true">&times;</span>
        </button>
      </header>
      <form class="account-form" id="account-create-form" novalidate>
        <p>Use a Gmail address and password for your account.</p>
        <div class="field">
          <label for="account-email">Gmail address</label>
          <input
            class="input"
            id="account-email"
            name="email"
            type="email"
            maxlength="254"
            autocomplete="email"
            inputmode="email"
            placeholder="you@gmail.com"
            pattern=".+@[Gg][Mm][Aa][Ii][Ll][.]com"
            required
          >
        </div>
        <div class="field">
          <label for="account-password">Password</label>
          <input
            class="input"
            id="account-password"
            name="password"
            type="password"
            autocomplete="new-password"
            maxlength="128"
            minlength="8"
            required
          >
          <small>Use at least 8 characters.</small>
        </div>
        <p class="account-form__status booking-status" id="account-form-status" role="status" aria-live="polite" hidden></p>
        <div class="booking-actions">
          <button class="btn btn-outline" id="account-modal-cancel" type="button">Not now</button>
          <button class="btn btn-primary" type="submit">Create account &amp; book</button>
        </div>
      </form>
    </section>
  </div>
  <p class="booking-success-toast" id="booking-success-toast" role="status" aria-live="polite" hidden></p>
</div>
