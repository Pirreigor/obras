const { v2: cloudinary } = require("cloudinary");

const configurado = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (configurado) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function evidenciaDisponible() {
  return configurado;
}

// folder distingue el tipo de archivo (evidencias de cierre, archivos de
// partida, etc). resource_type "auto" deja que Cloudinary reconozca tanto
// imagenes como PDFs/Excel/Word (no todo es una foto).
function subirEvidencia({ buffer, folder = "obras/evidencias" }) {
  if (!configurado) {
    return Promise.reject(new Error("La subida de archivos todavia no esta configurada"));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

module.exports = { evidenciaDisponible, subirEvidencia };
