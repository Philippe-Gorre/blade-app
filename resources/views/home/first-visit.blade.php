@php
    $steps = [
        ['We talk', 'We ask what brought you in and what worries you about the dentist. You set the pace from here.'],
        ['We look', 'A gentle exam, with X-rays only if we need them. You see what we see, on screen, in plain language.'],
        ['We plan', 'You leave with written options and their costs. Nothing is done until you say yes.'],
    ];
@endphp

<div class="wrap steps-wrap">
  <h2 class="h2">What happens at your first visit</h2>
  <div class="steps">
    @foreach ($steps as $i => [$title, $text])
      <div class="step">
        <span class="step-num">{{ $i + 1 }}</span>
        <h3>{{ $title }}</h3>
        <p>{{ $text }}</p>
      </div>
    @endforeach
  </div>
</div>
