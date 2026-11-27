@extends('layouts.staff')

@section('title', 'In-session - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/dashboard.css') }}">
  <link rel="stylesheet" href="{{ asset('styles/in-session.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/in-session.js') }}" defer></script>
@endpush

@section('content')
  <main class="doctor-page">
    <header class="doctor-page__head">
      <div>
        <p class="doctor-eyebrow">Doctor workspace</p>
        <h1>In-session</h1>
        <p class="doctor-muted" id="doctor-today"></p>
        <p class="doctor-muted">Prototype workspace: patient details and X-ray files are stored in this browser only, not on a shared clinic server.</p>
      </div>
      <a class="doctor-link" href="{{ route('dashboard', ['workspace' => 'doctor']) }}">View today’s schedule</a>
    </header>

    <section class="doctor-panel" aria-labelledby="lunch-title">
      <div class="doctor-panel__head">
        <div>
          <h2 id="lunch-title">Lunch break</h2>
          <p class="doctor-muted">Block a time slot on today’s schedule (8:00 am – 5:00 pm). This displays on the Dashboard and prevents bookings during your lunch.</p>
        </div>
      </div>
      <form id="lunch-form" class="doctor-lunch-form" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 12px;">
        <label style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600;">
          Doctor / Chair
          <select id="lunch-chair" class="modal__input" style="min-width: 200px;">
            @forelse ($clinicChairs ?? [] as $chair)
              <option value="{{ $chair['id'] }}" @selected(isset($currentStaff) && $currentStaff['id'] === $chair['doctorId'])>
                {{ $chair['name'] }} – {{ $chair['dentist'] }}
              </option>
            @empty
              <option value="" disabled selected>No doctors registered</option>
            @endforelse
          </select>
        </label>
        <label style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600;">
          Lunch time
          <select id="lunch-time" class="modal__input" style="min-width: 150px;">
            @foreach (config('clinic.time_slots', []) as $slot)
              <option value="{{ $slot }}" @selected($slot === '12:00 pm')>{{ $slot }}</option>
            @endforeach
          </select>
        </label>
        <button class="doctor-button" type="submit" id="take-lunch-btn">Take lunch break</button>
      </form>
      <div class="doctor-list" id="lunch-list"></div>
    </section>

    <section class="doctor-panel" aria-labelledby="ready-title">
      <div class="doctor-panel__head">
        <div>
          <h2 id="ready-title">Ready for you</h2>
          <p class="doctor-muted">Patients seated by the front desk appear here.</p>
        </div>
        <span class="doctor-count" id="ready-count">0</span>
      </div>
      <div class="doctor-list" id="ready-patients"></div>
    </section>

    <section class="doctor-panel" aria-labelledby="sessions-title">
      <div class="doctor-panel__head">
        <div>
          <h2 id="sessions-title">Active sessions</h2>
          <p class="doctor-muted">Review patient details, treatment, X-rays, and payment.</p>
        </div>
        <span class="doctor-count" id="session-count">0</span>
      </div>
      <div class="doctor-sessions" id="active-sessions"></div>
    </section>

    <section class="doctor-panel" aria-labelledby="completed-title">
      <div class="doctor-panel__head">
        <div>
          <h2 id="completed-title">Completed today</h2>
          <p class="doctor-muted">Enter each treatment amount here to send it to the front desk for collection.</p>
        </div>
        <span class="doctor-count" id="completed-count">0</span>
      </div>
      <div class="doctor-list" id="completed-sessions"></div>
    </section>
  </main>

  <div class="doctor-modal-overlay" id="start-session-modal" hidden>
    <section class="doctor-modal" role="dialog" aria-modal="true" aria-labelledby="start-session-title">
      <div class="doctor-modal__head">
        <h2 id="start-session-title">Start patient session?</h2>
        <button class="doctor-icon-button" id="close-start-session" type="button" aria-label="Close">×</button>
      </div>
      <p id="start-session-summary"></p>
      <div class="doctor-modal__actions">
        <button class="doctor-button doctor-button--secondary" id="cancel-start-session" type="button">Not yet</button>
        <button class="doctor-button" id="confirm-start-session" type="button">Start session</button>
      </div>
    </section>
  </div>
@endsection
