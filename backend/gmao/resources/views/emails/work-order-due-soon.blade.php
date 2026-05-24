<x-mail::message>
# ⏰ Work Order Due Soon

Hi **{{ $recipientName }}**,

A work order assigned to you is due in approximately **{{ $hoursLeft }} hour{{ $hoursLeft === 1 ? '' : 's' }}** and has not been completed yet.

<x-mail::panel>
**{{ $wo->code }} — {{ $wo->title }}**

| Field | Value |
|---|---|
| Status | {{ ucfirst(str_replace('_', ' ', $wo->status)) }} |
| Priority | {{ ucfirst($wo->priority) }} |
| Asset | {{ optional($wo->asset)->name ?? '—' }} |
| Due Date | {{ $wo->due_at ? \Carbon\Carbon::parse($wo->due_at)->format('d M Y H:i') : '—' }} |
| Due In | **{{ $hoursLeft }} hour{{ $hoursLeft === 1 ? '' : 's' }}** |
</x-mail::panel>

Please log in and update the work order status before the deadline.

<x-mail::button :url="config('app.url')" color="primary">
View Work Order
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
