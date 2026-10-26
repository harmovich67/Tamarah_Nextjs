/**
 * Branch pickup marker. Checked on the live server: the customer checkout (`POST /client/orders/checkout`) IGNORES
 * `delivery_type=branch` and `branch_id` (the order is saved as a home delivery with `delivery_type: null`), but it does save
 * `notes`. So the storefront writes the pickup into the notes as `[pickup:<branch id>] ...` and the dashboard reads it back.
 * Delete this once the backend stores the delivery type of customer orders.
 */
const MARKER = /\[pickup:(\d+)\]\s*/;

/** The notes to send with a pickup order: the marker, a readable line, then what the customer wrote. */
export function pickupNotes({ branchId, branchName = '', notes = '' }) {
  const readable = branchName ? `استلام من الفرع: ${branchName}` : 'استلام من الفرع';
  return [`[pickup:${branchId}] ${readable}`, String(notes || '').trim()].filter(Boolean).join('\n');
}

/** `{ branchId, notes }`: the branch id of the marker (null when there is none) and the notes without the marker line. */
export function readPickup(notes) {
  const text = String(notes ?? '');
  const hit = text.match(MARKER);
  if (!hit) return { branchId: null, notes: text };
  const rest = text.replace(MARKER, '').replace(/^استلام من الفرع:?[^\n]*\n?/, '').trim();
  return { branchId: Number(hit[1]), notes: rest };
}
