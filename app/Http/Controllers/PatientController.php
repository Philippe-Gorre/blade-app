<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class PatientController extends Controller
{
    public function index(): View
    {
        return view('patients.index');
    }

    public function portal(): View
    {
        return view('patients.portal');
    }

    public function portalPreview(): View
    {
        return view('patients.portal-preview');
    }
}
