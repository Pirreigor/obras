import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";
import AceptarInvitacion from "./components/AceptarInvitacion";
import AsignarVistasPanel from "./components/AsignarVistasPanel";
import EmpresasPanel from "./components/EmpresasPanel";
import EquipoPanel from "./components/EquipoPanel";
import ObrasPanel from "./components/ObrasPanel";

function ConstructionArt() {
  return (
    <svg viewBox="0 0 480 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      {/* blueprint grid */}
      <g stroke="var(--hero-grid)" strokeWidth="1">
        <line x1="40" y1="0" x2="40" y2="500" />
        <line x1="120" y1="0" x2="120" y2="500" />
        <line x1="200" y1="0" x2="200" y2="500" />
        <line x1="280" y1="0" x2="280" y2="500" />
        <line x1="360" y1="0" x2="360" y2="500" />
        <line x1="440" y1="0" x2="440" y2="500" />
        <line x1="0" y1="40" x2="480" y2="40" />
        <line x1="0" y1="120" x2="480" y2="120" />
        <line x1="0" y1="200" x2="480" y2="200" />
        <line x1="0" y1="280" x2="480" y2="280" />
        <line x1="0" y1="360" x2="480" y2="360" />
      </g>

      {/* ground */}
      <line x1="0" y1="430" x2="480" y2="430" stroke="currentColor" strokeWidth="2" />

      {/* building frame under construction */}
      <g stroke="currentColor" strokeWidth="1.6" fill="none">
        <line x1="280" y1="430" x2="280" y2="120" />
        <line x1="330" y1="430" x2="330" y2="120" />
        <line x1="380" y1="430" x2="380" y2="120" />
        <line x1="430" y1="430" x2="430" y2="120" />
        <line x1="280" y1="430" x2="430" y2="430" />
        <line x1="280" y1="370" x2="430" y2="370" />
        <line x1="280" y1="310" x2="430" y2="310" />
        <line x1="280" y1="250" x2="430" y2="250" />
        <line x1="280" y1="190" x2="430" y2="190" />
        <line x1="280" y1="120" x2="430" y2="120" />
        {/* temporary bracing on the top two bays, unfinished look */}
        <line x1="280" y1="190" x2="330" y2="120" />
        <line x1="280" y1="120" x2="330" y2="190" />
        <line x1="330" y1="250" x2="380" y2="190" />
        <line x1="330" y1="190" x2="380" y2="250" />
      </g>

      {/* tower crane */}
      <g stroke="currentColor" strokeWidth="1.8" fill="none">
        <line x1="150" y1="430" x2="150" y2="70" />
        <line x1="150" y1="70" x2="440" y2="90" />
        <line x1="150" y1="70" x2="60" y2="86" />
        <line x1="150" y1="90" x2="120" y2="70" />
        <line x1="150" y1="90" x2="360" y2="87" />
        <rect x="138" y="58" width="22" height="16" rx="1" />
      </g>
      <rect x="52" y="80" width="22" height="16" rx="1" fill="currentColor" stroke="none" />
      <polygon points="150,44 150,60 172,52" fill="var(--accent)" stroke="none" />

      {/* hook + load */}
      <line x1="330" y1="88" x2="330" y2="230" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="312,230 348,230 342,252 318,252" fill="var(--accent)" stroke="none" />
      <line x1="316" y1="238" x2="344" y2="244" stroke="var(--hero-bg)" strokeWidth="1.5" />
      <line x1="316" y1="246" x2="344" y2="236" stroke="var(--hero-bg)" strokeWidth="1.5" />

      {/* rebar pile on the ground */}
      <g stroke="currentColor" strokeWidth="1.4">
        <line x1="30" y1="430" x2="72" y2="412" />
        <line x1="42" y1="430" x2="84" y2="412" />
        <line x1="54" y1="430" x2="96" y2="412" />
        <line x1="66" y1="430" x2="108" y2="412" />
      </g>

      {/* barrel */}
      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x="190" y="396" width="26" height="34" rx="3" />
        <line x1="190" y1="406" x2="216" y2="406" />
        <line x1="190" y1="418" x2="216" y2="418" />
      </g>
    </svg>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("obras_token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-hero-copy">
          <p className="login-hero-eyebrow">Sistema de seguimiento de obra</p>
          <h1>OBRAS</h1>
          <p>Cronogramas, avances y pedidos de material, todo en un mismo lugar.</p>
        </div>
        <div className="login-hero-art">
          <ConstructionArt />
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <h2>Ingresa a tu cuenta</h2>
            <p className="login-form-lede">
              Usa el correo y la contrasena que te compartieron por invitacion.
            </p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="login-footnote">
            &iquest;No tenes acceso? Pedile una invitacion a tu administrador.
          </p>
        </form>
      </div>
    </div>
  );
}

function AppShell({ user, onLogout }) {
  const items = useMemo(() => {
    if (user.rol === "SUPERADMINISTRADOR") {
      return [{ key: "empresas", label: "Empresas", render: () => <EmpresasPanel /> }];
    }

    const list = [];
    if (user.vistas?.includes("obras")) {
      list.push({ key: "obras", label: "Obras", render: () => <ObrasPanel /> });
    }
    if (user.vistas?.includes("equipo")) {
      list.push({ key: "equipo", label: "Equipo", render: () => <EquipoPanel /> });
    }
    if (user.rol === "ADMINISTRADOR") {
      list.push({ key: "asignar-vistas", label: "Asignar vistas", render: () => <AsignarVistasPanel /> });
    }
    return list;
  }, [user]);

  const [active, setActive] = useState(items[0]?.key || null);

  useEffect(() => {
    if (!items.some((item) => item.key === active)) {
      setActive(items[0]?.key || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const activeItem = items.find((item) => item.key === active);

  const content = activeItem ? (
    activeItem.render()
  ) : (
    <div className="panel-card">
      <h2>Todavia no hay nada para vos aca</h2>
      <p className="muted">
        Pedile a tu administrador que te asigne una vista, o espera a que se agreguen mas pantallas.
      </p>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header-brand">OBRAS</span>
        <div className="app-header-user">
          <span>
            {user.name} <span className="role-pill">{user.rol}</span>
          </span>
          <button className="btn-link" type="button" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>
      <div className="app-body">
        {items.length > 1 && (
          <nav className="app-sidebar">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === active ? "active" : ""}
                onClick={() => setActive(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
        <main className="app-content">{content}</main>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("obras_token");
    if (!token) {
      setCheckingSession(false);
      return;
    }

    apiFetch("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("obras_token"))
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("obras_token");
    setUser(null);
  }

  if (window.location.pathname === "/aceptar-invitacion") {
    return <AceptarInvitacion />;
  }

  if (checkingSession) {
    return <div className="standalone-panel" />;
  }

  if (user) {
    return <AppShell user={user} onLogout={handleLogout} />;
  }

  return <LoginScreen onLogin={setUser} />;
}

export default App;
