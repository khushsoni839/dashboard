// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const http = require("http");
// const socketIo = require("socket.io");
// require("dotenv").config();

// const app = express();

// /* ================== MIDDLEWARE ================== */
// app.use(cors());
// app.use(express.json());

// /* ================== ENV ================== */
// const PORT = process.env.PORT || 5000;

// /* ================== Create HTTP Server ================== */
// const server = http.createServer(app);

// /* ================== Socket.io Setup ================== */
// const io = socketIo(server, {
//   cors: {
//     origin: ["http://localhost:3000", "https://your-frontend-url.com"], // Add your frontend URLs
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   },
// });

// // Track connected users
// const connectedUsers = new Map();

// io.on("connection", (socket) => {
//   console.log(`🟢 New client connected: ${socket.id}`);

//   // User joins their personal room
//   socket.on("join-user-room", (userId) => {
//     if (userId) {
//       socket.join(`user_${userId}`);
//       connectedUsers.set(socket.id, userId);
//       console.log(`✅ User ${userId} joined room user_${userId}`);
      
//       // Send confirmation back to client
//       socket.emit("joined-room", { userId, success: true });
//     }
//   });

//   // Join engineer room (for filtering tasks by engineer)
//   socket.on("join-engineer-room", (engineerName) => {
//     if (engineerName) {
//       socket.join(`engineer_${engineerName}`);
//       console.log(`✅ Engineer ${engineerName} joined room engineer_${engineerName}`);
//     }
//   });

//   // Handle new round added
//   socket.on("new-round", (data) => {
//     console.log(`📢 New round added for task: ${data.taskId}`);
//     // Broadcast to all connected clients
//     io.emit("round-added", {
//       taskId: data.taskId,
//       round: data.round,
//       engineerId: data.engineerId,
//       timestamp: new Date().toISOString(),
//     });
//   });

//   // Handle disconnection
//   socket.on("disconnect", () => {
//     const userId = connectedUsers.get(socket.id);
//     if (userId) {
//       console.log(`🔴 User ${userId} disconnected`);
//       connectedUsers.delete(socket.id);
//     } else {
//       console.log(`🔴 Client disconnected: ${socket.id}`);
//     }
//   });
// });

// /* ================== MongoDB Connection ================== */
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("✅ MongoDB Atlas Connected"))
// .catch(err => {
//   console.error("❌ MongoDB Connection Error:", err.message);
//   process.exit(1);
// });

// /* ================== Schema ================== */
// const roundSchema = new mongoose.Schema({
//   status: {
//     type: String,
//     enum: ["Assigned", "Pending", "Resolved"],
//     default: "Assigned",
//   },
//   additionalStatus: {
//     type: String,
//     default: "Action Required",
//   },
//   additionalOptions: {
//     type: [String],
//     default: [
//       "Action Required",
//       "Forward",
//       "Specialist Assignment",
//       "Investigation",
//     ],
//   },

//   from: { type: String, default: "" },
//   to: { type: String, default: "" },
//   timeIn: { type: String, default: "" },
//   timeOut: { type: String, default: "" },
//   mode: { type: String, default: "" },

//   km: { type: String, default: "" },
//   amount: { type: String, default: "" },

//   problem: { type: String, default: "" },
//   actionTaken: { type: String, default: "" },
//   serial: { type: String, default: "" },
//   otp: { type: String, default: "" },
//   dop: { type: String, default: "" },
//   invoice: { type: String, default: "" },

//   time: {
//     type: String,
//     default: () => new Date().toLocaleString(),
//   },

//   location: {
//     lat: { type: Number, default: null },
//     lng: { type: Number, default: null },
//   },
// }, { timestamps: true });

// const taskSchema = new mongoose.Schema({
//   title: { type: String, default: "" },
//   description: { type: String, default: "" },

//   // Optional fields (matching your frontend table)
//   complaintNumber: String,
//   assignEngineer: String,
//   taskStatus: String,
//   additionalStatus: String,
//   date: String,
//   name: String,
//   phone: String,
//   state: String,
//   product: String,
//   selectedModel: {
//     model: String,
//   },
//   location: String,
//   city: String,
//   pincode: String,

//   rounds: [roundSchema],
// }, { timestamps: true });

// const Task = mongoose.model("Task", taskSchema);

// /* ================== Helper Functions ================== */

