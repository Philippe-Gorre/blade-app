<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\StaffAccount;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('admin_authenticated') === true) {
            $activeAdminSession = Cache::get('admin_active_session_id');
            if ($activeAdminSession && $activeAdminSession !== $request->session()->getId()) {
                $request->session()->forget('admin_authenticated');

                return redirect()->route('admin.login');
            }

            return $next($request);
        }

        $staffAccount = StaffAccount::query()->find($request->session()->get('staff_account_id'));
        if (!$staffAccount ||
            $request->session()->get('staff_role') !== $staffAccount->role ||
            ($staffAccount->active_session_id && $staffAccount->active_session_id !== $request->session()->getId())) {
            $request->session()->forget(['staff_account_id', 'staff_role']);

            return redirect()->route('patient-portal');
        }

        return $next($request);
    }
}
