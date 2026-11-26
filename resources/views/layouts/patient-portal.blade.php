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
<body class="patient-portal-body">
  @yield('content')
  @stack('modals')
  <script src="{{ asset('Javascript/storage.js') }}" defer></script>
  @stack('scripts')
</body>
</html>
