const { evidenciaDisponible, subirEvidencia } = require("../utils/evidencia");

const CARPETAS_VALIDAS = {
  evidencias: "obras/evidencias",
  partidas: "obras/partidas",
};

async function subirArchivo(req, res) {
  if (!evidenciaDisponible()) {
    return res.status(501).json({ message: "La subida de archivos todavia no esta configurada" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Falta el archivo" });
  }

  const folder = CARPETAS_VALIDAS[req.body.carpeta] || CARPETAS_VALIDAS.evidencias;
  const url = await subirEvidencia({ buffer: req.file.buffer, folder });

  return res.status(201).json({ url });
}

module.exports = { subirArchivo };
