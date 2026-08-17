const { evidenciaDisponible, subirEvidencia } = require("../utils/evidencia");

async function subirArchivo(req, res) {
  if (!evidenciaDisponible()) {
    return res.status(501).json({ message: "La subida de evidencia todavia no esta configurada" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Falta el archivo" });
  }

  const url = await subirEvidencia({ buffer: req.file.buffer });

  return res.status(201).json({ url });
}

module.exports = { subirArchivo };
