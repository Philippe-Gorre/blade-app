<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
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
            ->assertSee('name="email"', false)
            ->assertSee('type="password"', false)
            ->assertSee('No, continue without one');
    }

    public function test_patient_portal_shows_a_required_cellphone_field(): void
    {
        $response = $this->get(route('patient-portal'));

        $response->assertOk()
            ->assertSee('Cellphone number')
            ->assertSee('name="phone"', false)
            ->assertSee('type="tel"', false)
            ->assertSee('required', false)
            ->assertSee(route('patient-portal.preview'), false);
    }

    public function test_patient_portal_preview_includes_sessions_and_payments(): void
    {
        $response = $this->get(route('patient-portal.preview'));

        $response->assertOk()
            ->assertSee('Sample portal preview')
            ->assertSee('Upcoming')
            ->assertSee('Patient history')
            ->assertSee('Payments')
            ->assertSee('No payment is processed or saved');
    }

    public function test_in_session_page_is_available_from_staff_navigation(): void
    {
        $response = $this->get(route('in-session.index'));

        $response->assertOk()
            ->assertSee('Ready for you')
            ->assertSee('Active sessions')
            ->assertSee('Completed today')
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

        $response->assertOk()
            ->assertDontSee('href="' . route('in-session.index') . '"', false);
    }

    public function test_staff_billing_recalls_and_reports_pages_render(): void
    {
        $this->get(route('billing.index'))->assertOk()->assertSee('Collected today');
        $this->get(route('recalls.index'))->assertOk()->assertSee('Reminders previewed in this list');
        $this->get(route('reports.index'))->assertOk()->assertSee('Appointments by day');

        $this->get(route('billing.index', ['workspace' => 'doctor']))
            ->assertOk()
            ->assertSee('Doctor')
            ->assertSee(route('in-session.index', ['workspace' => 'doctor']), false);
    }
}
