<div class="modal-overlay" id="manage-modal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="manage-title">
    <div class="modal-head">
      <h2 id="manage-title">Appointment details</h2>
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
    </div>
    <div class="manage-details">
      <strong id="manage-patient"></strong>
      <span class="muted" id="manage-info"></span>
      <span id="manage-service"></span>
    </div>
    <div class="field" id="manage-status-field">
      <label for="manage-status">Status</label>
      <select id="manage-status" class="input">
        @foreach (config('clinic.statuses') as $key => $label)
          <option value="{{ $key }}">{{ $label }}</option>
        @endforeach
      </select>
    </div>
    <form id="manage-reschedule-form" style="padding: 12px; border-radius: 12px; background: #F7F4FF; border: 1px solid #D9CFF7;" hidden>
      <div class="form-row">
        <div class="field">
          <label for="manage-reschedule-date">New date</label>
          <input id="manage-reschedule-date" class="input" type="date" required>
        </div>
        <div class="field">
          <label for="manage-reschedule-time">New time</label>
          <select id="manage-reschedule-time" class="input" required>
            <option value="">Choose an available time</option>
            @foreach (config('clinic.time_slots') as $slot)
              <option value="{{ $slot }}">{{ $slot }}</option>
            @endforeach
          </select>
        </div>
      </div>
      <div class="field">
        <label for="manage-reschedule-chair">Chair</label>
        <select id="manage-reschedule-chair" class="input">
          @forelse ($clinicChairs ?? [] as $chair)
            <option value="{{ $chair['id'] }}">{{ $chair['name'] }} – {{ $chair['dentist'] }}</option>
          @empty
            <option value="" disabled selected>No doctors registered</option>
          @endforelse
        </select>
      </div>
      <p class="form-error" id="manage-reschedule-error" role="alert" hidden></p>
      <div class="modal-actions">
        <button type="submit" class="btn btn--primary">Confirm reschedule</button>
        <button type="button" class="btn btn--outline" id="cancel-reschedule-appt">Back</button>
      </div>
    </form>
    <div class="modal-actions">
      <button type="button" class="btn btn--primary" id="save-status">Save status</button>
      <button type="button" class="btn btn--outline" id="open-reschedule-appt">Reschedule</button>
      <button type="button" class="btn btn--danger" id="cancel-appointment">Cancel appointment</button>
      <button type="button" class="btn btn--outline" data-close-modal>Close</button>
    </div>
  </div>
</div>
