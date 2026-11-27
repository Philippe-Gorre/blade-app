<?php

namespace App\Providers;

use App\Models\StaffAccount;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        View::composer('*', function ($view): void {
            $chairs = [];
            $currentStaff = null;

            try {
                if (Schema::hasTable('staff_accounts')) {
                    $doctors = StaffAccount::query()
                        ->where('role', 'doctor')
                        ->orderBy('id')
                        ->get(['id', 'name', 'email']);

                    foreach ($doctors as $index => $doctor) {
                        $chairs[] = [
                            'id' => $index + 1,
                            'doctorId' => $doctor->id,
                            'name' => 'Chair ' . ($index + 1),
                            'dentist' => $doctor->name,
                        ];
                    }

                    $staffId = session('staff_account_id');
                    if ($staffId) {
                        $staff = StaffAccount::query()->find($staffId, ['id', 'name', 'email', 'role']);
                        if ($staff) {
                            $currentStaff = [
                                'id' => $staff->id,
                                'name' => $staff->name,
                                'role' => $staff->role,
                            ];
                        }
                    }
                }
            } catch (Throwable) {
                $chairs = [];
                $currentStaff = null;
            }

            $view->with('clinicChairs', $chairs);
            $view->with('currentStaff', $currentStaff);
        });
    }
}
