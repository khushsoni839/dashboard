const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json());

/* ================== MongoDB Connection ================== */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    isConnected = true;
    console.log("✅ MongoDB Atlas Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
}

connectDB();

/* ================== Schema ================== */

const roundSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Assigned", "Pending", "Resolved"],
      default: "Assigned",
    },

    additionalStatus: {
      type: String,
      default: "Action Required",
    },

    additionalOptions: {
      type: [String],
      default: [
        "Action Required",
        "Forward",
        "Specialist Assignment",
        "Investigation",
      ],
    },

    from: { type: String, default: "" },
    to: { type: String, default: "" },
    timeIn: { type: String, default: "" },
    timeOut: { type: String, default: "" },
    mode: { type: String, default: "" },

    km: { type: String, default: "" },
    amount: { type: String, default: "" },

    problem: { type: String, default: "" },
    actionTaken: { type: String, default: "" },
    serial: { type: String, default: "" },
    otp: { type: String, default: "" },
    dop: { type: String, default: "" },
    invoice: { type: String, default: "" },

    time: {
      type: String,
      default: () => new Date().toLocaleString(),
    },

    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },

    complaintNumber: String,
    assignEngineer: String,
    taskStatus: String,
    additionalStatus: String,
    date: String,
    name: String,
    phone: String,
    state: String,
    product: String,

    selectedModel: {
      model: String,
    },

    rounds: [roundSchema],
  },
  { timestamps: true }
);

const Task =
  mongoose.models.Task || mongoose.model("Task", taskSchema);

/* ================== ROUTES ================== */

// Health Check
app.get("/", async (req, res) => {
  await connectDB();
  res.status(200).json({
    success: true,
    message: "🚀 API Running Successfully",
  });
});

// Get All Tasks
app.get("/tasks", async (req, res) => {
  try {
    await connectDB();

    const tasks = await Task.find().sort({
      createdAt: -1,
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Get Single Task
app.get("/tasks/:taskId", async (req, res) => {
  try {
    await connectDB();

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Create Task
app.post("/tasks", async (req, res) => {
  try {
    await connectDB();

    const task = new Task(req.body);
    const saved = await task.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Add Round
app.post("/tasks/:taskId/round", async (req, res) => {
  try {
    await connectDB();

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $push: {
          rounds: req.body,
        },
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Delete Task
app.delete("/tasks/:taskId", async (req, res) => {
  try {
    await connectDB();

    await Task.findByIdAndDelete(req.params.taskId);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ================== EXPORT FOR VERCEL ================== */
module.exports = app;