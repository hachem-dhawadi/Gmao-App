<x-mail::message>
# ⚠ Low Stock Alert

Hi **{{ $recipientName }}**,

An inventory item has dropped **below minimum stock level** and may need to be reordered.

<x-mail::panel>
**{{ $item->code }} — {{ $item->name }}**

| Field | Value |
|---|---|
| Current Stock | **{{ $currentStock }} {{ $item->unit ?? 'units' }}** |
| Minimum Stock | {{ $minStock }} {{ $item->unit ?? 'units' }} |
| Shortage | {{ max(0, $minStock - $currentStock) }} {{ $item->unit ?? 'units' }} below minimum |
</x-mail::panel>

Please create a purchase order or restock this item to avoid work order delays.

<x-mail::button :url="config('app.url')">
View Inventory
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
