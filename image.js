const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 5000;

// ======================================
// CORS
// ======================================

app.use(cors());


// ======================================
// PERSISTENT STORAGE
// ======================================

// Render Persistent Disk is mounted here
const STORAGE_PATH = process.env.STORAGE_PATH || "/var/data";

// Upload folder
const uploadDir = path.join(STORAGE_PATH, "uploads");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}


// ======================================
// MULTER CONFIGURATION
// ======================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});


// ======================================
// SERVE UPLOADED IMAGES
// ======================================

app.use(
  "/uploads",
  express.static(uploadDir)
);


// ======================================
// UPLOAD API
// ======================================

app.post(
  "/upload",
  upload.single("image"),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded",
      });
    }

    const imageUrl =
      `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      filename: req.file.filename,
      url: imageUrl,
    });
  }
);


// ======================================
// ERROR HANDLER
// ======================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    error: err.message || "Something went wrong",
  });
});


// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${uploadDir}`);
});
