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

function subirEvidencia({ buffer }) {
  if (!configurado) {
    return Promise.reject(new Error("La subida de evidencia todavia no esta configurada"));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "obras/evidencias" }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

module.exports = { evidenciaDisponible, subirEvidencia };
