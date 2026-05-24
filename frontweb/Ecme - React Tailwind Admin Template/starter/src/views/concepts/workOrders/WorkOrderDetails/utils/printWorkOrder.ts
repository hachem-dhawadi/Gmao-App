import type { WorkOrder, WoPart } from '@/services/WorkOrdersService'

const priorityColor: Record<string, string> = {
    critical: '#b91c1c',
    high:     '#ea580c',
    medium:   '#2563eb',
    low:      '#6b7280',
}

const statusColor: Record<string, string> = {
    open:        '#2563eb',
    in_progress: '#d97706',
    on_hold:     '#6b7280',
    completed:   '#059669',
    cancelled:   '#dc2626',
}

const statusLabel: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold',
    completed: 'Completed', cancelled: 'Cancelled',
}

const priorityLabel: Record<string, string> = {
    low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}

function fmt(date: string | null | undefined) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function checklistHtml(items: WorkOrder['checklist_items']) {
    if (!items || items.length === 0) return ''
    const rows = items.map(item => `
        <div class="checklist-item">
            <div class="checkbox ${item.is_completed ? 'checked' : ''}">
                ${item.is_completed ? '<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </div>
            <span class="${item.is_completed ? 'line-through text-muted' : ''}">${item.title}</span>
            ${item.is_completed && item.completed_by ? `<span class="text-muted text-xs ml-auto">${item.completed_by}</span>` : ''}
        </div>
    `).join('')

    const done  = items.filter(i => i.is_completed).length
    const total = items.length

    return `
        <div class="section">
            <div class="section-title">Checklist <span class="text-muted">${done}/${total} completed</span></div>
            <div class="checklist">${rows}</div>
        </div>
    `
}

