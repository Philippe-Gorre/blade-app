@extends('layouts.patient-portal')

@section('title', 'Patient Portal Preview - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/patient-portal-dashboard.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/patient-portal-dashboard.js') }}" defer></script>
@endpush

@section('content')
  <header class="patient-header">
    <div class="patient-header__inner">
      <a class="patient-brand" href="{{ route('patient-portal') }}">
        <span class="patient-brand__icon"><x-logo-mark :width="24" :height="18" stroke="#FFFFFF" /></span>
        <span>{{ config('app.name') }}</span>
      </a>
      <nav class="patient-tabs" aria-label="Patient portal">
        <button class="patient-tab is-active" type="button" data-main-tab="sessions" aria-pressed="true">Sessions</button>
        <button class="patient-tab" type="button" data-main-tab="payments" aria-pressed="false">Payments</button>
      </nav>
      <div class="patient-profile">
        <div>
          <strong id="portal-patient-name">Maria Reyes</strong>
          <span id="portal-patient-since">Patient since 2021</span>
        </div>
        <span class="patient-profile__avatar" id="portal-patient-avatar" aria-hidden="true">MR</span>
        <button class="patient-button patient-button--outline" type="button" id="portal-signout-btn" hidden>Sign out</button>
      </div>
    </div>
  </header>

  <main class="patient-portal">
    <div class="patient-portal__inner">
      <p class="patient-demo-notice" id="portal-demo-notice" role="note">
        Sample portal preview. This is not connected to a patient account; actions and sample records are not saved.
      </p>

      <section class="patient-view" id="sessions-view" aria-labelledby="sessions-heading">
        <h1 id="sessions-heading">Hi Maria, here is your next visit</h1>

        <article class="next-visit-card">
          <div class="date-tile date-tile--light" aria-label="Thursday, November 26">
            <span>Thu</span><strong>26</strong><span>Nov</span>
          </div>
          <div class="next-visit-card__details">
            <h2>Filling follow-up</h2>
            <p>9:30 am · Dr. Nguyen</p>
            <p>128 Willow Street, Suite 4</p>
          </div>
          <button class="patient-button patient-button--light" type="button" id="add-calendar">Add to calendar</button>
        </article>

        <div class="session-tabs" role="tablist" aria-label="Your visits">
          <button class="session-tab is-active" type="button" role="tab" id="upcoming-tab" aria-selected="true" aria-controls="upcoming-panel" data-session-tab="upcoming">Upcoming (2)</button>
          <button class="session-tab" type="button" role="tab" id="past-tab" aria-selected="false" aria-controls="past-panel" data-session-tab="past">Past</button>
          <button class="session-tab" type="button" role="tab" id="history-tab" aria-selected="false" aria-controls="history-panel" data-session-tab="history">Patient history</button>
        </div>

        <div class="session-panel" id="upcoming-panel" role="tabpanel" aria-labelledby="upcoming-tab" data-session-panel="upcoming">
          <article class="visit-card">
            <div class="date-tile"><span>Thu</span><strong>26</strong><span>Nov</span></div>
            <div class="visit-card__details">
              <div class="visit-card__title"><h2>Filling follow-up</h2><span class="status-pill status-pill--confirmed" data-visit-status="follow-up">Confirmed</span></div>
              <p>9:30 am · Dr. Nguyen</p>
              <p class="visit-note">You can eat normally beforehand. Please arrive 10 minutes early and bring your ID.</p>
            </div>
            <div class="visit-card__actions">
              <button class="patient-button patient-button--outline" type="button" data-reschedule="Filling follow-up">Reschedule</button>
            </div>
          </article>

          <article class="visit-card">
            <div class="date-tile"><span>Tue</span><strong>15</strong><span>Dec</span></div>
            <div class="visit-card__details">
              <div class="visit-card__title"><h2>Scale and polish</h2><span class="status-pill status-pill--confirm" data-visit-status="cleaning">Please confirm</span></div>
              <p>2:00 pm · Hygiene team</p>
              <p class="visit-note">No preparation needed. Brush as usual before you come.</p>
            </div>
            <div class="visit-card__actions">
              <button class="patient-button patient-button--dark" type="button" data-confirm-visit>Confirm visit</button>
              <button class="patient-button patient-button--outline" type="button" data-reschedule="Scale and polish">Reschedule</button>
            </div>
          </article>
          <p class="patient-cancel-note">Need to cancel? Call (555) 010-2200 at least 24 hours before your visit.</p>
        </div>

        <div class="session-panel" id="past-panel" role="tabpanel" aria-labelledby="past-tab" data-session-panel="past" hidden>
          <div class="past-visits">
            <article class="past-visit">
              <time datetime="2026-11-18">18 Nov</time>
              <div class="past-visit__body">
                <h2>Check-up and X-ray</h2><p>Dr. Nguyen · Completed</p>
                <div class="visit-note visit-note--expanded" data-visit-notes>
                  <strong>Notes from your dentist</strong>
                  <p>Teeth and gums look healthy. One small area on the lower left to keep an eye on. A follow-up filling was booked for 26 November.</p>
                  <button class="patient-button patient-button--outline" type="button" data-download-summary>Download visit summary</button>
                </div>
              </div>
              <button class="text-button" type="button" data-toggle-notes>Hide notes</button>
            </article>
            <article class="past-visit">
              <time datetime="2026-10-14">14 Oct</time>
              <div class="past-visit__body"><h2>Crown preparation</h2><p>Dr. Nguyen · Completed</p></div>
              <button class="text-button" type="button" data-toggle-notes>View notes</button>
            </article>
            <article class="past-visit">
              <time datetime="2026-09-02">2 Sep</time>
              <div class="past-visit__body"><h2>Filling, lower left</h2><p>Dr. Nguyen · Completed</p></div>
              <button class="text-button" type="button" data-toggle-notes>View notes</button>
            </article>
            <article class="past-visit">
              <time datetime="2026-05-18">18 May</time>
              <div class="past-visit__body"><h2>Check-up</h2><p>Dr. Nguyen · Completed</p></div>
              <button class="text-button" type="button" data-toggle-notes>View notes</button>
            </article>
          </div>
        </div>

        <div class="session-panel" id="history-panel" role="tabpanel" aria-labelledby="history-tab" data-session-panel="history" hidden>
          <div class="history-layout">
            <section class="history-card" aria-label="Visit history">
              <h2>2026</h2>
              <ul class="history-list">
                <li><span><strong>Check-up and X-ray</strong><small>Routine exam with digital X-rays.</small></span><time>18 Nov</time></li>
                <li><span><strong>Crown preparation</strong><small>Lower right molar. Temporary crown placed.</small></span><time>14 Oct</time></li>
                <li><span><strong>Filling</strong><small>Lower left, composite filling.</small></span><time>2 Sep</time></li>
                <li><span><strong>Check-up</strong><small>Routine exam.</small></span><time>18 May</time></li>
              </ul>
              <h2>2025</h2>
              <ul class="history-list">
                <li><span><strong>Scale and polish</strong><small>Hygienist visit.</small></span><time>12 Nov</time></li>
                <li><span><strong>Check-up</strong><small>Routine exam. First visit at the clinic.</small></span><time>20 May</time></li>
              </ul>
            </section>
            <aside class="history-aside">
              <section class="history-card">
                <h2>Your records</h2>
                <div class="record-row"><span>X-rays<small>18 Nov 2026</small></span><button class="patient-button patient-button--outline" type="button" data-demo-action="Records are not available in this sample preview.">Download</button></div>
              </section>
              <section class="due-card"><small>Next check-up due</small><strong>May 2027</strong><p>We will remind you by text a week before.</p></section>
            </aside>
          </div>
        </div>
      </section>

      <section class="patient-view" id="payments-view" aria-labelledby="payments-heading" hidden>
        <h1 id="payments-heading">Payments</h1>
        <p class="payments-subtitle">Sample figures. Your clinic sets the currency.</p>
        <div class="payment-overview">
          <section class="balance-card">
            <span>Outstanding balance</span>
            <strong>6,000.00</strong>
            <p>Next payment of 2,000.00 is due 1 Dec, in 6 days.</p>
            <div class="plan-progress">
              <div><span>Crown payment plan</span><span>3 of 6 paid</span></div>
              <progress value="3" max="6" aria-label="3 of 6 installments paid"></progress>
            </div>
          </section>
          <section class="pay-card">
            <h2>Pay your next installment</h2>
            <p>Choose how you would like to pay.</p>
            <div class="payment-methods" role="group" aria-label="Payment method">
              <button class="method-button is-active" type="button" aria-pressed="true" data-payment-method="Card">Card</button>
              <button class="method-button" type="button" aria-pressed="false" data-payment-method="Bank transfer">Bank transfer</button>
              <button class="method-button" type="button" aria-pressed="false" data-payment-method="E-wallet">E-wallet</button>
            </div>
            <button class="patient-button patient-button--dark pay-action" type="button" id="pay-next">Pay 2,000.00 by card</button>
            <p class="payment-fineprint">Sample screen only. No payment is processed or saved.</p>
          </section>
        </div>
        <div class="payment-lists">
          <section class="payment-list-card">
            <h2>Upcoming payments</h2>
            <div class="payment-row"><span><strong>1 Dec</strong><small>Crown plan, installment 4 of 6</small></span><span class="status-pill status-pill--confirm">Due next</span><strong>2,000.00</strong></div>
            <div class="payment-row"><span><strong>1 Jan</strong><small>Crown plan, installment 5 of 6</small></span><span class="status-pill status-pill--scheduled">Scheduled</span><strong>2,000.00</strong></div>
            <div class="payment-row"><span><strong>1 Feb</strong><small>Crown plan, installment 6 of 6</small></span><span class="status-pill status-pill--scheduled">Scheduled</span><strong>2,000.00</strong></div>
          </section>
          <section class="payment-list-card">
            <h2>Payment history</h2>
            <div class="payment-row"><span><strong>Check-up and X-ray</strong><small>18 Nov · Card</small></span><strong>800.00</strong><button class="patient-button patient-button--outline" type="button" data-demo-action="Receipts are not available in this sample preview.">Receipt</button></div>
            <div class="payment-row"><span><strong>Crown plan, installment 3 of 6</strong><small>1 Nov · Card</small></span><strong>2,000.00</strong><button class="patient-button patient-button--outline" type="button" data-demo-action="Receipts are not available in this sample preview.">Receipt</button></div>
            <div class="payment-row"><span><strong>Crown plan, installment 2 of 6</strong><small>1 Oct · Card</small></span><strong>2,000.00</strong><button class="patient-button patient-button--outline" type="button" data-demo-action="Receipts are not available in this sample preview.">Receipt</button></div>
            <div class="payment-row"><span><strong>Filling, lower left</strong><small>2 Sep · Card</small></span><strong>2,200.00</strong><button class="patient-button patient-button--outline" type="button" data-demo-action="Receipts are not available in this sample preview.">Receipt</button></div>
          </section>
        </div>
      </section>

      <p class="patient-toast" id="patient-toast" role="status" aria-live="polite" hidden></p>
    </div>
  </main>

  <dialog class="reschedule-dialog" id="reschedule-dialog" aria-labelledby="reschedule-title">
    <form id="reschedule-form">
      <button class="dialog-close" type="button" id="close-reschedule" aria-label="Close reschedule form">×</button>
      <h2 id="reschedule-title">Request a new visit time</h2>
      <p id="reschedule-visit-name"></p>
      <label for="reschedule-date">Preferred date</label>
      <input id="reschedule-date" type="date" required>
      <label for="reschedule-time">Preferred time</label>
      <select id="reschedule-time" required>
        <option value="">Choose a time</option>
        <option>Morning (9 am–12 pm)</option>
        <option>Afternoon (12–5 pm)</option>
      </select>
      <button class="patient-button patient-button--dark" type="submit">Send request</button>
      <p class="dialog-note">Sample preview only. This request will not be sent to the clinic.</p>
    </form>
  </dialog>
@endsection
