import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesion");
        return;
      }

      localStorage.setItem("obras_token", data.token);
      setUser(data.user);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  }

  if (user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Hola, {user.name}</h1>
          <p>Rol: {user.rol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>Obras - Ingresar</h1>
        {error && <div className="error">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}

export default App;
