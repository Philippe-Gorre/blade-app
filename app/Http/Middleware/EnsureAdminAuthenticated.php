<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('admin_authenticated') !== true) {
            return redirect()->guest(route('admin.login'));
        }

        $activeAdminSession = Cache::get('admin_active_session_id');
        if ($activeAdminSession && $activeAdminSession !== $request->session()->getId()) {
            $request->session()->forget('admin_authenticated');

            return redirect()->route('admin.login');
        }

        return $next($request);
    }
}
