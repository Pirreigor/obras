const { Router } = require("express");

const { list, create } = require("../controllers/actividadCatalogo.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.post("/", requireRole("ADMINISTRADOR"), create);

module.exports = router;
