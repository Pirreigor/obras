const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const empresaRoutes = require("./routes/empresa.routes");
const usuarioRoutes = require("./routes/usuario.routes");
const vistaRoutes = require("./routes/vista.routes");
const zonaRoutes = require("./routes/zona.routes");
const obraRoutes = require("./routes/obra.routes");
const subObraRoutes = require("./routes/subObra.routes");
const actividadCatalogoRoutes = require("./routes/actividadCatalogo.routes");
const calendarioRoutes = require("./routes/calendario.routes");
const uploadRoutes = require("./routes/upload.routes");

const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "obras-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/empresas", empresaRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/vistas", vistaRoutes);
app.use("/api/zonas", zonaRoutes);
app.use("/api/obras", obraRoutes);
app.use("/api/sub-obras", subObraRoutes);
app.use("/api/actividades-catalogo", actividadCatalogoRoutes);
app.use("/api/calendario", calendarioRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
