const { Router } = require("express");

const { list, create } = require("../controllers/empresa.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

const router = Router();

router.use(requireAuth, requireRole("SUPERADMINISTRADOR"));

router.get("/", list);
router.post("/", create);

module.exports = router;
