const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function enviarInvitacion({ to, link, rol, empresaNombre }) {
  if (!resend) {
    console.warn("RESEND_API_KEY no configurada: no se envio el correo de invitacion.");
    return;
  }

  await resend.emails.send({
    from: process.env.MAIL_FROM || "Obras <obras@donjoyero.com>",
    to,
    subject: `Te invitaron a Obras${empresaNombre ? ` (${empresaNombre})` : ""}`,
    html: `
      <p>Te invitaron a unirte a <strong>${empresaNombre || "Obras"}</strong> como <strong>${rol}</strong>.</p>
      <p><a href="${link}">Activa tu cuenta</a></p>
      <p>Si el enlace no funciona, copialo en tu navegador:</p>
      <p>${link}</p>
    `,
  });
}

module.exports = {
  enviarInvitacion,
};
