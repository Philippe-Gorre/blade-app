@php
    $adminMode = request()->routeIs('admin.index');
    $doctorMode = request()->routeIs('in-session.index') || request()->query('workspace') === 'doctor';
    if ($adminMode) {
        $links = [
            ['section' => 'services', 'label' => 'Services'],
            ['section' => 'revenue', 'label' => 'Revenue'],
            ['section' => 'accounts', 'label' => 'Accounts'],
        ];
    } else {
        $links = [
            ['route' => 'dashboard',          'label' => 'Dashboard'],
            ['route' => 'appointments.index', 'label' => 'Appointments'],
            ['route' => 'patients.index',     'label' => 'Patients'],
        ];
        if ($doctorMode) {
            $links[] = ['route' => 'in-session.index', 'label' => 'In-session'];
        }
        $links[] = ['route' => 'billing.index', 'label' => 'Billing'];
        $links[] = ['route' => 'recalls.index', 'label' => 'Recalls'];
        $links[] = ['route' => 'reports.index', 'label' => 'Reports'];
    }
@endphp

<header class="topbar">
  <div class="topbar__inner">
    <div class="logo">
      <x-logo-mark />
      <span class="logo__name">{{ config('app.name') }}</span>
    </div>

    <nav class="nav" aria-label="Main">
      @foreach ($links as $link)
        @php($active = $adminMode ? $section === $link['section'] : request()->routeIs($link['route']))
        <a
          href="{{ $adminMode ? route('admin.index', ['section' => $link['section']]) : route($link['route'], $doctorMode ? ['workspace' => 'doctor'] : []) }}"
          @class(['is-active' => $active])
          @if ($active) aria-current="page" @endif
        >{{ $link['label'] }}</a>
      @endforeach
    </nav>

    <div class="topbar__tools">
      @unless ($adminMode)
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
      @endunless
      @if ($adminMode || (!session('staff_account_id') && session('admin_authenticated')))
        <form method="post" action="{{ route('admin.logout') }}">
          @csrf
          <button class="topbar__logout" type="submit">Log out</button>
        </form>
      @else
        <form method="post" action="{{ route('staff.logout') }}">
          @csrf
          <button class="topbar__logout" type="submit">Log out</button>
        </form>
      @endif
      <div class="topbar__profile" aria-label="{{ $adminMode ? 'Admin account' : ($doctorMode ? 'Doctor account' : 'Front desk account') }}">
        @if ($adminMode)
          <span class="topbar__role">Admin</span>
          <span class="avatar">AD</span>
        @else
        <span class="topbar__role">{{ $doctorMode ? 'Doctor' : 'Front desk' }}</span>
        <span class="avatar">{{ $doctorMode ? 'DR' : 'FD' }}</span>
        @endif
      </div>
    </div>
  </div>
</header>
