const { Router } = require("express");
const multer = require("multer");

const { subirArchivo } = require("../controllers/upload.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

router.use(requireAuth);

router.post("/", upload.single("evidencia"), subirArchivo);

module.exports = router;
