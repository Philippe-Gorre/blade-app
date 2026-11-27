<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\StaffAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffAccountController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            StaffAccount::query()
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $attributes = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:254', Rule::unique('staff_accounts', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', Rule::in(['front_desk', 'doctor'])],
        ]);

        if (strtolower((string) config('admin.email')) === $attributes['email']) {
            return response()->json([
                'message' => 'The admin email cannot also be used for a staff account.',
                'errors' => ['email' => ['The admin email cannot also be used for a staff account.']],
            ], 422);
        }

        $staffAccount = StaffAccount::query()->create([
            'name' => trim($attributes['name']),
            'email' => $attributes['email'],
            'password' => Hash::make($attributes['password']),
            'role' => $attributes['role'],
        ]);

        return response()->json([
            'id' => $staffAccount->id,
            'name' => $staffAccount->name,
            'email' => $staffAccount->email,
            'role' => $staffAccount->role,
        ], 201);
    }

    public function destroy(StaffAccount $staffAccount): JsonResponse
    {
        $staffAccount->delete();

        return response()->json(['deleted' => true]);
    }
}
