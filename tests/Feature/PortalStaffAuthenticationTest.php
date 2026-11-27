<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\StaffAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PortalStaffAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_sign_in_from_the_patient_portal(): void
    {
        config([
            'admin.email' => 'admin@example.com',
            'admin.password' => 'test-only-password',
        ]);

        $this->postJson(route('patient-portal.login'), [
            'email' => 'admin@example.com',
            'password' => 'test-only-password',
        ])
            ->assertOk()
            ->assertJsonPath('redirect', route('admin.index'))
            ->assertSessionHas('admin_authenticated', true);

        $this->get(route('dashboard'))->assertOk();
    }

    public function test_admin_can_create_staff_accounts_that_sign_in_to_their_workspace(): void
    {
        $adminSession = ['admin_authenticated' => true];

        $created = $this->withSession($adminSession)
            ->postJson(route('admin.staff-accounts.store'), [
                'name' => 'Taylor Doctor',
                'email' => 'taylor@example.com',
                'password' => 'staff-password',
                'role' => 'doctor',
            ])
            ->assertCreated()
            ->assertJsonMissingPath('password')
            ->json();

        $account = StaffAccount::query()->findOrFail($created['id']);
        $this->assertTrue(Hash::check('staff-password', $account->password));

        $this->postJson(route('patient-portal.login'), [
            'email' => 'taylor@example.com',
            'password' => 'staff-password',
        ])
            ->assertOk()
            ->assertJsonPath('redirect', route('appointments.index', ['workspace' => 'doctor']))
            ->assertSessionHas('staff_account_id', $account->id)
            ->assertSessionHas('staff_role', 'doctor');
    }

    public function test_front_desk_staff_sign_in_to_the_front_desk_workspace(): void
    {
        $account = StaffAccount::query()->create([
            'name' => 'Casey Front Desk',
            'email' => 'casey@example.com',
            'password' => Hash::make('staff-password'),
            'role' => 'front_desk',
        ]);

        $this->postJson(route('patient-portal.login'), [
            'email' => $account->email,
            'password' => 'staff-password',
        ])
            ->assertOk()
            ->assertJsonPath('redirect', route('dashboard'))
            ->assertSessionHas('staff_account_id', $account->id)
            ->assertSessionHas('staff_role', 'front_desk');
    }

    public function test_unknown_server_accounts_fall_back_to_patient_portal_sign_in(): void
    {
        $this->postJson(route('patient-portal.login'), [
            'email' => 'patient@example.com',
            'password' => 'patient-password',
        ])
            ->assertOk()
            ->assertJsonPath('notStaff', true);
    }

    public function test_staff_account_creation_requires_admin_authentication(): void
    {
        $this->postJson(route('admin.staff-accounts.store'), [
            'name' => 'Taylor Doctor',
            'email' => 'taylor@example.com',
            'password' => 'staff-password',
            'role' => 'doctor',
        ])->assertRedirect(route('admin.login'));

        $this->assertDatabaseCount('staff_accounts', 0);
    }

    public function test_staff_workspace_requires_a_valid_staff_session(): void
    {
        $this->get(route('dashboard'))
            ->assertRedirect(route('patient-portal'));

        $account = StaffAccount::query()->create([
            'name' => 'Front Desk Staff',
            'email' => 'front-desk@example.com',
            'password' => Hash::make('staff-password'),
            'role' => 'front_desk',
        ]);

        $this->withSession([
            'staff_account_id' => $account->id,
            'staff_role' => $account->role,
        ])->get(route('dashboard'))->assertOk();
    }
}