// // Emit task updates to relevant users
// const emitTaskUpdate = (task, eventName) => {
//   // Emit to all connected clients
//   io.emit(eventName, task);
  
//   // Emit to specific engineer room if assigned
//   if (task.assignEngineer) {
//     io.to(`engineer_${task.assignEngineer}`).emit(`${eventName}-engineer`, task);
//   }
// };

// // Emit round updates
// const emitRoundUpdate = (taskId, round, engineerName) => {
//   io.emit("round-added", { taskId, round });
  
//   if (engineerName) {
//     io.to(`engineer_${engineerName}`).emit("round-added-engineer", { taskId, round });
//   }
// };

// /* ================== ROUTES ================== */

// // ✅ Health check
// app.get("/", (req, res) => {
//   res.json({ 
//     status: "🚀 API is running...",
//     websocket: "✅ Socket.io is active",
//     timestamp: new Date().toISOString()
//   });
// });

// // 🔹 Get all tasks
// app.get("/tasks", async (req, res) => {
//   try {
//     const tasks = await Task.find().sort({ createdAt: -1 });
//     res.json(tasks);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Get single task
// app.get("/tasks/:taskId", async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.taskId);
//     if (!task) return res.status(404).json({ error: "Task not found" });
//     res.json(task);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Create new task
// app.post("/tasks", async (req, res) => {
//   try {
//     const task = new Task(req.body);
//     const savedTask = await task.save();
    
//     // Emit real-time event
//     emitTaskUpdate(savedTask, "task-created");
    
//     res.status(201).json(savedTask);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Update task
// app.put("/tasks/:taskId", async (req, res) => {
//   try {
//     const { taskId } = req.params;
//     const updatedTask = await Task.findByIdAndUpdate(
//       taskId,
//       req.body,
//       { new: true, runValidators: true }
//     );
    
//     if (!updatedTask) {
//       return res.status(404).json({ error: "Task not found" });
//     }
    
//     // Emit real-time event
//     emitTaskUpdate(updatedTask, "task-updated");
    
//     res.json(updatedTask);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Add round to task
// app.post("/tasks/:taskId/round", async (req, res) => {
//   try {
//     const { taskId } = req.params;
//     const { engineerName } = req.body; // Optional: get engineer name from request

//     const task = await Task.findById(taskId);
//     if (!task) {
//       return res.status(404).json({ error: "Task not found" });
//     }

//     // Add the new round
//     task.rounds.push(req.body);
//     await task.save();

//     // Get the newly added round
//     const newRound = task.rounds[task.rounds.length - 1];

//     // Emit real-time event
//     emitRoundUpdate(taskId, newRound, engineerName || task.assignEngineer);

//     res.json({
//       success: true,
//       task: task,
//       round: newRound,
//       message: "Round added successfully"
//     });
//   } catch (err) {
//     console.error("Error adding round:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Update specific round
// app.put("/tasks/:taskId/rounds/:roundIndex", async (req, res) => {
//   try {
//     const { taskId, roundIndex } = req.params;
//     const task = await Task.findById(taskId);
    
//     if (!task) {
//       return res.status(404).json({ error: "Task not found" });
//     }
    
//     if (!task.rounds[roundIndex]) {
//       return res.status(404).json({ error: "Round not found" });
//     }
    
//     // Update the round
//     task.rounds[roundIndex] = { ...task.rounds[roundIndex]._doc, ...req.body };
//     await task.save();
    
//     // Emit real-time event
//     io.emit("round-updated", {
//       taskId,
//       roundIndex,
//       round: task.rounds[roundIndex]
//     });
    
//     res.json(task);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Delete task
// app.delete("/tasks/:taskId", async (req, res) => {
//   try {
//     const deletedTask = await Task.findByIdAndDelete(req.params.taskId);
    
//     if (!deletedTask) {
//       return res.status(404).json({ error: "Task not found" });
//     }
    
//     // Emit real-time event
//     io.emit("task-deleted", req.params.taskId);
    
//     res.json({ 
//       success: true, 
//       message: "Task deleted successfully",
//       taskId: req.params.taskId 
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Get tasks by engineer (filtered)
// app.get("/engineer/:engineerName/tasks", async (req, res) => {
//   try {
//     const { engineerName } = req.params;
//     const tasks = await Task.find({ 
//       assignEngineer: { $regex: new RegExp(engineerName, "i") } 
//     }).sort({ createdAt: -1 });
    
