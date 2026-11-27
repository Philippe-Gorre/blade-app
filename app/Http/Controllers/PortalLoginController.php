<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\StaffAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class PortalLoginController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $email = strtolower(trim($credentials['email']));
        $adminEmail = strtolower((string) config('admin.email'));
        $adminPassword = (string) config('admin.password');

        if ($adminEmail !== '' && hash_equals($adminEmail, $email)) {
            if ($adminPassword === '' || !hash_equals($adminPassword, $credentials['password'])) {
                return response()->json(['message' => 'These credentials do not match our records.'], 401);
            }

            $request->session()->regenerate();
            $request->session()->forget(['staff_account_id', 'staff_role']);
            $request->session()->put('admin_authenticated', true);
            Cache::put('admin_active_session_id', $request->session()->getId(), now()->addYear());

            return response()->json([
                'redirect' => route('admin.index'),
            ]);
        }

        $staffAccount = StaffAccount::query()->where('email', $email)->first();
        if (!$staffAccount) {
            return response()->json(['notStaff' => true]);
        }
        if (!Hash::check($credentials['password'], $staffAccount->password)) {
            return response()->json(['message' => 'These credentials do not match our records.'], 401);
        }

        $request->session()->regenerate();
        $request->session()->forget('admin_authenticated');
        $request->session()->put([
            'staff_account_id' => $staffAccount->id,
            'staff_role' => $staffAccount->role,
        ]);
        $staffAccount->update([
            'active_session_id' => $request->session()->getId(),
        ]);

        $redirect = $staffAccount->role === 'doctor'
            ? route('appointments.index', ['workspace' => 'doctor'])
            : route('dashboard');

        return response()->json(['redirect' => $redirect]);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $staffId = $request->session()->get('staff_account_id');
        if ($staffId) {
            StaffAccount::query()
                ->where('id', $staffId)
                ->where('active_session_id', $request->session()->getId())
                ->update(['active_session_id' => null]);
        }

        $request->session()->forget(['staff_account_id', 'staff_role']);
        $request->session()->regenerateToken();

        return redirect()->route('patient-portal');
    }
}
