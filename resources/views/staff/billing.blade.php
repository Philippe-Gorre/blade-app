@extends('layouts.staff')

@section('title', 'Billing - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/staff-workspace.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/staff-workspace.js') }}" defer></script>
@endpush

@section('content')
  <main class="workspace-page" data-workspace-page="billing">
    <header class="workspace-heading">
      <div>
        <h1>Billing</h1>
        <p>Collect doctor-submitted treatment charges and review completed transactions.</p>
      </div>
      <button class="workspace-button workspace-button--dark" type="button" id="new-invoice">New invoice</button>
    </header>

    <section class="summary-cards" aria-label="Billing summary">
      <article class="summary-card summary-card--purple"><span>Collected today</span><strong id="billing-collected">0.00</strong></article>
      <article class="summary-card"><span>Outstanding</span><strong id="billing-outstanding">0.00</strong></article>
      <article class="summary-card summary-card--amber"><span>Overdue invoices</span><strong id="billing-overdue">0</strong></article>
      <article class="summary-card summary-card--lavender"><span>On payment plans</span><strong id="billing-plans">0</strong></article>
    </section>

    <div class="workspace-columns billing-columns">
      <div class="billing-list-stack">
        <section class="workspace-card invoice-list-card" aria-label="Payments to collect">
          <h2 class="invoice-list-title">Payments to collect</h2>
          <div class="invoice-table-head"><span>Invoice</span><span>Patient</span><span>Amount</span><span>Status</span></div>
          <div class="invoice-list" id="invoice-pending-list"></div>
        </section>

        <section class="workspace-card invoice-list-card" aria-label="Completed transactions">
          <h2 class="invoice-list-title">Completed transactions</h2>
          <div class="invoice-table-head"><span>Invoice</span><span>Patient</span><span>Amount</span><span>Status</span></div>
          <div class="invoice-list" id="invoice-list"></div>
        </section>
      </div>

      <aside class="workspace-card invoice-detail" aria-live="polite">
        <div class="invoice-detail__heading">
          <div><h2 id="detail-patient">No transaction selected</h2><span id="detail-invoice"></span></div>
          <span class="invoice-status" id="detail-status">—</span>
        </div>
        <div class="invoice-items" id="invoice-items"></div>
        <div class="invoice-total"><strong>Total</strong><strong id="detail-total">0.00</strong></div>
        <fieldset class="method-picker">
          <legend>Payment method</legend>
          <div class="method-picker__buttons">
            <button type="button" class="workspace-chip" data-billing-method="Cash" aria-pressed="false">Cash</button>
            <button type="button" class="workspace-chip" data-billing-method="Card" aria-pressed="false">Card</button>
            <button type="button" class="workspace-chip" data-billing-method="Bank transfer" aria-pressed="false">Bank transfer</button>
            <button type="button" class="workspace-chip" data-billing-method="Insurance" aria-pressed="false">Insurance</button>
          </div>
        </fieldset>
        <button class="workspace-button workspace-button--dark invoice-pay" type="button" id="take-payment" disabled>Take payment</button>
        <div class="invoice-detail__actions">
          <button class="workspace-button workspace-button--outline" type="button" id="setup-plan-btn">Set up payment plan</button>
          <button class="workspace-button workspace-button--outline" type="button" id="print-invoice">Print invoice</button>
        </div>
        <p class="workspace-disclaimer">Doctor-submitted charges stay here until the front desk records payment.</p>
      </aside>
    </div>
    <p class="workspace-toast" id="workspace-toast" role="status" aria-live="polite" hidden></p>
  </main>

  <dialog class="workspace-dialog" id="invoice-dialog" aria-labelledby="invoice-dialog-title">
    <form id="invoice-form">
      <button class="workspace-dialog__close" type="button" data-close-dialog aria-label="Close">×</button>
      <h2 id="invoice-dialog-title">New invoice</h2>
      <p>Create an invoice for a patient.</p>
      <label for="invoice-patient">Patient</label>
      <input id="invoice-patient" list="invoice-patients-list" autocomplete="off" required maxlength="100">
      <datalist id="invoice-patients-list"></datalist>
      <label for="invoice-service">Service</label>
      <input id="invoice-service" list="invoice-service-list" required maxlength="100">
      <datalist id="invoice-service-list"></datalist>
      <label for="invoice-amount">Amount</label>
      <input id="invoice-amount" type="number" min="0.01" step="0.01" required>
      <button class="workspace-button workspace-button--dark" type="submit">Save invoice</button>
    </form>
  </dialog>
@endsection
