<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Cache;

class AdminAuthController extends Controller
{
    public function create(): View|RedirectResponse
    {
        if (session('admin_authenticated') === true) {
            return redirect()->route('admin.index');
        }

        return view('admin.login', [
            'loginConfigured' => filled(config('admin.email')) && filled(config('admin.password')),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $configuredEmail = (string) config('admin.email');
        $configuredPassword = (string) config('admin.password');
        if ($configuredEmail === '' || $configuredPassword === '') {
            return back()
                ->withErrors(['email' => 'Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the app environment.'])
                ->onlyInput('email');
        }

        if (!hash_equals(strtolower($configuredEmail), strtolower($credentials['email'])) ||
            !hash_equals($configuredPassword, $credentials['password'])) {
            return back()
                ->withErrors(['email' => 'These credentials do not match our records.'])
                ->onlyInput('email');
        }

        $request->session()->regenerate();
        $request->session()->forget(['staff_account_id', 'staff_role']);
        $request->session()->put('admin_authenticated', true);
        Cache::put('admin_active_session_id', $request->session()->getId(), now()->addYear());

        return redirect()->intended(route('admin.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        if (Cache::get('admin_active_session_id') === $request->session()->getId()) {
            Cache::forget('admin_active_session_id');
        }
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
