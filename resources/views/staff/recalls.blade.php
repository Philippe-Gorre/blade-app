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
        <p>Schedule a recall date in a patient record. Email drafts open in your email app; reminders are not sent automatically.</p>
      </div>
      <button class="workspace-button workspace-button--dark" type="button" id="send-all-reminders" disabled>Mark all as sent</button>
    </header>

    <div class="recall-filters" role="tablist" aria-label="Recall due date">
      <button class="workspace-chip is-active" type="button" role="tab" aria-selected="true" data-recall-filter="overdue">Overdue (0)</button>
      <button class="workspace-chip" type="button" role="tab" aria-selected="false" data-recall-filter="month">Due this month (0)</button>
      <button class="workspace-chip" type="button" role="tab" aria-selected="false" data-recall-filter="upcoming">Upcoming (0)</button>
    </div>

    <div class="workspace-columns recall-columns">
      <section class="workspace-card recall-list-card">
        <div class="recall-table-head"><span>Patient</span><span>Last visit</span><span>Due</span><span>Reminder</span></div>
        <div id="recall-list" class="recall-list">
          <p class="recall-empty">No patients are due for a reminder.</p>
        </div>
      </section>

      <aside class="recall-aside">
        <section class="reminder-progress-card">
          <span>Reminders logged in this list</span>
          <strong><span id="reminder-count">0</span> of <span id="reminder-total">0</span></strong>
          <progress id="reminder-progress" value="0" max="1" aria-label="Reminders logged"></progress>
        </section>
        <section class="workspace-card recall-message-card">
          <h2>Email draft template</h2>
          <p>Use {name} and {due} as placeholders.</p>
          <span class="recall-channel-label">Email only</span>
          <label class="sr-only" for="recall-template">Recall message template</label>
          <textarea id="recall-template" rows="6" spellcheck="true" placeholder="Hello {name}, this is a reminder that you are due for a dental visit on {due}. Please contact the clinic to schedule."></textarea>
          <p class="workspace-disclaimer">Open email draft creates a message in your email app. Mark sent only after you send it.</p>
        </section>
      </aside>
    </div>
    <p class="workspace-toast" id="workspace-toast" role="status" aria-live="polite" hidden></p>
  </main>
@endsection
