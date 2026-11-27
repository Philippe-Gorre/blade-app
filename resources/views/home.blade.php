@extends('layouts.public')

@section('title', config('app.name'))

@push('scripts')
  <script src="{{ asset('Javascript/Booking.js') }}?v={{ filemtime(public_path('Javascript/Booking.js')) }}" defer></script>
@endpush

@section('content')
  <section id="top" class="hero">
    @include('home.hero')
  </section>

  <section id="services" class="section">
    @include('home.services')
  </section>

  <section id="first-visit" class="section steps-section">
    @include('home.first-visit')
  </section>

  <section id="visit" class="section">
    @include('home.visit')
  </section>
@endsection
