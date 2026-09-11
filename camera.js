const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();

const app = express();

// --------------------------------------------------
// APP CONFIGURATION
// --------------------------------------------------

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --------------------------------------------------
// CLOUDINARY CONFIGURATION
// --------------------------------------------------

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --------------------------------------------------
// MONGODB CONNECTION
// --------------------------------------------------

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Atlas Linked Successfully");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
  });

// --------------------------------------------------
// INDIA TIME HELPERS
// --------------------------------------------------

const INDIA_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date/time in India.
 */
function getIndiaDateTime() {
  const now = new Date();

  const date = now.toLocaleDateString("en-IN", {
    timeZone: INDIA_TIMEZONE,
  });

  const time = now.toLocaleTimeString("en-IN", {
    timeZone: INDIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return {
    date,
    time,
  };
}

// --------------------------------------------------
// ATTENDANCE SCHEMA
// --------------------------------------------------

const AttendanceSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    // Check-In
    timeIn: {
      type: String,
      default: "",
    },

    locationIn: {
      type: String,
      default: "",
    },

    photoIn: {
      type: String,
      default: "",
    },

    // Check-Out
    timeOut: {
      type: String,
      default: "Awaiting Log",
    },

    locationOut: {
      type: String,
      default: "Awaiting Log",
    },

    photoOut: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("Attendance", AttendanceSchema);

// --------------------------------------------------
// POST ATTENDANCE
// --------------------------------------------------

app.post("/api/attendance", async (req, res) => {
  try {
    const {
      username,
      imageBase64,
      latitude,
      longitude,
      actionType,
    } = req.body;

    // ----------------------------------------------
    // VALIDATION
    // ----------------------------------------------

    if (!username) {
      return res.status(400).json({
        error: "Username is required.",
      });
    }

    if (!imageBase64) {
      return res.status(400).json({
        error: "Selfie image is required.",
      });
    }

    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null
    ) {
      return res.status(400).json({
        error: "GPS location is required.",
      });
    }

    if (!["in", "out"].includes(actionType)) {
      return res.status(400).json({
        error: "Invalid attendance action.",
      });
    }

    // ----------------------------------------------
    // INDIA DATE & TIME
    // ----------------------------------------------

    const { date: targetDate, time: targetTime } =
      getIndiaDateTime();

    console.log("-----------------------------------");
    console.log("Attendance Request");
    console.log("Employee:", username);
    console.log("Action:", actionType);
    console.log("India Date:", targetDate);
    console.log("India Time:", targetTime);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("-----------------------------------");

    // ----------------------------------------------
    // LOCATION STRING
    // ----------------------------------------------

    const telemetryString =
      `Lat: ${Number(latitude).toFixed(4)}, ` +
      `Lon: ${Number(longitude).toFixed(4)}`;

    // ----------------------------------------------
    // UPLOAD SELFIE TO CLOUDINARY
    // ----------------------------------------------

    const uploadResult = await cloudinary.uploader.upload(
      imageBase64,
      {
        folder: "paired_attendance_system",
        resource_type: "image",
      }
    );

    const photoUrl = uploadResult.secure_url;

    // ==================================================
    // CHECK-IN
    // ==================================================

    if (actionType === "in") {
      // Prevent multiple check-ins on the same day.
      const existingTodayLog = await Attendance.findOne({
        username: username.toUpperCase(),
        date: targetDate,
      });

      if (existingTodayLog) {
        return res.status(400).json({
          error: `You have already checked in today at ${existingTodayLog.timeIn}.`,
        });
      }

      const newRecord = new Attendance({
        username: username.toUpperCase(),

        date: targetDate,

        timeIn: targetTime,

        locationIn: telemetryString,

        photoIn: photoUrl,

        timeOut: "Awaiting Log",

        locationOut: "Awaiting Log",

        photoOut: "",

        status: "PENDING",
      });

      await newRecord.save();

      return res.status(201).json({
        message: `Check-In documented successfully at ${targetTime}.`,
        data: {
          username: username.toUpperCase(),
          date: targetDate,
          time: targetTime,
          location: telemetryString,
          photo: photoUrl,
          status: "PENDING",
        },
      });
    }

    // ==================================================
    // CHECK-OUT
    // ==================================================

    if (actionType === "out") {
      // Find today's check-in using INDIA DATE.
      const existingTodayLog = await Attendance.findOne({
        username: username.toUpperCase(),
        date: targetDate,
      });

      if (!existingTodayLog) {
        return res.status(400).json({
          error:
            "No Check-In record found for today. Please Check-In first.",
        });
      }

      // Prevent multiple check-outs.
      if (
        existingTodayLog.timeOut &&
        existingTodayLog.timeOut !== "Awaiting Log"
      ) {
        return res.status(400).json({
          error: `You have already checked out today at ${existingTodayLog.timeOut}.`,
        });
      }

      existingTodayLog.timeOut = targetTime;

      existingTodayLog.locationOut = telemetryString;

      existingTodayLog.photoOut = photoUrl;

      existingTodayLog.status = "COMPLETED";

      await existingTodayLog.save();

      return res.status(200).json({
        message: `Check-Out documented successfully at ${targetTime}.`,
        data: {
          username: username.toUpperCase(),
          date: targetDate,
          time: targetTime,
          location: telemetryString,
          photo: photoUrl,
          status: "COMPLETED",
        },
      });
    }
  } catch (error) {
    console.error("Attendance Error:", error);

    return res.status(500).json({
      error: "Database tracking pipeline failure.",
      details: error.message,
    });
  }
});

// --------------------------------------------------
// GET ALL ATTENDANCE
// --------------------------------------------------

app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find({})
      .sort({ _id: -1 });

    res.status(200).json(records);
  } catch (error) {
    console.error("Fetch Attendance Error:", error);

    res.status(500).json({
      error: "Failed to access database logs.",
    });
  }
});

