export default function WarningModal({ open, onClose, message }) {
  if (!open) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="warning-modal-title">
      <div className="modalCard">
        <h3 id="warning-modal-title">Transaction Blocked</h3>
        <p>{message}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
