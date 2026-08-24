const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({
  limit: "10mb"
}));

// --------------------------------------------------
// Cloudinary Configuration
// --------------------------------------------------

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --------------------------------------------------
// MongoDB Connection - Vercel Serverless Friendly
// --------------------------------------------------

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false
  });

  console.log("MongoDB Atlas Connected");

  return cachedConnection;
}

// --------------------------------------------------
// India Date / Time Helpers
// --------------------------------------------------

function getIndiaDate() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());
}

function getIndiaTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(new Date());
}

// --------------------------------------------------
// Database Schema
// --------------------------------------------------

const AttendanceSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    date: {
      type: String,
      required: true
    },

    timeIn: {
      type: String,
      default: ""
    },

    locationIn: {
      type: String,
      default: ""
    },

    photoIn: {
      type: String,
      default: ""
    },

    timeOut: {
      type: String,
      default: "Awaiting Log"
    },

    locationOut: {
      type: String,
      default: "Awaiting Log"
    },

    photoOut: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      default: "PENDING"
    }
  },
  {
    timestamps: true
  }
);

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance API is running on Vercel.",
    time: getIndiaTime()
  });
});

// --------------------------------------------------
// POST /api/attendance
// Check-In / Check-Out
// --------------------------------------------------

app.post("/api/attendance", async (req, res) => {
  try {
    await connectDB();

    const {
      username,
      imageBase64,
      latitude,
      longitude,
      actionType
    } = req.body;

    // -------------------------------
    // Validation
    // -------------------------------

    if (!username || typeof username !== "string") {
      return res.status(400).json({
        error: "Please provide a valid username."
      });
    }

    if (!["in", "out"].includes(actionType)) {
      return res.status(400).json({
        error: "actionType must be either 'in' or 'out'."
      });
    }

    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null
    ) {
      return res.status(400).json({
        error: "Latitude and longitude are required."
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        error: "Invalid latitude or longitude."
      });
    }

    const normalizedUsername = username.trim().toUpperCase();

    const targetDate = getIndiaDate();
    const targetTime = getIndiaTime();

    const telemetryString =
      `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

    // --------------------------------------------------
    // Image Upload
    // --------------------------------------------------

    let photoUrl = "";

    if (imageBase64) {
      const uploadResult = await cloudinary.uploader.upload(
        imageBase64,
        {
          folder: "paired_attendance_system",
          resource_type: "image"
        }
      );

      photoUrl = uploadResult.secure_url;
    }

    // --------------------------------------------------
    // CHECK-IN
    // --------------------------------------------------

    if (actionType === "in") {

      // Prevent multiple check-ins on the same day
      const existingRecord = await Attendance.findOne({
        username: normalizedUsername,
        date: targetDate
      });

      if (existingRecord) {
        return res.status(409).json({
          error: "A Check-In record already exists for this username today."
        });
      }

      const newRecord = new Attendance({
        username: normalizedUsername,
        date: targetDate,
        timeIn: targetTime,
        locationIn: telemetryString,
        photoIn: photoUrl,
        status: "PENDING"
      });

      await newRecord.save();

      return res.status(201).json({
        success: true,
        message: "Check-In documented successfully.",
        record: newRecord
      });
    }

    // --------------------------------------------------
    // CHECK-OUT
    // --------------------------------------------------

    const existingTodayLog = await Attendance.findOne({
      username: normalizedUsername,
      date: targetDate
    });

    if (!existingTodayLog) {
      return res.status(400).json({
        error: "No active Check-In record captured today for this username."
      });
    }

    if (
      existingTodayLog.timeOut &&
      existingTodayLog.timeOut !== "Awaiting Log"
    ) {
      return res.status(409).json({
        error: "This username has already checked out today."
      });
    }

    existingTodayLog.timeOut = targetTime;
    existingTodayLog.locationOut = telemetryString;
    existingTodayLog.photoOut = photoUrl;
    existingTodayLog.status = "COMPLETED";

    await existingTodayLog.save();

    return res.status(200).json({
      success: true,
      message: "Check-Out documented successfully.",
      record: existingTodayLog
    });

  } catch (error) {
    console.error("Attendance Error:", error);

    return res.status(500).json({
      error: "Database tracking pipeline failure.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
});

// --------------------------------------------------
// GET /api/attendance
// Fetch Attendance Records
// --------------------------------------------------

app.get("/api/attendance", async (req, res) => {
  try {
    await connectDB();

    const records = await Attendance
      .find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(records);

  } catch (error) {
    console.error("Fetch Error:", error);

    return res.status(500).json({
      error: "Failed to access database logs."
    });
  }
});

// --------------------------------------------------
// DELETE /api/attendance/:id
// Delete Attendance Record
// --------------------------------------------------

app.delete("/api/attendance/:id", async (req, res) => {
  try {
    await connectDB();

    const result = await Attendance.findByIdAndDelete(
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        error: "Record not located."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Row data purged successfully."
    });

  } catch (error) {
    console.error("Delete Error:", error);

    return res.status(500).json({
      error: "Failed to delete row item."
    });
  }
});

// --------------------------------------------------
// Vercel Export
// IMPORTANT: No app.listen() on Vercel
// --------------------------------------------------

module.exports = app;
