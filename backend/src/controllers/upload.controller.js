const path = require("path");
const { evidenciaDisponible, subirEvidencia } = require("../utils/spaces");

async function subirArchivo(req, res) {
  if (!evidenciaDisponible()) {
    return res.status(501).json({ message: "La subida de evidencia todavia no esta configurada" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Falta el archivo" });
  }

  const extension = path.extname(req.file.originalname).replace(".", "").toLowerCase();
  const url = await subirEvidencia({ buffer: req.file.buffer, mimetype: req.file.mimetype, extension });

  return res.status(201).json({ url });
}

module.exports = { subirArchivo };
