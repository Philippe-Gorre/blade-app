@extends('layouts.staff')

@section('title', config('app.name') . ' Dashboard')

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/dashboard.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/dashboard.js') }}" defer></script>
@endpush

@section('content')
  <main class="page">

    <div class="intro">
      <span class="muted" id="today">{{ $today->format('l j F Y') }}</span>
      <h1>Today's schedule</h1>
      <p class="stats">
        <span><strong id="stat-appointments">0</strong> appointments today</span>
        <span><strong id="stat-checkedin">0</strong> checked in</span>
        <span><strong id="stat-openslots">0</strong> open slots left</span>
      </p>
    </div>

    <div class="columns">
      <section class="day" aria-label="Rest of today">
        <div class="day__head">
          <h2>Rest of today, by chair</h2>
          <a class="link" href="{{ route('appointments.index', request()->query('workspace') === 'doctor' ? ['workspace' => 'doctor'] : []) }}">Open full calendar</a>
        </div>

        <div class="table-wrap">
          {{-- Rendered by dashboard.js --}}
          <div class="chair-grid" id="chair-grid"></div>
        </div>
      </section>
    </div>
  </main>
@endsection

@push('modals')
  @include('dashboard.book-slot-modal')
  @include('dashboard.manage-slot-modal')
@endpush
