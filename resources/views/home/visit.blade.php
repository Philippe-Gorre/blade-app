<div class="wrap visit-inner">
  <div class="hours">
    <h2 class="h2">Opening hours</h2>
    <dl>
      @foreach (config('clinic.hours') as $day => $hours)
        <div class="item"><dt>{{ $day }}</dt><dd>{{ $hours }}</dd></div>
      @endforeach
    </dl>
  </div>
  <div class="contact">
    <h2>Find us</h2>
    @foreach (config('clinic.contact') as $label => $value)
      <div><span class="label">{{ $label }}</span><span class="value">{{ $value }}</span></div>
    @endforeach
  </div>
</div>
