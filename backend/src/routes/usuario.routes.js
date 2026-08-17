const { Router } = require("express");

const { list } = require("../controllers/usuario.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth, requireRole("ADMINISTRADOR", "SUPERVISOR"));

router.get("/", list);

module.exports = router;