//     res.json(tasks);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Get rounds for a task
// app.get("/tasks/:taskId/rounds", async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.taskId);
//     if (!task) {
//       return res.status(404).json({ error: "Task not found" });
//     }
    
//     res.json({
//       taskId: task._id,
//       complaintNumber: task.complaintNumber,
//       totalRounds: task.rounds.length,
//       rounds: task.rounds
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // 🔹 Get statistics
// app.get("/stats", async (req, res) => {
//   try {
//     const totalTasks = await Task.countDocuments();
//     const pendingTasks = await Task.countDocuments({ taskStatus: "Pending" });
//     const resolvedTasks = await Task.countDocuments({ taskStatus: "Resolved" });
//     const assignedTasks = await Task.countDocuments({ taskStatus: "Assigned" });
    
//     // Get rounds statistics
//     const tasks = await Task.find();
//     let totalRounds = 0;
//     tasks.forEach(task => {
//       totalRounds += task.rounds.length;
//     });
    
//     res.json({
//       totalTasks,
//       pendingTasks,
//       resolvedTasks,
//       assignedTasks,
//       totalRounds,
//       activeEngineers: new Set(tasks.map(t => t.assignEngineer).filter(Boolean)).size
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error("Error:", err);
//   res.status(500).json({ 
//     error: "Internal server error", 
//     message: err.message 
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ error: "Route not found" });
// });

// /* ================== SERVER ================== */
// server.listen(PORT, () => {
//   console.log(`🔥 Server running on port ${PORT}`);
//   console.log(`📡 WebSocket server is ready for real-time connections`);
//   console.log(`🌐 Frontend should connect to: http://localhost:${PORT}`);
// });

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const NodeCache = require('node-cache');

// Initialize Express app
const app = express();
const cache = new NodeCache({ stdTTL: 3600 });   // Cache for 1 hour

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(compression());

// MongoDB Atlas connection
const dbURI =
  "mongodb+srv://oshan:oshan%40work1234@cluster0.2txxi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });


// Task Schema
const taskSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  altPhone: String,

  state: String,
  city: String,
  pincode: String,
  location: String,
  landmark: String,

  product: String,
  selectedModel: Object,
  serialNumber: String,
  warrantyStatus: Object,
  purchaseDate: String,
  installationDate: String,

  status: String,
  complaintNumber: String,
  callType: String,
  additionalStatus: String,
  callSource: String,
  taskStatus: String,

  assignEngineer: String,
  contactNo: String,

  dealer: String,
  complaintNotes: String,
  enginnerNotes: String,
  customerFeedback: String,

  asp: String,
  aspName: String,
  from: String,
  to: String,
  timeIn: String,
  timeOut: String,
  mode: String,
  km: String,
  amount: String,
  time: String,

  date: String,
  images: [String]
});

const Task = mongoose.model("Task", taskSchema);



// ==================================================================
//  ADD TASK
// ==================================================================
app.post("/tasks", async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();

    // Clear cache after adding new data
    cache.del("tasks_page");

    res.status(201).json(task);
  } catch (err) {
    console.error("Error saving task:", err);
    res.status(500).json({ error: "Failed to save task." });
  }
});


// ==================================================================
//  GET TASKS WITH PAGINATION + CACHING
// ==================================================================
app.get("/tasks", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 20; // items per page
    const skip = (page - 1) * limit;

    const cacheKey = `tasks_page_${page}`;

    // Serve from cache
    if (cache.has(cacheKey)) {
      return res.status(200).json(cache.get(cacheKey));
    }

    const totalTasks = await Task.countDocuments();
    const tasks = await Task.find().skip(skip).limit(limit).lean();

    const responseData = {
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    };

    // Save in cache
    cache.set(cacheKey, responseData);

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});


// ==================================================================
//  UPDATE TASK
// ==================================================================
app.put("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Clear cache after update
    cache.flushAll();

    res.status(200).json(task);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task." });
  }
});


// ==================================================================
//  DELETE TASK
// ==================================================================
app.delete("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Clear cache after deletion
    cache.flushAll();

    res.status(200).json({ message: "Task deleted" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task." });
  }
});


// ==================================================================
//  START SERVER
// ==================================================================
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
