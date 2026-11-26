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
        <p>Manage clinic invoices, payments, and payment plans.</p>
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
      <section class="workspace-card invoice-list-card" aria-label="Invoices">
        <div class="invoice-table-head"><span>Invoice</span><span>Patient</span><span>Amount</span><span>Status</span></div>
        <div class="invoice-list" id="invoice-list">
          <button class="invoice-row" type="button" data-invoice-id="INV-1041" data-patient="Bea Santos" data-service="Extraction" data-amount="1850" data-status="Overdue" data-item-one="Extraction" data-item-one-amount="1850">
            <span class="invoice-number">INV-1041</span><span class="invoice-patient"><strong>Bea Santos</strong><small>Extraction</small></span><strong class="invoice-amount">1,850.00</strong><span class="invoice-status invoice-status--overdue">Overdue</span>
          </button>
          <button class="invoice-row" type="button" data-invoice-id="INV-1042" data-patient="Jon Dela Cruz" data-service="Whitening" data-amount="4500" data-status="Paid" data-item-one="Whitening" data-item-one-amount="4500">
            <span class="invoice-number">INV-1042</span><span class="invoice-patient"><strong>Jon Dela Cruz</strong><small>Whitening</small></span><strong class="invoice-amount">4,500.00</strong><span class="invoice-status invoice-status--paid">Paid</span>
          </button>
          <button class="invoice-row is-selected" type="button" data-invoice-id="INV-1043" data-patient="Luis Garcia" data-service="Filling" data-amount="2200" data-status="Due" data-item-one="Filling" data-item-one-amount="2000" data-item-two="Local anaesthetic" data-item-two-amount="200">
            <span class="invoice-number">INV-1043</span><span class="invoice-patient"><strong>Luis Garcia</strong><small>Filling</small></span><strong class="invoice-amount">2,200.00</strong><span class="invoice-status invoice-status--due">Due</span>
          </button>
          <button class="invoice-row" type="button" data-invoice-id="INV-1044" data-patient="Maria Reyes" data-service="Check-up" data-amount="800" data-status="Paid" data-item-one="Check-up" data-item-one-amount="800">
            <span class="invoice-number">INV-1044</span><span class="invoice-patient"><strong>Maria Reyes</strong><small>Check-up</small></span><strong class="invoice-amount">800.00</strong><span class="invoice-status invoice-status--paid">Paid</span>
          </button>
          <button class="invoice-row" type="button" data-invoice-id="INV-1045" data-patient="Ana Villar" data-service="Crown" data-amount="12000" data-status="Plan" data-item-one="Crown" data-item-one-amount="12000">
            <span class="invoice-number">INV-1045</span><span class="invoice-patient"><strong>Ana Villar</strong><small>Crown</small></span><strong class="invoice-amount">12,000.00</strong><span class="invoice-status invoice-status--plan">Plan</span>
          </button>
          <button class="invoice-row" type="button" data-invoice-id="INV-1046" data-patient="Aya Tan" data-service="Cleaning" data-amount="1200" data-status="Paid" data-item-one="Cleaning" data-item-one-amount="1200">
            <span class="invoice-number">INV-1046</span><span class="invoice-patient"><strong>Aya Tan</strong><small>Cleaning</small></span><strong class="invoice-amount">1,200.00</strong><span class="invoice-status invoice-status--paid">Paid</span>
          </button>
        </div>
      </section>

      <aside class="workspace-card invoice-detail" aria-live="polite">
        <div class="invoice-detail__heading">
          <div><h2 id="detail-patient">Luis Garcia</h2><span id="detail-invoice">INV-1043</span></div>
          <span class="invoice-status invoice-status--due" id="detail-status">Due</span>
        </div>
        <div class="invoice-items" id="invoice-items">
          <div><span>Filling</span><strong>2,000.00</strong></div>
          <div><span>Local anaesthetic</span><strong>200.00</strong></div>
        </div>
        <div class="invoice-total"><strong>Total</strong><strong id="detail-total">2,200.00</strong></div>
        <fieldset class="method-picker">
          <legend>Payment method</legend>
          <div class="method-picker__buttons">
            <button type="button" class="workspace-chip" data-billing-method="Cash" aria-pressed="false">Cash</button>
            <button type="button" class="workspace-chip is-active" data-billing-method="Card" aria-pressed="true">Card</button>
            <button type="button" class="workspace-chip" data-billing-method="Bank transfer" aria-pressed="false">Bank transfer</button>
            <button type="button" class="workspace-chip" data-billing-method="Insurance" aria-pressed="false">Insurance</button>
          </div>
        </fieldset>
        <button class="workspace-button workspace-button--dark invoice-pay" type="button" id="take-payment">Take payment of 2,200.00 by card</button>
        <div class="invoice-detail__actions">
          <button class="workspace-button workspace-button--outline" type="button" id="setup-plan-btn">Set up payment plan</button>
          <button class="workspace-button workspace-button--outline" type="button" id="print-invoice">Print invoice</button>
        </div>
        <p class="workspace-disclaimer">Invoices and payments sync with the patient portal and clinic records.</p>
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
      <input id="invoice-service" required maxlength="100">
      <label for="invoice-amount">Amount</label>
      <input id="invoice-amount" type="number" min="0.01" step="0.01" required>
      <button class="workspace-button workspace-button--dark" type="submit">Save invoice</button>
    </form>
  </dialog>
@endsection
