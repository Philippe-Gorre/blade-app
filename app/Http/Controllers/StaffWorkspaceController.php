<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class StaffWorkspaceController extends Controller
{
    public function billing(): View
    {
        return view('staff.billing');
    }

    public function recalls(): View
    {
        return view('staff.recalls');
    }

    public function reports(): View
    {
        return view('staff.reports');
    }
}
