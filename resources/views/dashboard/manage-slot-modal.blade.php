<div class="modal-overlay modal-overlay--manage" id="modal-manage-slot" hidden>
  <div class="modal" role="dialog" aria-labelledby="manage-slot-title" aria-modal="true">
    <div class="modal__head">
      <h2 id="manage-slot-title">Appointment details</h2>
      <button class="modal__close" type="button" id="close-manage-modal" aria-label="Close">✕</button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h3 id="manage-patient-name" style="font-size: 20px;">Patient Name</h3>
        <span id="manage-patient-status" class="pill pill--green">Confirmed</span>
      </div>
      <p class="muted" id="manage-slot-info" style="font-size: 14px;">11:00 am • Chair 1 (Dr. Mora)</p>
      <p style="font-weight: 600;" id="manage-service-name">Whitening</p>
    </div>
    <div class="manage-patient-preview">
      <section aria-labelledby="manage-patient-info-title">
        <h3 class="modal__section-title" id="manage-patient-info-title">Patient information</h3>
        <dl class="manage-patient-info" id="manage-patient-info"></dl>
      </section>
      <section aria-labelledby="manage-patient-note-title">
        <h3 class="modal__section-title" id="manage-patient-note-title">Notes</h3>
        <p class="manage-patient-note" id="manage-patient-note">No notes recorded.</p>
      </section>
      <section id="manage-patient-xrays-section" aria-labelledby="manage-patient-xrays-title" hidden>
        <h3 class="modal__section-title" id="manage-patient-xrays-title">X-rays</h3>
        <div class="manage-patient-xrays" id="manage-patient-xrays"></div>
      </section>
    </div>
    <form class="reschedule-panel" id="reschedule-slot-form" hidden>
      <h3 class="modal__section-title">Reschedule appointment</h3>
      <div class="modal__row">
        <div class="modal__field">
          <label for="reschedule-slot-date">New date</label>
          <input class="modal__input" type="date" id="reschedule-slot-date" required>
        </div>
        <div class="modal__field">
          <label for="reschedule-slot-time">New time</label>
          <select class="modal__input" id="reschedule-slot-time">
            @foreach (config('clinic.time_slots') as $slot)
              <option>{{ $slot }}</option>
            @endforeach
          </select>
        </div>
      </div>
      <div class="modal__field">
        <label for="reschedule-slot-chair">Chair</label>
        <select class="modal__input" id="reschedule-slot-chair">
          @foreach (config('clinic.chairs') as $chair)
            <option value="{{ $chair['id'] }}">{{ $chair['name'] }} – {{ $chair['dentist'] }}</option>
          @endforeach
        </select>
      </div>
      <div class="modal__actions">
        <button class="btn btn--primary" type="submit">Save new time</button>
        <button class="btn btn--outline" type="button" id="btn-cancel-reschedule">Back</button>
      </div>
    </form>

    <div class="modal__actions">
      <button class="btn btn--primary" type="button" id="btn-checkin-slot">Check in patient</button>
      <button class="btn btn--primary" type="button" id="btn-seat-slot">Seat patient for doctor</button>
      <button class="btn btn--outline" type="button" id="btn-reschedule-slot">Reschedule</button>
      <a class="btn btn--primary" href="{{ route('in-session.index') }}" id="btn-open-insession" style="display: none; text-decoration: none;">Open in Doctor workspace</a>
      <button class="btn btn--danger" type="button" id="btn-cancel-slot">Cancel appointment</button>
      <button class="btn btn--outline" type="button" id="btn-close-manage">Close</button>
    </div>
  </div>
</div>
