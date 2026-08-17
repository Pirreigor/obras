import { useState } from "react";
import { apiFetch } from "../api";

function AceptarInvitacion() {
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await apiFetch("/api/auth/aceptar-invitacion", {
        method: "POST",
        body: JSON.stringify({ token, name, password }),
      });
      localStorage.setItem("obras_token", data.token);
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="standalone-panel">
        <div className="login-form">
          <h2>Enlace invalido</h2>
          <p className="login-form-lede">Este enlace de invitacion no incluye un token. Pedile uno nuevo a quien te invito.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-panel">
      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <h2>Activa tu cuenta</h2>
          <p className="login-form-lede">Elegi tu nombre y una contrasena para empezar.</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">Contrasena</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button className="login-submit" type="submit" disabled={submitting}>
          {submitting ? "Activando..." : "Activar cuenta"}
        </button>
      </form>
    </div>
  );
}

export default AceptarInvitacion;
