@php
    $doctorMode = request()->routeIs('in-session.index') || request()->query('workspace') === 'doctor';
    $currentRoute = request()->route()?->getName() ?: 'dashboard';
    $toggleParams = $doctorMode ? [] : ['workspace' => 'doctor'];
    $toggleRoute = ($doctorMode && $currentRoute === 'in-session.index') ? 'dashboard' : $currentRoute;
    $links = [
        ['route' => 'dashboard',          'label' => 'Dashboard'],
        ['route' => 'appointments.index', 'label' => 'Calendar'],
        ['route' => 'patients.index',     'label' => 'Patients'],
    ];
    if ($doctorMode) {
        $links[] = ['route' => 'in-session.index', 'label' => 'In-session'];
    }
    $links[] = ['route' => 'billing.index', 'label' => 'Billing'];
    $links[] = ['route' => 'recalls.index', 'label' => 'Recalls'];
    $links[] = ['route' => 'reports.index', 'label' => 'Reports'];
@endphp

<header class="topbar">
  <div class="topbar__inner">
    <a class="logo" href="{{ route('home') }}">
      <x-logo-mark />
      <span class="logo__name">{{ config('app.name') }}</span>
    </a>

    <nav class="nav" aria-label="Main">
      @foreach ($links as $link)
        @php($active = request()->routeIs($link['route']))
        <a
          href="{{ route($link['route'], $doctorMode ? ['workspace' => 'doctor'] : []) }}"
          @class(['is-active' => $active])
          @if ($active) aria-current="page" @endif
        >{{ $link['label'] }}</a>
      @endforeach
    </nav>

    <div class="topbar__tools">
      <div class="topbar__notif-wrap">
        <button class="icon-btn" type="button" id="staff-notifications-btn" aria-label="Notifications" aria-expanded="false" aria-controls="staff-notifications-popover">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8zM8.3 16.2a2 2 0 0 0 3.4 0"></path></svg>
          <span class="notif-badge" id="staff-notifications-badge" hidden>0</span>
        </button>
        <div class="notif-popover" id="staff-notifications-popover" hidden>
          <div class="notif-popover__head">
            <strong>Notifications</strong>
            <button type="button" class="notif-popover__clear" id="staff-notifications-clear">Clear</button>
          </div>
          <div class="notif-popover__list" id="staff-notifications-list"></div>
        </div>
      </div>
      <a class="topbar__role-switch" href="{{ route($toggleRoute, $toggleParams) }}" title="Switch between Front desk and Doctor view">
        <span class="topbar__role">{{ $doctorMode ? 'Doctor' : 'Front desk' }}</span>
        <span class="avatar">{{ $doctorMode ? 'DR' : 'FD' }}</span>
      </a>
    </div>
  </div>
</header>
