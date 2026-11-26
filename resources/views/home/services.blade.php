@php
    $services = [
        ['Check-ups and cleaning', '₱2,500', 'A full exam, X-rays when they are needed, and a scale and polish. Most people come every six to twelve months, depending on their teeth and gums.'],
        ['Fillings and repairs', '₱3,500', 'Tooth-colored fillings, crowns and bridges. We show you the problem on a screen before we start, so you know what we are fixing.'],
        ['Emergency care', '₱3,000', 'Toothache, a broken tooth or a lost filling. Call us and we will fit you in as soon as we can.'],
        ['Whitening', '₱5,500', 'Take-home trays or one session in the chair, after we check that your teeth and gums are ready for it.'],
        ['Braces and aligners', '₱7,000', 'Clear aligners and fixed braces for teenagers and adults, with a written plan and timeline before you commit.'],
        ["Children's dentistry", '₱2,000', 'Short, calm visits that let children get used to the chair and the people. Bring them as soon as their first teeth appear.'],
    ];
@endphp

<div class="wrap services">
  <div class="section-head">
    <h2 class="h2">Everything your teeth need, in one practice</h2>
    <p>Routine care, repairs and emergencies are all handled here, so you see the same people every time.</p>
  </div>
  <div class="service-grid">
    @foreach ($services as [$title, $price, $text])
      <div class="service">
        <div class="service__head">
          <h3>{{ $title }}</h3>
          <span class="service__price">{{ $price }}</span>
        </div>
        <p>{{ $text }}</p>
      </div>
    @endforeach
  </div>
</div>
