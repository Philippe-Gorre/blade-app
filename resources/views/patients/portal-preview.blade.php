@extends('layouts.patient-portal')

@section('title', 'Patient Portal Preview - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/patient-portal-dashboard.css') }}">
@endpush

@section('content')
  <header class="patient-header">
    <div class="patient-header__inner">
      <div class="patient-brand">
        <span class="patient-brand__icon"><x-logo-mark :width="24" :height="18" stroke="#FFFFFF" /></span>
        <span>{{ config('app.name') }}</span>
      </div>
      <div></div>
      <div></div>
    </div>
  </header>

  <main class="patient-portal">
    <div class="patient-portal__inner">
      <section class="patient-view" aria-labelledby="preview-heading">
        <h1 id="preview-heading">Patient portal preview</h1>
        <p>No sample patient data is loaded in this preview.</p>
        <a class="patient-button patient-button--dark" href="{{ route('patient-portal') }}">Go to patient sign in</a>
      </section>
    </div>
  </main>
@endsection
