<x-mail::message>
# {{ $isOverdue ? '⚠ PM Plan Overdue' : 'PM Plan Due' }}

Hi **{{ $recipientName }}**,

@if($isOverdue)
A preventive maintenance plan is **overdue** and requires immediate attention.
@else
A preventive maintenance plan is **due** and needs to be executed.
@endif

<x-mail::panel>
**{{ $plan->code }} — {{ $plan->name }}**

| Field | Value |
|---|---|
| Status | {{ ucfirst($plan->status) }} |
| Last Run | {{ $trigger->last_run_at ? \Carbon\Carbon::parse($trigger->last_run_at)->format('d M Y') : 'Never run' }} |
| Due Date | {{ $trigger->next_run_at ? \Carbon\Carbon::parse($trigger->next_run_at)->format('d M Y') : '—' }} |
@if($isOverdue)
| Overdue By | {{ $trigger->next_run_at ? \Carbon\Carbon::parse($trigger->next_run_at)->diffForHumans() : '—' }} |
@endif
</x-mail::panel>

Please log in to the GMAO system to review and execute this maintenance plan.

<x-mail::button :url="config('app.url')" color="{{ $isOverdue ? 'red' : 'primary' }}">
View PM Plan
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
