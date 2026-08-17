const { Router } = require("express");

const { listMisActividades } = require("../controllers/calendario.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

router.use(requireAuth);

router.get("/mias", listMisActividades);

module.exports = router;
