<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InSessionController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PortalLoginController;
use App\Http\Controllers\StaffAccountController;
use App\Http\Controllers\StaffWorkspaceController;

Route::get('/', HomeController::class)->name('home');
Route::get('/patient-portal', [PatientController::class, 'portal'])->name('patient-portal');
Route::post('/patient-portal/login', [PortalLoginController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('patient-portal.login');
Route::get('/patient-portal/preview', [PatientController::class, 'portalPreview'])->name('patient-portal.preview');
Route::get('/admin/login', [AdminAuthController::class, 'create'])->name('admin.login');
Route::post('/admin/login', [AdminAuthController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('admin.login.store');
Route::middleware('staff.auth')->group(function (): void {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
    Route::get('/patients', [PatientController::class, 'index'])->name('patients.index');
    Route::get('/in-session', [InSessionController::class, 'index'])->name('in-session.index');
    Route::get('/billing', [StaffWorkspaceController::class, 'billing'])->name('billing.index');
    Route::get('/recalls', [StaffWorkspaceController::class, 'recalls'])->name('recalls.index');
    Route::get('/reports', [StaffWorkspaceController::class, 'reports'])->name('reports.index');
    Route::post('/staff/logout', [PortalLoginController::class, 'destroy'])->name('staff.logout');
});
Route::middleware('admin.auth')->group(function (): void {
    Route::post('/admin/logout', [AdminAuthController::class, 'destroy'])->name('admin.logout');
    Route::get('/admin/staff-accounts', [StaffAccountController::class, 'index'])->name('admin.staff-accounts.index');
    Route::post('/admin/staff-accounts', [StaffAccountController::class, 'store'])->name('admin.staff-accounts.store');
    Route::delete('/admin/staff-accounts/{staffAccount}', [StaffAccountController::class, 'destroy'])
        ->name('admin.staff-accounts.destroy');
    Route::get('/admin/{section?}', AdminController::class)
        ->whereIn('section', ['services', 'revenue', 'accounts'])
        ->defaults('section', 'services')
        ->name('admin.index');
});
