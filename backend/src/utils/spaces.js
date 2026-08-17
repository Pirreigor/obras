const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

const REGION = process.env.SPACES_REGION || "nyc3";
const BUCKET = process.env.SPACES_BUCKET;
const ENDPOINT = process.env.SPACES_ENDPOINT || `https://${REGION}.digitaloceanspaces.com`;
const CDN_URL = process.env.SPACES_CDN_URL || `https://${BUCKET}.${REGION}.digitaloceanspaces.com`;

const client =
  BUCKET && process.env.SPACES_KEY && process.env.SPACES_SECRET
    ? new S3Client({
        endpoint: ENDPOINT,
        region: REGION,
        credentials: { accessKeyId: process.env.SPACES_KEY, secretAccessKey: process.env.SPACES_SECRET },
      })
    : null;

function evidenciaDisponible() {
  return Boolean(client);
}

async function subirEvidencia({ buffer, mimetype, extension }) {
  if (!client) {
    throw new Error("La subida de evidencia todavia no esta configurada");
  }

  const nombre = `evidencias/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: nombre,
      Body: buffer,
      ContentType: mimetype,
      ACL: "public-read",
    })
  );

  return `${CDN_URL}/${nombre}`;
}

module.exports = { evidenciaDisponible, subirEvidencia };
