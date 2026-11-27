@extends('layouts.public')

@section('title', 'Admin sign in - ' . config('app.name'))

@push('styles')
  <link rel="stylesheet" href="{{ asset('styles/admin-login.css') }}">
@endpush

@section('content')
  <section class="admin-login">
    <div class="admin-login__card">
      <p class="admin-login__eyebrow">Admin workspace</p>
      <h1>Sign in</h1>
      <p class="admin-login__intro">Enter the admin credentials to manage clinic services and settings.</p>

      @unless ($loginConfigured)
        <p class="admin-login__notice" role="status">
          Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the app environment.
        </p>
      @endunless

      <form method="post" action="{{ route('admin.login.store') }}" class="admin-login__form">
        @csrf
        <label for="admin-email">Email address</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          value="{{ old('email') }}"
          autocomplete="username"
          maxlength="254"
          required
          autofocus
        >

        <label for="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autocomplete="current-password"
          maxlength="255"
          required
        >

        @error('email')
          <p class="admin-login__error" role="alert">{{ $message }}</p>
        @enderror
        @error('password')
          <p class="admin-login__error" role="alert">{{ $message }}</p>
        @enderror

        <button type="submit" class="btn btn-primary">Sign in</button>
      </form>

      <a class="admin-login__back" href="{{ route('home') }}">Back to the clinic website</a>
    </div>
  </section>
@endsection
