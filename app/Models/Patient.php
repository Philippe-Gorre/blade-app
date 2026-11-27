<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $fillable = [
        'identity_key',
        'first_name',
        'last_name',
        'phone',
        'email',
    ];

    protected $hidden = [
        'identity_key',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
