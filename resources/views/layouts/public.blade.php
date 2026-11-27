<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>@yield('title', config('app.name'))</title>
  <link rel="stylesheet" href="{{ asset('styles/style.css') }}">
  @include('partials.fonts')
  @stack('styles')
</head>
<body>

<header>
  <div class="wrap header-inner">
    <div class="logo">
      <x-logo-mark :width="44" :height="30" />
      <span class="logo-name">{{ config('app.name') }}</span>
    </div>
    <nav class="nav">
      <a href="{{ route('home') }}#services">Services</a>
      <a href="{{ route('home') }}#first-visit">Your first visit</a>
      <a href="{{ route('home') }}#visit">Find us</a>
      <a class="nav-cta" href="{{ route('home') }}#book" data-open-booking>Book a visit</a>
      <a class="nav-cta" href="{{ route('patient-portal') }}">Patient Portal</a>
    </nav>
  </div>
</header>

<main>
  @yield('content')
</main>

<footer class="footer">
  <div class="wrap footer-inner">
    <a class="logo" href="{{ route('admin.login') }}" style="text-decoration: none; color: inherit;" aria-label="{{ config('app.name') }}">
      <x-logo-mark :width="36" :height="24" stroke="#FFFFFF" />
      <span class="logo-name">{{ config('app.name') }}</span>
    </a>
    <nav>
      <a href="{{ route('home') }}#services">Services</a>
      <a href="{{ route('home') }}#first-visit">Your first visit</a>
      <a href="{{ route('home') }}#visit">Find us</a>
      <a href="{{ route('home') }}#book" data-open-booking>Book a visit</a>
      <a href="{{ route('patient-portal') }}">Patient Portal</a>
    </nav>
    <small>{{ now()->year }} {{ config('app.name') }}. All rights reserved.</small>
  </div>
</footer>

<script>
  window.CLINIC_CHAIRS = @json($clinicChairs ?? []);
  window.CLINIC_TIMES = @json(config('clinic.time_slots', []));
</script>
<script src="{{ asset('Javascript/storage.js') }}" defer></script>
<script src="{{ asset('Javascript/custom-services.js') }}" defer></script>
@stack('scripts')
</body>
</html>
