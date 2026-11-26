@extends('layouts.staff')

@section('title', 'Reports - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/staff-workspace.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/staff-workspace.js') }}" defer></script>
@endpush

@section('content')
  <main class="workspace-page" data-workspace-page="reports">
    <header class="workspace-heading">
      <div>
        <h1>Reports</h1>
        <p>Live clinic summary from saved appointments, patients, and billing.</p>
      </div>
      <button class="workspace-button workspace-button--outline" type="button" id="download-report">Download CSV</button>
    </header>

    <div class="report-periods" role="group" aria-label="Report period">
      <button class="workspace-chip is-active" type="button" data-report-period="week" aria-pressed="true">This week</button>
      <button class="workspace-chip" type="button" data-report-period="month" aria-pressed="false">This month</button>
      <button class="workspace-chip" type="button" data-report-period="quarter" aria-pressed="false">This quarter</button>
    </div>

    <section class="summary-cards report-summary" aria-label="Report summary">
      <article class="summary-card summary-card--purple"><span>Appointments</span><strong data-report-stat="appointments">75</strong></article>
      <article class="summary-card"><span>No-show rate</span><strong data-report-stat="noShow">4.0%</strong></article>
      <article class="summary-card"><span>New patients</span><strong data-report-stat="newPatients">6</strong></article>
      <article class="summary-card summary-card--lavender"><span>Chair time used</span><strong data-report-stat="chairTime">78%</strong></article>
    </section>

    <div class="workspace-columns report-columns">
      <section class="workspace-card report-chart-card">
        <h2>Appointments by day</h2>
        <div class="bar-chart" role="img" aria-label="Appointments for each day this week">
          <div class="bar-chart__item" data-day="Mon"><strong data-bar-value>14</strong><span class="bar-chart__bar" style="--bar-height:70%"></span><small>Mon</small></div>
          <div class="bar-chart__item" data-day="Tue"><strong data-bar-value>16</strong><span class="bar-chart__bar" style="--bar-height:80%"></span><small>Tue</small></div>
          <div class="bar-chart__item" data-day="Wed"><strong data-bar-value>10</strong><span class="bar-chart__bar" style="--bar-height:50%"></span><small>Wed</small></div>
          <div class="bar-chart__item" data-day="Thu"><strong data-bar-value>12</strong><span class="bar-chart__bar" style="--bar-height:60%"></span><small>Thu</small></div>
          <div class="bar-chart__item" data-day="Fri"><strong data-bar-value>15</strong><span class="bar-chart__bar" style="--bar-height:75%"></span><small>Fri</small></div>
          <div class="bar-chart__item" data-day="Sat"><strong data-bar-value>8</strong><span class="bar-chart__bar" style="--bar-height:40%"></span><small>Sat</small></div>
        </div>
      </section>

      <section class="workspace-card treatment-chart-card">
        <h2>Visits by treatment</h2>
        <div class="treatment-bars">
          <div class="treatment-row" data-treatment="Check-ups and cleans"><div><span>Check-ups and cleans</span><strong>40%</strong></div><progress value="40" max="45">40%</progress></div>
          <div class="treatment-row" data-treatment="Fillings"><div><span>Fillings</span><strong>20%</strong></div><progress value="20" max="45">20%</progress></div>
          <div class="treatment-row" data-treatment="Whitening"><div><span>Whitening</span><strong>12%</strong></div><progress value="12" max="45">12%</progress></div>
          <div class="treatment-row" data-treatment="Aligners"><div><span>Aligners</span><strong>8%</strong></div><progress value="8" max="45">8%</progress></div>
          <div class="treatment-row" data-treatment="Crowns and implants"><div><span>Crowns and implants</span><strong>12%</strong></div><progress value="12" max="45">12%</progress></div>
          <div class="treatment-row" data-treatment="Other"><div><span>Other</span><strong>8%</strong></div><progress value="8" max="45">8%</progress></div>
        </div>
      </section>
    </div>
    <p class="workspace-toast" id="workspace-toast" role="status" aria-live="polite" hidden></p>
  </main>
@endsection
