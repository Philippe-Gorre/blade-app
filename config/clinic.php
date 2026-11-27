<?php

declare(strict_types=1);

return [

    // Services shown on the public booking form and the patients modal.
    'services_public' => [
        'Check-up and cleaning',
        'Toothache or something broken',
        'Filling or repair',
        'Whitening',
        'Braces or aligners',
        "My child's first visit",
    ],

    'service_prices' => [
        'Check-up and cleaning'         => '₱2,500',
        'Toothache or something broken' => '₱3,000',
        'Filling or repair'             => '₱3,500',
        'Whitening'                     => '₱5,500',
        'Braces or aligners'            => '₱7,000',
        "My child's first visit"        => '₱2,000',
    ],

    // Services shown on staff dashboard / appointments modals.
    'services_staff' => [
        'Check-up and cleaning',
        'Toothache or repair',
        'Broken tooth',
        'Whitening',
        'Aligner check',
        "Child's first visit",
        'Crown fitting',
    ],

    'time_slots' => [
        '8:00 am', '9:00 am', '10:00 am', '11:00 am', '12:00 pm',
        '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm', '5:00 pm',
    ],

    'days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    'chairs' => [],

    'statuses' => [
        'confirmed'  => 'Confirmed',
        'checked-in' => 'Checked in',
        'seated'     => 'Seated for doctor',
        'in-session' => 'In session',
        'emergency'  => 'Emergency',
        'completed'  => 'Completed',
    ],

    'hours' => [
        'Monday to Friday' => env('CLINIC_HOURS_WEEKDAY', '[YOUR HOURS]'),
        'Saturday'         => env('CLINIC_HOURS_SATURDAY', '[YOUR HOURS]'),
        'Sunday'           => env('CLINIC_HOURS_SUNDAY', '[YOUR HOURS]'),
    ],

    'contact' => [
        'Address'                => env('CLINIC_ADDRESS', '[YOUR ADDRESS]'),
        'Phone'                  => env('CLINIC_PHONE', '[YOUR PHONE]'),
        'Email'                  => env('CLINIC_EMAIL', '[YOUR EMAIL]'),
        'Toothache out of hours' => env('CLINIC_EMERGENCY_PHONE', '[YOUR EMERGENCY NUMBER]'),
    ],
];