function partsHtml(parts: WoPart[]) {
    if (parts.length === 0) return ''
    const rows = parts.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${p.item?.name ?? '—'}</strong><br><span class="text-muted">${p.item?.code ?? ''}</span></td>
            <td>${Math.abs(p.quantity)} ${p.item?.unit ?? ''}</td>
            <td>${p.warehouse?.name ?? '—'}</td>
            <td>${p.move_type === 'out' ? 'Used' : 'Scrapped'}</td>
        </tr>
    `).join('')

    return `
        <div class="section">
            <div class="section-title">Parts Used (${parts.length})</div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Warehouse</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `
}

function closureHtml(wo: WorkOrder) {
    if (wo.status !== 'completed' && wo.status !== 'cancelled') return ''
    if (!wo.failure_code && !wo.root_cause && !wo.resolution_notes) return ''

    return `
        <div class="section">
            <div class="section-title">Failure Analysis</div>
            <div class="fields-grid">
                ${wo.failure_code ? `<div class="field"><div class="field-label">Failure Code</div><div class="field-value">${wo.failure_code}</div></div>` : ''}
                ${wo.root_cause   ? `<div class="field"><div class="field-label">Root Cause</div><div class="field-value">${wo.root_cause}</div></div>` : ''}
            </div>
            ${wo.resolution_notes ? `<div class="field mt-10"><div class="field-label">Resolution Notes</div><div class="field-value">${wo.resolution_notes}</div></div>` : ''}
        </div>
    `
}

export function printWorkOrder(wo: WorkOrder, parts: WoPart[]) {
    const priorityC = priorityColor[wo.priority] ?? '#6b7280'
    const statusC   = statusColor[wo.status]     ?? '#6b7280'
    const assignees = wo.assigned_members.map(m => m.name ?? '—').join(', ') || '—'
    const printedAt = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Work Order ${wo.code}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    padding: 24px 32px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 20px;
  }
  .header-left h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .header-left .subtitle { font-size: 11px; color: #777; }
  .header-right { text-align: right; }
  .code-badge {
    display: inline-block;
    font-family: monospace;
    font-size: 15px;
    font-weight: 700;
    color: #7c3aed;
    border: 1.5px solid #7c3aed;
    border-radius: 6px;
    padding: 3px 10px;
    margin-bottom: 4px;
  }
  .printed-at { font-size: 10px; color: #aaa; }

  /* ── Meta row ── */
  .meta-row {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.6); }

  /* ── Fields grid ── */
  .fields-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
    padding: 14px 16px;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #eee;
  }
  .field-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #999;
    margin-bottom: 3px;
  }
  .field-value { font-size: 12px; font-weight: 600; color: #1a1a1a; }

  /* ── Description ── */
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #888;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }
  .description-box {
    padding: 10px 14px;
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 6px;
    font-size: 12px;
    color: #444;
    white-space: pre-wrap;
    min-height: 60px;
  }

  /* ── Checklist ── */
  .checklist { display: flex; flex-direction: column; gap: 6px; }
  .checklist-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px dotted #eee;
    font-size: 12px;
  }
  .checkbox {
    width: 15px;
    height: 15px;
    border: 1.5px solid #888;
    border-radius: 3px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .checkbox.checked { background: #059669; border-color: #059669; }
  .line-through { text-decoration: line-through; color: #aaa; }
  .text-muted { color: #aaa; font-size: 10px; }
  .text-xs { font-size: 10px; }
  .ml-auto { margin-left: auto; }

  /* ── Parts table ── */
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    border-bottom: 1.5px solid #ddd;
    padding: 5px 8px;
  }
  td {
    padding: 6px 8px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 11px;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafafa; }

  /* ── Signature section ── */
  .signature-section {
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px dashed #ccc;
  }
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 28px;
  }
  .signature-line {
    border-top: 1px solid #555;
    padding-top: 5px;
    margin-top: 36px;
    font-size: 10px;
    color: #888;
    text-align: center;
  }

  /* ── Print ── */
  @media print {
    @page { size: A4; margin: 12mm 14mm; }
    body { padding: 0; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Work Order</h1>
      <div class="subtitle">Maintenance Work Order — Field Copy</div>
    </div>
    <div class="header-right">
      <div class="code-badge">${wo.code}</div>
      <div class="printed-at">Printed: ${printedAt}</div>
    </div>
  </div>

  <!-- Status + Priority badges -->
  <div class="meta-row">
    <span class="badge" style="background:${statusC}">
      <span class="dot"></span>${statusLabel[wo.status] ?? wo.status}
    </span>
    <span class="badge" style="background:${priorityC}">
      <span class="dot"></span>${priorityLabel[wo.priority] ?? wo.priority} Priority
    </span>
  </div>

  <!-- Title -->
  <div style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">${wo.title}</div>

  <!-- Key fields grid -->
  <div class="fields-grid">
    <div>
      <div class="field-label">Asset</div>
      <div class="field-value">${wo.asset?.name ?? '—'} ${wo.asset ? `<span style="font-weight:400;color:#888;font-family:monospace;font-size:10px">${wo.asset.code}</span>` : ''}</div>
    </div>
    <div>
      <div class="field-label">Assigned To</div>
      <div class="field-value">${assignees}</div>
    </div>
    <div>
      <div class="field-label">Due Date</div>
      <div class="field-value">${fmt(wo.due_at)}</div>
    </div>
    <div>
      <div class="field-label">Opened</div>
      <div class="field-value">${fmt(wo.opened_at)}</div>
    </div>
    <div>
      <div class="field-label">Estimated Time</div>
      <div class="field-value">${wo.estimated_minutes != null ? `${wo.estimated_minutes} min` : '—'}</div>
    </div>
    <div>
      <div class="field-label">Created By</div>
      <div class="field-value">${wo.created_by?.name ?? '—'}</div>
    </div>
  </div>

  <!-- Description -->
  <div class="section">
    <div class="section-title">Description / Instructions</div>
    <div class="description-box">${wo.description || 'No description provided.'}</div>
  </div>

  ${checklistHtml(wo.checklist_items)}
  ${partsHtml(parts)}
  ${closureHtml(wo)}

  <!-- Signature section -->
  <div class="signature-section">
    <div style="font-size:10px;color:#aaa;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Sign-off</div>
    <div class="signature-grid">
      <div>
        <div class="signature-line">Technician Signature</div>
      </div>
      <div>
        <div class="signature-line">Supervisor Signature</div>
      </div>
      <div>
        <div class="signature-line">Date Completed</div>
      </div>
    </div>
  </div>

</body>
</html>`

    const win = window.open('', '_blank', 'width=860,height=1100')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
        win.print()
    }, 400)
}
