<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class AdminController extends Controller
{
    public function __invoke(string $section = 'services'): View
    {
        return view('admin.index', ['section' => $section]);
    }
}