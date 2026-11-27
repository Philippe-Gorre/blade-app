<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffAccount extends Model
{
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'active_session_id',
    ];

    protected $hidden = [
        'password',
    ];
}
