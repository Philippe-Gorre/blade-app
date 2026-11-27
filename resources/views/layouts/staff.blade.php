<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>@yield('title', config('app.name'))</title>
  @include('partials.fonts')
  <link rel="stylesheet" href="{{ asset('styles/staff-layout.css') }}">
  <link rel="stylesheet" href="{{ asset('styles/xray-preview.css') }}">
  @stack('styles')
  <link rel="stylesheet" href="{{ asset('styles/staff-content.css') }}">
</head>
<body class="staff-body">

  @include('partials.staff-topbar')

  <div class="staff-content">
    @yield('content')
  </div>

  @stack('modals')

  <div class="xray-preview-overlay" id="xray-preview-overlay" hidden>
    <section class="xray-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="xray-preview-title">
      <header class="xray-preview__header">
        <div>
          <h2 id="xray-preview-title">X-ray preview</h2>
          <p class="xray-preview__filename" id="xray-preview-filename"></p>
        </div>
        <button class="xray-preview__close" id="xray-preview-close" type="button" aria-label="Close X-ray preview">×</button>
      </header>
      <div class="xray-preview__viewer" id="xray-preview-viewer" aria-live="polite" aria-busy="false"></div>
    </section>
  </div>

  <script>
    window.CLINIC_CHAIRS = @json($clinicChairs ?? []);
    window.CLINIC_TIMES = @json(config('clinic.time_slots', []));
    window.CLINIC_CURRENT_STAFF = @json($currentStaff ?? null);
  </script>
  <script src="{{ asset('Javascript/storage.js') }}" defer></script>
  <script src="{{ asset('Javascript/custom-services.js') }}" defer></script>
  <script src="{{ asset('Javascript/staff-topbar.js') }}" defer></script>
  <script src="{{ asset('Javascript/xray-preview.js') }}" defer></script>
  @stack('scripts')
</body>
</html>
