<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Contracts\View\View;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HomeController extends Controller
{
    private const SLOT_OCCUPIED_MESSAGE = 'That appointment slot is already occupied.';

    public function __invoke(): View
    {
        return view('home');
    }

    public function availability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);
        $date = $validated['date'];
        $bookedSlots = Booking::query()
            ->whereDate('date', $date)
            ->where('status', '!=', 'cancelled')
            ->get(['time', 'chair'])
            ->map(fn (Booking $booking): string => $booking->chair.'|'.$booking->time)
            ->all();

        $availableSlots = [];
        foreach (config('clinic.time_slots', []) as $time) {
            if (Carbon::parse($date.' '.$time)->isPast()) {
                continue;
            }

            foreach (config('clinic.chairs', []) as $chair) {
                if (in_array($chair['id'].'|'.$time, $bookedSlots, true)) {
                    continue;
                }

                $availableSlots[] = [
                    'time' => $time,
                    'chair' => (int) $chair['id'],
                    'dentist' => $chair['dentist'],
                ];
            }
        }

        return response()->json(['available_slots' => $availableSlots]);
    }

    public function read(): JsonResponse
    {
        $bookings = Booking::query()
            ->orderBy('date')
            ->orderBy('id')
            ->get([
                'id',
                'patient_id',
                'first_name',
                'last_name',
                'service',
                'date',
                'time',
                'chair',
                'dentist',
                'status',
            ]);

        return response()->json(['bookings' => $bookings]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'last_name' => ['required', 'string', 'min:2', 'max:80'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[\d\s().-]+$/'],
            'email' => ['nullable', 'email', 'max:254'],
            'service' => [
                'required',
                'string',
                Rule::in(array_merge(
                    config('clinic.services_public', []),
                    config('clinic.services_staff', []),
                )),
            ],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time' => ['required', 'string', Rule::in(config('clinic.time_slots', []))],
            'chair' => ['required', 'integer', Rule::in(array_column(config('clinic.chairs', []), 'id'))],
            'note' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'string', Rule::in(config('clinic.booking_statuses', []))],
        ]);

        $phoneDigits = preg_replace('/\D+/', '', $validated['phone']) ?? '';
        if (strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
            throw ValidationException::withMessages([
                'phone' => 'Enter a valid phone number.',
            ]);
        }

        $this->ensureTimeIsNotPast($validated['date'], $validated['time']);
        $chair = collect(config('clinic.chairs', []))->firstWhere('id', (int) $validated['chair']);
        $identityKey = $this->patientIdentityKey(
            $validated['first_name'],
            $validated['last_name'],
            $validated['phone'],
        );

        try {
            $booking = DB::transaction(function () use ($validated, $chair, $identityKey): Booking {
                $this->ensureSlotIsAvailable(
                    $validated['date'],
                    $validated['time'],
                    (int) $validated['chair'],
                );

                $patient = Patient::query()->firstOrCreate(
                    ['identity_key' => $identityKey],
                    [
                        'first_name' => $validated['first_name'],
                        'last_name' => $validated['last_name'],
                        'phone' => $validated['phone'],
                        'email' => $validated['email'] ?? null,
                    ],
                );

                $patientHasAppointmentAtTime = Booking::query()
                    ->where('patient_id', $patient->id)
                    ->whereDate('date', $validated['date'])
                    ->where('time', $validated['time'])
                    ->where('status', '!=', 'cancelled')
                    ->exists();

                if ($patientHasAppointmentAtTime) {
                    throw ValidationException::withMessages([
                        'time' => 'This patient already has an appointment at that time.',
                    ]);
                }

                return $patient->bookings()->create([
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'phone' => $validated['phone'],
                    'email' => $validated['email'] ?? null,
                    'service' => $validated['service'],
                    'date' => $validated['date'],
                    'time' => $validated['time'],
                    'chair' => (int) $validated['chair'],
                    'dentist' => $chair['dentist'],
                    'note' => $validated['note'] ?? null,
                    'status' => $validated['status'] ?? 'confirmed',
                ]);
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages([
                'time' => self::SLOT_OCCUPIED_MESSAGE,
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Appointment booked successfully.',
                'booking' => [
                    'id' => $booking->id,
                    'patient_id' => $booking->patient_id,
                ],
            ], 201);
        }

        return redirect()->route('home')->with('status', 'Appointment booked successfully.');
    }

    public function update(Request $request, Booking $booking): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['sometimes', 'required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time' => ['sometimes', 'required', 'string', Rule::in(config('clinic.time_slots', []))],
            'chair' => ['sometimes', 'required', 'integer', Rule::in(array_column(config('clinic.chairs', []), 'id'))],
            'status' => ['sometimes', 'required', 'string', Rule::in(array_keys(config('clinic.statuses', [])))],
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages([
                'booking' => 'Provide at least one appointment field to update.',
            ]);
        }

        if (array_intersect(array_keys($validated), ['date', 'time', 'chair']) !== []) {
            $date = $validated['date'] ?? $booking->date;
            $time = $validated['time'] ?? $booking->time;
            $chairNumber = (int) ($validated['chair'] ?? $booking->chair);

            $this->ensureTimeIsNotPast($date, $time);
            $this->ensureSlotIsAvailable($date, $time, $chairNumber, $booking);

            $patientHasAppointmentAtTime = $booking->patient_id !== null && Booking::query()
                ->where('patient_id', $booking->patient_id)
                ->whereDate('date', $date)
                ->where('time', $time)
                ->where('status', '!=', 'cancelled')
                ->where('id', '!=', $booking->getKey())
                ->exists();

            if ($patientHasAppointmentAtTime) {
                throw ValidationException::withMessages([
                    'time' => 'This patient already has an appointment at that time.',
                ]);
            }
        }

        if (array_key_exists('chair', $validated)) {
            $chair = collect(config('clinic.chairs', []))
                ->firstWhere('id', (int) $validated['chair']);
            $validated['dentist'] = $chair['dentist'];
        }

        try {
            DB::transaction(function () use ($booking, $validated): void {
                $booking->fill($validated)->save();
            });
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages([
                'time' => self::SLOT_OCCUPIED_MESSAGE,
            ]);
        }

        return response()->json([
            'message' => 'Appointment updated successfully.',
            'booking' => $booking->only(['id', 'patient_id', 'date', 'time', 'chair', 'dentist', 'status']),
        ]);
    }

    private function ensureSlotIsAvailable(
        string $date,
        string $time,
        int $chair,
        ?Booking $except = null,
    ): void {
        $query = Booking::query()
            ->whereDate('date', $date)
            ->where('time', $time)
            ->where('chair', $chair)
            ->where('status', '!=', 'cancelled');

        if ($except !== null) {
            $query->where('id', '!=', $except->getKey());
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'time' => self::SLOT_OCCUPIED_MESSAGE,
            ]);
        }
    }

    private function ensureTimeIsNotPast(string $date, string $time): void
    {
        if (Carbon::parse($date.' '.$time)->isPast()) {
            throw ValidationException::withMessages([
                'time' => 'The selected appointment time has already passed.',
            ]);
        }
    }

    private function patientIdentityKey(string $firstName, string $lastName, string $phone): string
    {
        return hash('sha256', implode("\0", [
            mb_strtolower(preg_replace('/\s+/', ' ', trim($firstName)) ?? ''),
            mb_strtolower(preg_replace('/\s+/', ' ', trim($lastName)) ?? ''),
            preg_replace('/\D+/', '', $phone) ?? '',
        ]));
    }
}
