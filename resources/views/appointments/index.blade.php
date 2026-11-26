@extends('layouts.staff')

@section('title', 'Appointments – ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/appointments.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/appointments.js') }}" defer></script>
@endpush

@section('content')
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Appointments</h1>
        <p class="muted" id="appointment-summary"></p>
      </div>
      <button class="btn btn--primary" type="button" id="new-appointment">
        <span aria-hidden="true">＋</span> New appointment
      </button>
    </div>

    <div class="appointment-layout">
      <aside class="sidebar">
        <section class="panel calendar-panel" aria-label="Calendar">
          <div class="month-head">
            <h2 id="calendar-month"></h2>
            <div class="round-actions">
              <button type="button" class="round-btn" id="prev-month" aria-label="Previous month">‹</button>
              <button type="button" class="round-btn" id="next-month" aria-label="Next month">›</button>
            </div>
          </div>
          <div class="calendar-weekdays" aria-hidden="true">
            @foreach (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as $weekday)
              <span>{{ $weekday }}</span>
            @endforeach
          </div>
          <div class="mini-calendar" id="mini-calendar"></div>
        </section>
      </aside>

      <section class="schedule-panel" aria-label="Appointment schedule">
        <div class="schedule-toolbar">
          <div class="date-navigation">
            <button type="button" class="round-btn" id="prev-day" aria-label="Previous day">‹</button>
            <h2 id="selected-date"></h2>
            <button type="button" class="round-btn" id="next-day" aria-label="Next day">›</button>
            <button type="button" class="today-btn" id="go-today">Today</button>
          </div>
          <div class="view-toggle" role="group" aria-label="Calendar view">
            <button type="button" class="is-active" id="day-view" aria-pressed="true">Day</button>
            <button type="button" id="week-view" aria-pressed="false">Week</button>
          </div>
        </div>

        <div class="legend" aria-label="Appointment status legend">
          <span><i class="legend-dot status-confirmed"></i>Confirmed</span>
          <span><i class="legend-dot status-checked-in"></i>Checked in</span>
          <span><i class="legend-dot status-emergency"></i>Emergency</span>
          <span><i class="legend-dot status-completed"></i>Completed</span>
          <span><i class="legend-dot status-open"></i>Open</span>
        </div>

        <div class="chair-grid-wrap" id="day-view-panel">
          <div class="chair-grid" id="day-grid"></div>
        </div>
        <div class="week-grid" id="week-view-panel" hidden></div>
      </section>
    </div>
  </main>

  <div class="toast" id="toast" role="status" hidden></div>
@endsection

@push('modals')
  @include('appointments.new-modal')
  @include('appointments.manage-modal')
@endpush
