import Modal from "./Modal";

// Modal de advertencia generico para acciones destructivas o delicadas
// (desactivar/eliminar obras, sub-obras, etc). `danger` pinta el boton
// de confirmar en rojo para eliminar/desactivar; dejalo en false para
// confirmaciones neutras (ej. reactivar).
function ConfirmModal({
  title = "Confirmar accion",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button type="button" className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
