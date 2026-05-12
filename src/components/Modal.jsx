export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal"><h3>{title}</h3>{children}</div>
    </div>
  );
}

export function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <Modal title="Потвърждение" onClose={onCancel}>
      <p style={{ marginBottom: 16 }}>{msg}</p>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Отказ</button>
        <button className="btn btn-danger" onClick={onConfirm}>Изтрий</button>
      </div>
    </Modal>
  );
}
