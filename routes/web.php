<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InSessionController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\StaffWorkspaceController;

Route::get('/', HomeController::class)->name('home');
Route::get('/dashboard', DashboardController::class)->name('dashboard');
Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
Route::get('/patients', [PatientController::class, 'index'])->name('patients.index');
Route::get('/patient-portal', [PatientController::class, 'portal'])->name('patient-portal');
Route::get('/patient-portal/preview', [PatientController::class, 'portalPreview'])->name('patient-portal.preview');
Route::get('/in-session', [InSessionController::class, 'index'])->name('in-session.index');
Route::get('/billing', [StaffWorkspaceController::class, 'billing'])->name('billing.index');
Route::get('/recalls', [StaffWorkspaceController::class, 'recalls'])->name('recalls.index');
Route::get('/reports', [StaffWorkspaceController::class, 'reports'])->name('reports.index');
