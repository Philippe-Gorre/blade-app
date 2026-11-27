<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use App\Http\Middleware\EnsureAdminAuthenticated;
use App\Http\Middleware\EnsureStaffAuthenticated;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin.auth' => EnsureAdminAuthenticated::class,
            'staff.auth' => EnsureStaffAuthenticated::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Your session changed in another tab. Refreshing...',
                    'expired' => true,
                ], 419);
            }

            if ($request->is('admin') || $request->is('admin/*')) {
                return redirect()->route('admin.login');
            }

            return redirect()->route('patient-portal');
        });
    })->create();
