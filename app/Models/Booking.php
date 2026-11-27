<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'phone',
        'email',
        'service',
        'date',
        'time',
        'chair',
        'dentist',
        'note',
        'status',
    ];

    protected static function booted(): void
    {
        static::saving(function (Booking $booking): void {
            if ($booking->status === 'cancelled') {
                $booking->slot_key = null;
                $booking->patient_slot_key = null;

                return;
            }

            $booking->slot_key = implode('|', [
                $booking->date,
                $booking->time,
                $booking->chair,
            ]);

            $booking->patient_slot_key = $booking->patient_id === null
                ? null
                : implode('|', [
                    $booking->patient_id,
                    $booking->date,
                    $booking->time,
                ]);
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
