<div class="modal-overlay" id="appointment-modal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title">
    <div class="modal-head">
      <h2 id="appointment-modal-title">New appointment</h2>
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
    </div>
    <form id="appointment-form">
      <div class="field">
        <label for="appointment-patient">Patient name</label>
        <input id="appointment-patient" class="input" required maxlength="120" autocomplete="off" list="appointment-patients" placeholder="Choose or enter a patient">
        <datalist id="appointment-patients"></datalist>
      </div>
      <div class="field">
        <label for="appointment-service">Service / Treatment</label>
        <select id="appointment-service" class="input">
          @foreach (config('clinic.services_staff') as $service)
            <option>{{ $service }}</option>
          @endforeach
        </select>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="appointment-date">Date</label>
          <input id="appointment-date" class="input" type="date" required>
        </div>
        <div class="field">
          <label for="appointment-time">Time</label>
          <select id="appointment-time" class="input">
            @foreach (config('clinic.time_slots') as $slot)
              <option>{{ $slot }}</option>
            @endforeach
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="appointment-chair">Chair</label>
          <select id="appointment-chair" class="input">
            @foreach (config('clinic.chairs') as $chair)
              <option value="{{ $chair['id'] }}">{{ $chair['name'] }} – {{ $chair['dentist'] }}</option>
            @endforeach
          </select>
        </div>
        <div class="field">
          <label for="appointment-status">Status</label>
          <select id="appointment-status" class="input">
            @foreach (config('clinic.statuses') as $key => $label)
              <option value="{{ $key }}">{{ $label }}</option>
            @endforeach
          </select>
        </div>
      </div>
      <p class="form-error" id="appointment-error" role="alert" hidden></p>
      <div class="modal-actions">
        <button type="submit" class="btn btn--primary">Save appointment</button>
        <button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
      </div>
    </form>
  </div>
</div>
