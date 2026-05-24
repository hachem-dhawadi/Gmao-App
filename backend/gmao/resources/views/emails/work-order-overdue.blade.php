<x-mail::message>
# ⚠ Work Order Overdue

Hi **{{ $recipientName }}**,

The following work order is **overdue** and has not been completed.

<x-mail::panel>
**{{ $wo->code }} — {{ $wo->title }}**

| Field | Value |
|---|---|
| Status | {{ ucfirst(str_replace('_', ' ', $wo->status)) }} |
| Priority | {{ ucfirst($wo->priority) }} |
| Asset | {{ optional($wo->asset)->name ?? '—' }} |
| Due Date | {{ $wo->due_at ? \Carbon\Carbon::parse($wo->due_at)->format('d M Y') : '—' }} |
| Overdue By | {{ $wo->due_at ? \Carbon\Carbon::parse($wo->due_at)->diffForHumans() : '—' }} |
</x-mail::panel>

Please take action to complete or reassign this work order as soon as possible.

<x-mail::button :url="config('app.url')" color="red">
View Work Order
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
