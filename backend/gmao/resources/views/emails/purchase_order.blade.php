<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Order {{ $purchaseOrder->code }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
        .wrapper { max-width: 680px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #1a56db; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 4px 0 0; font-size: 14px; opacity: .85; }
        .body { padding: 32px; }
        .meta { margin-bottom: 24px; }
        .meta table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 6px 0; font-size: 14px; vertical-align: top; }
        .meta td:first-child { color: #666; width: 160px; }
        h2 { font-size: 15px; color: #1a56db; margin: 28px 0 10px; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .items-table th { background: #f0f4ff; text-align: left; padding: 8px 10px; font-weight: 600; border-bottom: 2px solid #dde4f5; }
        .items-table td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .items-table tfoot td { font-weight: 700; padding: 10px; background: #f9fafb; }
        .footer { background: #f4f4f4; text-align: center; padding: 18px 32px; font-size: 12px; color: #999; }
        .note { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 14px; margin-top: 24px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>Purchase Order {{ $purchaseOrder->code }}</h1>
        <p>Issued {{ $purchaseOrder->ordered_at?->format('F j, Y') ?? $purchaseOrder->created_at->format('F j, Y') }}</p>
    </div>

    <div class="body">
        <div class="meta">
            <table>
                <tr>
                    <td>Supplier</td>
                    <td><strong>{{ $purchaseOrder->supplier?->name ?? '—' }}</strong></td>
                </tr>
                @if($purchaseOrder->supplier?->contact_name)
                <tr>
                    <td>Contact</td>
                    <td>{{ $purchaseOrder->supplier->contact_name }}</td>
                </tr>
                @endif
                <tr>
                    <td>PO Reference</td>
                    <td>{{ $purchaseOrder->code }}</td>
                </tr>
                @if($purchaseOrder->supplier_reference)
                <tr>
                    <td>Your Reference</td>
                    <td>{{ $purchaseOrder->supplier_reference }}</td>
                </tr>
                @endif
                @if($purchaseOrder->expected_delivery_at)
                <tr>
                    <td>Expected Delivery</td>
                    <td>{{ $purchaseOrder->expected_delivery_at->format('F j, Y') }}</td>
                </tr>
                @endif
                <tr>
                    <td>Issued By</td>
                    <td>{{ $purchaseOrder->createdBy?->user?->name ?? '—' }}</td>
                </tr>
            </table>
        </div>

        <h2>Order Lines</h2>
        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Code</th>
                    <th style="text-align:right">Qty</th>
                    <th style="text-align:right">Unit Price</th>
                    <th style="text-align:right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($purchaseOrder->lines as $i => $line)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $line->item?->name ?? '—' }}</td>
                    <td>{{ $line->item?->code ?? '—' }}</td>
                    <td style="text-align:right">{{ $line->qty_ordered }} {{ $line->item?->unit }}</td>
                    <td style="text-align:right">{{ number_format($line->unit_price, 2) }}</td>
                    <td style="text-align:right">{{ number_format($line->qty_ordered * $line->unit_price, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="text-align:right">Total Amount</td>
                    <td style="text-align:right">{{ number_format($purchaseOrder->total_amount, 2) }}</td>
                </tr>
            </tfoot>
        </table>

        @if($purchaseOrder->supplier_note)
        <div class="note">
            <strong>Note to Supplier:</strong><br />
            {{ $purchaseOrder->supplier_note }}
        </div>
        @endif
    </div>

    <div class="footer">
        This is an automated purchase order email. Please do not reply directly to this message.
    </div>
</div>
</body>
</html>