// --------------------------------------------------
// DELETE ATTENDANCE
// --------------------------------------------------

app.delete("/api/attendance/:id", async (req, res) => {
  try {
    const result = await Attendance.findByIdAndDelete(
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        error: "Record not located.",
      });
    }

    res.status(200).json({
      message: "Row data purged successfully.",
    });
  } catch (error) {
    console.error("Delete Error:", error);

    res.status(500).json({
      error: "Failed to delete row item.",
    });
  }
});

// --------------------------------------------------
// SERVER
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server live on port ${PORT}`);
  console.log("Attendance timezone: Asia/Kolkata (IST)");
});



// const express = require('express');
// const mongoose = require('mongoose');
// const cloudinary = require('cloudinary').v2;
// const indianTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
// const recordDate = new Date(indianTime); 
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '10mb' }));

// // Cloudinary Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // MongoDB Atlas Connection
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB Atlas Linked Successfully'))
//   .catch(err => console.error('MongoDB Connection Error:', err));

// // Database schema tracking pairs of Check-In and Check-Out metrics together
// const AttendanceSchema = new mongoose.Schema({
//   username: { type: String, required: true, uppercase: true },
//   date: { type: String, required: true },
//   timeIn: { type: String, default: '' },
//   locationIn: { type: String, default: '' },
//   photoIn: { type: String, default: '' },
//   timeOut: { type: String, default: 'Awaiting Log' },
//   locationOut: { type: String, default: 'Awaiting Log' },
//   photoOut: { type: String, default: '' },
//   status: {
//   type: String,
//   default: "PENDING"
// }
// });

// const Attendance = mongoose.model('Attendance', AttendanceSchema);

// // Attendance Punch Processing Router
// app.post('/api/attendance', async (req, res) => {
//   try {
//     const { username, imageBase64, latitude, longitude, actionType } = req.body;
    
//     if (!username) return res.status(400).json({ error: 'Please enter an identity name string parameter.' });

//     const targetDate = new Date().toLocaleDateString('en-IN');
//     const targetTime = new Date().toLocaleTimeString('en-IN');
//     const telemetryString = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;

//     // Upload base64 stream directly to Cloudinary storage bucket
//     const uploadResult = await cloudinary.uploader.upload(imageBase64, {
//       folder: 'paired_attendance_system'
//     });
//     const photoUrl = uploadResult.secure_url;

//     if (actionType === 'in') {
//       // Create a fresh new document entry for Check-In activity
//       const newRecord = new Attendance({
//         username: username,
//         date: targetDate,
//         timeIn: targetTime,
//         locationIn: telemetryString,
//         photoIn: photoUrl
//       });
//       await newRecord.save();
//       return res.status(201).json({ message: 'Check-In documented successfully.' });
//     } else {
//       // Find today's existing row document matching this employee signature to attach check-out metrics
//       const existingTodayLog = await Attendance.findOne({
//         username: username.toUpperCase(),
//         date: targetDate
//       });

//       if (!existingTodayLog) {
//         return res.status(400).json({ error: 'No active Check-In record captured today for this username.' });
//       }

//       // Update checkout properties in-place inside MongoDB Atlas
//       existingTodayLog.timeOut = targetTime;
//       existingTodayLog.locationOut = telemetryString;
//       existingTodayLog.photoOut = photoUrl;
//       await existingTodayLog.save();

//       return res.status(200).json({ message: 'Check-Out documented successfully.' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Database tracking pipeline failure.' });
//   }
// });

// // Fetch all unified attendance logs
// app.get('/api/attendance', async (req, res) => {
//   try {
//     const records = await Attendance.find({}).sort({ _id: -1 }); // Newest rows first
//     res.status(200).json(records);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to access database logs.' });
//   }
// });

// // Row deletion management endpoint
// app.delete('/api/attendance/:id', async (req, res) => {
//   try {
//     const result = await Attendance.findByIdAndDelete(req.params.id);
//     if (!result) return res.status(404).json({ error: 'Record not located.' });
//     res.status(200).json({ message: 'Row data purged successfully.' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete row item.' });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
