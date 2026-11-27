<?php

namespace Tests\Feature;

use App\Models\StaffAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $staffAccount = StaffAccount::query()->create([
            'name' => 'Feature Test Staff',
            'email' => 'feature-staff@example.test',
            'password' => Hash::make('feature-test-password'),
            'role' => 'front_desk',
        ]);
        $this->withSession([
            'staff_account_id' => $staffAccount->id,
            'staff_role' => $staffAccount->role,
        ]);
    }

    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_homepage_contains_a_stepwise_booking_dialog(): void
    {
        $response = $this->get('/');

        $response->assertOk()
            ->assertSee('id="book" hidden', false)
            ->assertSee('role="dialog"', false)
            ->assertSee('data-booking-step="1"', false)
            ->assertSee('data-booking-step="2"', false)
            ->assertSee('data-booking-step="3"', false)
            ->assertSee('name="account-requested"', false)
            ->assertSee('id="account-modal"', false)
            ->assertSee('id="pt-phone" type="tel" inputmode="numeric" autocomplete="tel" minlength="11" maxlength="11" pattern="[0-9]{11}" required', false)
            ->assertSee('Cellphone number')
            ->assertSee('id="pt-email"', false)
            ->assertSee('Gmail address')
            ->assertSee('pattern=".+@[Gg][Mm][Aa][Ii][Ll][.]com" required', false)
            ->assertSee('id="pt-chair-options"', false)
            ->assertSee('id="pt-time-options" hidden', false)
            ->assertSee('Choose a doctor and chair')
            ->assertSee('2. Choose an available time')
            ->assertSee('name="email"', false)
            ->assertSee('type="password"', false)
            ->assertSee('id="booking-success-toast"', false)
            ->assertSee('No, continue without one');
    }

    public function test_patient_portal_sign_in_does_not_require_a_cellphone_number(): void
    {
        $response = $this->get(route('patient-portal'));

        $response->assertOk()
            ->assertSee('id="patient-portal-login"', false)
            ->assertSee('id="portal-email"', false)
            ->assertSee('id="portal-password"', false)
            ->assertDontSee('Cellphone number')
            ->assertDontSee('name="phone"', false);
    }

    public function test_patient_portal_navigation_hides_preview_staff_and_logo_links(): void
    {
        $this->get(route('patient-portal'))
            ->assertOk()
            ->assertDontSee('Preview the patient portal layout')
            ->assertDontSee('Staff workspace')
            ->assertDontSee(route('patient-portal.preview'), false)
            ->assertDontSee('<a class="logo"', false);
    }

    public function test_patient_portal_preview_has_no_sample_records(): void
    {
        $response = $this->get(route('patient-portal.preview'));

        $response->assertOk()
            ->assertSee('No sample patient data is loaded')
            ->assertDontSee('Maria Reyes')
            ->assertDontSee('INV-');
    }

    public function test_appointment_creation_dialogs_do_not_offer_status_selection(): void
    {
        $this->get(route('appointments.index'))
            ->assertOk()
            ->assertSee('appointment-slot-summary', false)
            ->assertSee('appointment-first-name', false)
            ->assertDontSee('id="new-appointment"', false)
            ->assertDontSee('id="appointment-status"', false);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertSee('Book appointment')
            ->assertDontSee('id="slot-status"', false);
    }

    public function test_in_session_page_is_available_from_staff_navigation(): void
    {
        $response = $this->get(route('in-session.index'));

        $response->assertOk()
            ->assertSee('Ready for you')
            ->assertSee('Active sessions')
            ->assertSee('Completed today')
            ->assertSee('Enter each treatment amount here to send it to the front desk for collection.')
            ->assertSee('In-session')
            ->assertSee('href="' . route('in-session.index', ['workspace' => 'doctor']) . '"', false)
            ->assertSee('browser only');
    }

    public function test_doctor_workspace_keeps_its_tab_across_staff_pages(): void
    {
        $response = $this->get(route('dashboard', ['workspace' => 'doctor']));

        $response->assertOk()
            ->assertSee('Doctor')
            ->assertSee('href="' . route('in-session.index', ['workspace' => 'doctor']) . '"', false)
            ->assertSee('href="' . route('appointments.index', ['workspace' => 'doctor']) . '"', false);
    }

    public function test_front_desk_navigation_does_not_show_the_doctor_tab(): void
    {
        $response = $this->get(route('dashboard'));

        $response->assertOk();
        preg_match('/<nav class="nav"[^>]*>(.*?)<\/nav>/s', $response->getContent(), $navigation);
        $this->assertNotEmpty($navigation);
        $this->assertStringNotContainsString('href="' . route('in-session.index') . '"', $navigation[1]);
    }

    public function test_staff_billing_recalls_and_reports_pages_render(): void
    {
        $billing = $this->get(route('billing.index'))
            ->assertOk()
            ->assertSee('Collected today')
            ->assertSee('Payments to collect')
            ->assertSee('Completed transactions')
            ->assertSee('id="invoice-pending-list"', false)
            ->assertSee('No transaction selected')
            ->assertDontSee('INV-1041')
            ->assertDontSee('Bea Santos');

        $this->get(route('recalls.index'))
            ->assertOk()
            ->assertSee('No patients are due for a reminder.')
            ->assertSee('Overdue (0)')
            ->assertSee('Reminders logged in this list')
            ->assertSee('Email only')
            ->assertDontSee('SMS')
            ->assertDontSee('Kiko Ramos')
            ->assertDontSee('Book');
        $this->get(route('reports.index'))
            ->assertOk()
            ->assertSee('Appointments by day')
            ->assertSee('data-report-stat="appointments">0', false)
            ->assertDontSee('data-report-stat="appointments">75', false);

        $this->get(route('billing.index', ['workspace' => 'doctor']))
            ->assertOk()
            ->assertSee('Doctor')
            ->assertSee(route('in-session.index', ['workspace' => 'doctor']), false);
    }

    public function test_admin_workspace_shows_only_services_revenue_and_account_creation(): void
    {
        $this->withSession(['admin_authenticated' => true])
            ->get(route('admin.index'))
            ->assertOk()
            ->assertSee('data-admin-page="services"', false);

        foreach (['services', 'revenue', 'accounts'] as $section) {
            $response = $this->withSession(['admin_authenticated' => true])
                ->get(route('admin.index', ['section' => $section]));

            $response->assertOk()
                ->assertSee('data-admin-page="' . $section . '"', false)
                ->assertSee(route('admin.index', ['section' => 'services']), false)
                ->assertSee(route('admin.index', ['section' => 'revenue']), false)
                ->assertSee(route('admin.index', ['section' => 'accounts']), false)
                ->assertDontSee('Dashboard')
                ->assertDontSee('Billing')
                ->assertDontSee('Patients');

            if ($section === 'accounts') {
                $response->assertSee('id="admin-account-password"', false)
                    ->assertSee('type="password"', false)
                    ->assertSee('Staff accounts are stored securely on the server');
            }
            if ($section === 'services') {
                $response->assertSee('id="admin-service-sessions"', false)
                    ->assertSee('value="1"', false)
                    ->assertSee('id="admin-service-gap"', false)
                    ->assertSee('id="admin-service-gap-unit"', false)
                    ->assertSee('Default gap between sessions');
            }
        }
    }

    public function test_admin_workspace_requires_login(): void
    {
        $this->get(route('admin.index'))
            ->assertRedirect(route('admin.login'));

        $this->get(route('admin.login'))
            ->assertOk()
            ->assertSee('Admin workspace')
            ->assertSee('name="email"', false)
            ->assertSee('name="password"', false);
    }

    public function test_admin_can_sign_in_and_log_out_with_configured_credentials(): void
    {
        config([
            'admin.email' => 'admin@example.com',
            'admin.password' => 'test-only-password',
        ]);

        $this->post(route('admin.login.store'), [
            'email' => 'admin@example.com',
            'password' => 'test-only-password',
        ])
            ->assertRedirect(route('admin.index'))
            ->assertSessionHas('admin_authenticated', true);

        $this->get(route('admin.index'))->assertOk();

        $this->post(route('admin.logout'))
            ->assertRedirect(route('admin.login'));
        $this->get(route('admin.index'))
            ->assertRedirect(route('admin.login'));
    }

    public function test_admin_login_rejects_an_incorrect_password(): void
    {
        config([
            'admin.email' => 'admin@example.com',
            'admin.password' => 'test-only-password',
        ]);

        $this->post(route('admin.login.store'), [
            'email' => 'admin@example.com',
            'password' => 'incorrect-password',
        ])
            ->assertSessionHasErrors('email');
    }

    public function test_staff_navigation_has_logout_without_admin_or_profile_switch_links(): void
    {
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertDontSee('href="' . route('admin.index') . '"', false)
            ->assertDontSee('topbar__role-switch')
            ->assertSee('topbar__profile')
            ->assertSee('action="' . route('staff.logout') . '"', false)
            ->assertSee('Log out')
            ->assertSee('Appointments')
            ->assertDontSee('>Calendar</a>', false);
    }

    public function test_dashboard_reschedule_errors_render_inside_the_reschedule_form(): void
    {
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertSee('id="reschedule-error"', false)
            ->assertSee('role="alert"', false);
    }

    public function test_reschedule_forms_require_an_available_time_selection(): void
    {
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertSee('id="reschedule-slot-time" required', false)
            ->assertSee('Choose an available time');

        $this->get(route('appointments.index'))
            ->assertOk()
            ->assertSee('id="manage-reschedule-time" class="input" required', false)
            ->assertSee('Choose an available time');

    }

    public function test_add_patient_uses_a_preferred_date_and_keeps_appointment_time(): void
    {
        $this->get(route('patients.index'))
            ->assertOk()
            ->assertSee('id="ap-date"', false)
            ->assertSee('type="date"', false)
            ->assertSee('Preferred date')
            ->assertSee('Appointment time')
            ->assertDontSee('Preferred day');
    }
}
