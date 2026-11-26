@extends('layouts.staff')

@section('title', 'Recalls - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/staff-workspace.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/staff-workspace.js') }}" defer></script>
@endpush

@section('content')
  <main class="workspace-page" data-workspace-page="recalls">
    <header class="workspace-heading">
      <div>
        <h1>Recalls</h1>
        <p>Patients due for their next check-up or cleaning.</p>
      </div>
      <button class="workspace-button workspace-button--dark" type="button" id="send-all-reminders">Send all in this list</button>
    </header>

    <div class="recall-filters" role="tablist" aria-label="Recall due date">
      <button class="workspace-chip is-active" type="button" role="tab" aria-selected="true" data-recall-filter="overdue">Overdue (3)</button>
      <button class="workspace-chip" type="button" role="tab" aria-selected="false" data-recall-filter="month">Due this month (3)</button>
      <button class="workspace-chip" type="button" role="tab" aria-selected="false" data-recall-filter="upcoming">Upcoming (3)</button>
    </div>

    <div class="workspace-columns recall-columns">
      <section class="workspace-card recall-list-card">
        <div class="recall-table-head"><span>Patient</span><span>Last visit</span><span>Due</span><span>Reminder</span></div>
        <div id="recall-list" class="recall-list"></div>
      </section>

      <aside class="recall-aside">
        <section class="reminder-progress-card">
          <span>Reminders previewed in this list</span>
          <strong><span id="reminder-count">0</span> of <span id="reminder-total">3</span></strong>
          <progress id="reminder-progress" value="0" max="3" aria-label="Reminders previewed"></progress>
        </section>
        <section class="workspace-card recall-message-card">
          <h2>Message preview</h2>
          <p>Choose a channel and review the sample reminder.</p>
          <div class="message-channels" role="group" aria-label="Message channel">
            <button type="button" class="workspace-chip is-active" data-message-channel="SMS" aria-pressed="true">SMS</button>
            <button type="button" class="workspace-chip" data-message-channel="Email" aria-pressed="false">Email</button>
          </div>
          <label class="sr-only" for="recall-template">Recall message template</label>
          <textarea id="recall-template" rows="6" spellcheck="true">Hi [PATIENT], it is time for your [VISIT] at Dentistry With a Smile. Pick a time that suits you: [BOOKING LINK]. Reply here if you need help.</textarea>
          <p class="workspace-disclaimer">Sample only. Messages are not sent. Each patient would receive an individual message from the clinic.</p>
        </section>
      </aside>
    </div>
    <p class="workspace-toast" id="workspace-toast" role="status" aria-live="polite" hidden></p>
  </main>
@endsection
