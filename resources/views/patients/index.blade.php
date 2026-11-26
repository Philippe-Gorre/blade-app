@extends('layouts.staff')

@section('title', 'Patients – ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/patient-tab.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/patients.js') }}" defer></script>
@endpush

@section('content')
  <main class="page">

    {{-- Heading row --}}
    <div class="page-head">
      <div class="page-head__text">
        <h1>Patients</h1>
        <p class="muted">Manage patient records and upcoming visits.</p>
      </div>
      <button class="btn btn--primary btn--add" type="button" id="add-patient-btn">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"></path></svg>
        Add patient
      </button>
    </div>

    {{-- Search + filter chips --}}
    <div class="toolbar">
      <div class="search-box">
        <svg class="search-box__icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#5B5476" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"></circle><path d="M13 13l4 4"></path></svg>
        <input class="search-box__input" type="search" id="patient-search" placeholder="Search by name or phone" autocomplete="off">
      </div>
      <div class="filter-chips" id="filter-chips">
        <button class="fchip is-active" data-filter="all" type="button">All <span class="fchip__count" id="count-all">8</span></button>
        <button class="fchip" data-filter="today" type="button">Visiting today <span class="fchip__count" id="count-today">5</span></button>
        <button class="fchip" data-filter="new" type="button">New patients <span class="fchip__count" id="count-new">2</span></button>
      </div>
    </div>

    {{-- Content area: table + detail panel --}}
    <div class="content">

      <div class="patient-table-wrap">
        <table class="patient-table" id="patient-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Last visit</th>
              <th>Next visit</th>
              <th>Status</th>
            </tr>
          </thead>
          {{-- Filled by patients.js --}}
          <tbody id="patient-tbody"></tbody>
        </table>
      </div>

      {{-- Filled by patients.js --}}
      <aside class="detail-panel" id="detail-panel" hidden></aside>

    </div>
  </main>

  <div class="toast" id="toast" role="status" hidden></div>
@endsection

@push('modals')
  @include('patients.add-modal')
@endpush
