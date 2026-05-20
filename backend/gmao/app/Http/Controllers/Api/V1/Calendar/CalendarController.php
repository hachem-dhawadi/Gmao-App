<?php

namespace App\Http\Controllers\Api\V1\Calendar;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $isPrivileged   = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        $filterMemberId = $request->query('member_id');

        // Custom calendar events
        $eventsQuery = CalendarEvent::query()->where('company_id', $currentCompany->id);

        if (! $isPrivileged) {
            $eventsQuery->where('member_id', $currentMember->id);
        } elseif ($filterMemberId) {
            $eventsQuery->where('member_id', $filterMemberId);
        }

        $customEvents = $eventsQuery->get()->map(fn ($e) => [
            'id'        => 'ce-' . $e->id,
            'type'      => 'custom',
            'title'     => $e->title,
            'start_at'  => $e->start_at?->toISOString(),
            'end_at'    => $e->end_at?->toISOString(),
            'color'     => $e->color,
            'member_id' => $e->member_id,
            'db_id'     => $e->id,
        ])->values()->all();

        // Work order events — WOs with a due date that are not yet closed
        $woQuery = WorkOrder::query()
            ->where('company_id', $currentCompany->id)
            ->whereNotNull('due_at')
            ->whereIn('status', ['open', 'in_progress', 'on_hold'])
            ->select(['id', 'title', 'due_at', 'priority', 'status']);

        if (! $isPrivileged) {
            $woQuery->whereHas('assignedMembers', fn ($q) => $q->where('members.id', $currentMember->id));
        } elseif ($filterMemberId) {
            $woQuery->whereHas('assignedMembers', fn ($q) => $q->where('members.id', $filterMemberId));
        }

        $woEvents = $woQuery->get()->map(fn ($wo) => [
            'id'       => 'wo-' . $wo->id,
            'type'     => 'work_order',
            'title'    => $wo->title,
            'start_at' => $wo->due_at?->toISOString(),
            'end_at'   => null,
            'priority' => $wo->priority,
            'status'   => $wo->status,
            'db_id'    => $wo->id,
        ])->values()->all();

        return response()->json([
            'success' => true,
            'data'    => [
                'custom_events' => $customEvents,
                'wo_events'     => $woEvents,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'start_at' => 'required|date',
            'end_at'   => 'nullable|date',
            'color'    => 'nullable|string|max:50',
        ]);

        $event = CalendarEvent::create([
            'company_id' => $currentCompany->id,
            'member_id'  => $currentMember->id,
            'title'      => $validated['title'],
            'start_at'   => $validated['start_at'],
            'end_at'     => $validated['end_at'] ?? null,
            'color'      => $validated['color'] ?? 'blue',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Event created.',
            'data'    => ['event' => $this->format($event)],
        ], 201);
    }

    public function update(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $calendarEvent->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdmin = $currentMember->roles()->where('code', 'admin')->exists();

        if (! $isAdmin && (int) $calendarEvent->member_id !== (int) $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'title'    => 'sometimes|required|string|max:255',
            'start_at' => 'sometimes|required|date',
            'end_at'   => 'nullable|date',
            'color'    => 'nullable|string|max:50',
        ]);

        $calendarEvent->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event updated.',
            'data'    => ['event' => $this->format($calendarEvent->fresh())],
        ]);
    }

    public function destroy(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $calendarEvent->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdmin = $currentMember->roles()->where('code', 'admin')->exists();

        if (! $isAdmin && (int) $calendarEvent->member_id !== (int) $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $calendarEvent->delete();

        return response()->json(['success' => true, 'message' => 'Event deleted.']);
    }

    private function format(CalendarEvent $event): array
    {
        return [
            'id'        => 'ce-' . $event->id,
            'type'      => 'custom',
            'title'     => $event->title,
            'start_at'  => $event->start_at?->toISOString(),
            'end_at'    => $event->end_at?->toISOString(),
            'color'     => $event->color,
            'member_id' => $event->member_id,
            'db_id'     => $event->id,
        ];
    }
}
