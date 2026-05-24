<x-mail::message>
# Work Order Assigned

Hi **{{ $technicianName }}**,

A work order has been assigned to you.

<x-mail::panel>
**{{ $wo->code }} — {{ $wo->title }}**

| Field | Value |
|---|---|
| Status | {{ ucfirst(str_replace('_', ' ', $wo->status)) }} |
| Priority | {{ ucfirst($wo->priority) }} |
| Asset | {{ optional($wo->asset)->name ?? '—' }} |
| Due Date | {{ $wo->due_at ? \Carbon\Carbon::parse($wo->due_at)->format('d M Y') : 'No due date' }} |
</x-mail::panel>

@if($wo->description)
**Instructions:**
{{ $wo->description }}

@endif

Please log in to the GMAO system to view full details and update the work order.

<x-mail::button :url="config('app.url')">
View Work Order
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
