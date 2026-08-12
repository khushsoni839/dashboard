
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json());

/* ================== ENV ================== */
const PORT = process.env.PORT || 5001;

/* ================== MongoDB Connection ================== */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
  process.exit(1);
});

/* ================== Schema ================== */
const roundSchema = new mongoose.Schema({
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
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },

  // Optional fields (matching your frontend table)
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
}, { timestamps: true });

const Task = mongoose.model("Task", taskSchema);

/* ================== ROUTES ================== */

// ✅ Health check
// 🔹 Get all tasks with pagination
app.get("/tasks", async (req, res) => {
  try {
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 30;

    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get single task
app.get("/tasks/:taskId", async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Create new task
app.post("/tasks", async (req, res) => {
  try {
    const task = new Task(req.body);
    const saved = await task.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Add round to task
app.post("/tasks/:taskId/round", async (req, res) => {
  try {
    const { taskId } = req.params;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        $push: { rounds: req.body },
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Delete task (optional but useful)
app.delete("/tasks/:taskId", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================== SERVER ================== */
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});