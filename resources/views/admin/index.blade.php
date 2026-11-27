@extends('layouts.staff')

@section('title', ucfirst($section) . ' - Admin - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/staff-workspace.css') }}">
  <link rel="stylesheet" href="{{ asset('styles/admin.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/admin.js') }}?v={{ filemtime(public_path('Javascript/admin.js')) }}" defer></script>
@endpush

@section('content')
  <main class="workspace-page admin-page" data-admin-page="{{ $section }}">
    @if ($section === 'services')
      @php
        $initialServices = array_values(array_unique(array_merge(
            config('clinic.services_public', []),
            config('clinic.services_staff', [])
        )));
      @endphp
      <header class="workspace-heading">
        <div>
          <h1>Services</h1>
          <p>Create clinic services, prices, and treatment session plans.</p>
        </div>
      </header>

      <section class="workspace-card admin-form-card" aria-labelledby="service-form-title">
        <div>
          <h2 id="service-form-title">Add a service</h2>
          <p>Services start with one session. Set a longer course and a default gap for follow-up sessions when needed.</p>
        </div>
        <form
          class="admin-inline-form"
          id="admin-service-form"
          data-initial-services='{{ json_encode($initialServices, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP) }}'
        >
          <label>
            <span>Service name</span>
            <input id="admin-service-name" name="name" type="text" maxlength="100" required>
          </label>
          <label>
            <span>Price (₱)</span>
            <input id="admin-service-price" name="price" type="number" min="0.01" step="0.01" required>
          </label>
          <label>
            <span>Number of sessions</span>
            <input id="admin-service-sessions" name="sessions" type="number" min="1" max="50" step="1" value="1" required>
          </label>
          <label>
            <span>Default gap between sessions</span>
            <input id="admin-service-gap" name="gapValue" type="number" min="1" max="365" step="1" value="4" required>
          </label>
          <label>
            <span>Gap unit</span>
            <select id="admin-service-gap-unit" name="gapUnit" required>
              <option value="days">Days</option>
              <option value="weeks" selected>Weeks</option>
              <option value="months">Months</option>
            </select>
          </label>
          <button class="workspace-button workspace-button--dark" type="submit">Add service</button>
        </form>
      </section>

      <section class="workspace-card admin-table-card" aria-label="Clinic services">
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead><tr><th>Service</th><th>Price</th><th>Sessions</th><th>Default gap</th><th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody id="admin-services-list"></tbody>
          </table>
        </div>
      </section>

    @elseif ($section === 'revenue')
      <header class="workspace-heading">
        <div>
          <h1>Revenue</h1>
          <p>Revenue summary based on paid invoices in this browser.</p>
        </div>
      </header>

      <section class="summary-cards admin-summary-cards" aria-label="Revenue summary">
        <article class="summary-card summary-card--purple"><span>Collected today</span><strong id="admin-revenue-today">₱0.00</strong></article>
        <article class="summary-card summary-card--lavender"><span>Collected this month</span><strong id="admin-revenue-month">₱0.00</strong></article>
        <article class="summary-card"><span>Outstanding invoices</span><strong id="admin-revenue-outstanding">₱0.00</strong></article>
        <article class="summary-card summary-card--amber"><span>Paid invoices</span><strong id="admin-revenue-paid-count">0</strong></article>
      </section>

      <section class="workspace-card admin-table-card">
        <h2>Revenue by service</h2>
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead><tr><th>Service</th><th>Invoices with payments</th><th>Revenue</th></tr></thead>
            <tbody id="admin-revenue-services"></tbody>
          </table>
        </div>
      </section>
      <p class="admin-demo-note">Revenue is calculated from locally saved billing data and is not shared across devices.</p>

    @else
      <header class="workspace-heading">
        <div>
          <h1>Accounts</h1>
          <p>Create staff profiles and assign a workspace level.</p>
        </div>
      </header>

      <section class="workspace-card admin-form-card" aria-labelledby="account-form-title">
        <div>
          <h2 id="account-form-title">Create a staff account</h2>
          <p>Choose whether this staff member uses the front desk or doctor workspace.</p>
        </div>
        <form class="admin-inline-form admin-account-form" id="admin-account-form" data-accounts-url="{{ route('admin.staff-accounts.index') }}">
          <label>
            <span>Full name</span>
            <input id="admin-account-name" name="name" type="text" maxlength="100" autocomplete="name" required>
          </label>
          <label>
            <span>Email address</span>
            <input id="admin-account-email" name="email" type="email" maxlength="254" autocomplete="email" required>
          </label>
          <label>
            <span>Password</span>
            <input id="admin-account-password" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required>
          </label>
          <label>
            <span>Access level</span>
            <select id="admin-account-role" name="role" required>
              <option value="front_desk">Front desk</option>
              <option value="doctor">Doctor</option>
            </select>
          </label>
          <button class="workspace-button workspace-button--dark" type="submit">Create account</button>
        </form>
      </section>

      <section class="workspace-card admin-table-card" aria-label="Staff accounts">
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Access level</th><th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody id="admin-accounts-list"></tbody>
          </table>
        </div>
      </section>
      <p class="admin-demo-note">Staff accounts are stored securely on the server and can sign in through the patient portal.</p>
    @endif
    <p class="workspace-toast" id="admin-toast" role="status" aria-live="polite" hidden></p>
  </main>
@endsection
