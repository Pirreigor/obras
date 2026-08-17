const { Router } = require("express");

const { list } = require("../controllers/vista.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth, requireRole("ADMINISTRADOR"));

router.get("/", list);

module.exports = router;
