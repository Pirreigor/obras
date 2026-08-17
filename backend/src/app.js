const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const proyectoRoutes = require("./routes/proyecto.routes");

const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "obras-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/proyectos", proyectoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
