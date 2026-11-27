@extends('layouts.public')

@section('title', 'Patient Portal - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/patient-portal.css') }}">
@endpush

@push('scripts')
  <script src="{{ asset('Javascript/patient-portal.js') }}?v={{ filemtime(public_path('Javascript/patient-portal.js')) }}" defer></script>
@endpush

@section('content')
  <section class="portal">
    <div class="wrap portal__inner">
      <div class="portal__intro">
        <span class="portal__eyebrow">Patient portal</span>
        <h1>Your care, all in one place.</h1>
        <p>Sign in to keep up with your visits and stay connected with your dental care team.</p>
        <a class="portal__back" href="{{ route('home') }}">Back to the clinic website</a>
      </div>

      <div class="portal-card">
        <div class="portal-card__brand">
          <x-logo-mark :width="40" :height="28" />
          <span>{{ config('app.name') }}</span>
        </div>
        <h2>Welcome back</h2>
        <p class="portal-card__copy">Patients, staff, and administrators can sign in with their account email and password.</p>

        <form id="patient-portal-login" class="portal-form" data-auth-url="{{ route('patient-portal.login') }}">
          <div class="field">
            <label for="portal-email">Email address</label>
            <input
              class="input"
              id="portal-email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              maxlength="254"
              placeholder="you@gmail.com"
              required
            >
          </div>
          <div class="field">
            <label for="portal-password">Password</label>
            <input
              class="input"
              id="portal-password"
              name="password"
              type="password"
              autocomplete="current-password"
              minlength="8"
              required
            >
          </div>
          <button class="btn btn-primary" type="submit">Continue</button>
          <p class="portal-form__message" id="portal-login-message" role="status" aria-live="polite" hidden></p>
        </form>

        <p class="portal-card__note">Need help? <a href="{{ route('home') }}#visit">Contact the clinic</a>.</p>
      </div>
    </div>
  </section>
@endsection
