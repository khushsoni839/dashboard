// ============================================================
// 🚀 KELWON INVENTORY BACKEND — SINGLE FILE
// Node.js + Express + MongoDB Atlas (Mongoose)
// ============================================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

/* ============================================================
   ⚙️ CONFIG
============================================================ */
const PORT = process.env.PORT || 5003;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://khushsoni839:ks1234@cluster0.u3hib.mongodb.net/kelwon?retryWrites=true&w=majority&appName=Cluster0";

/* ============================================================
   🧱 MONGOOSE SCHEMA
============================================================ */
const QuantitySchema = new mongoose.Schema(
  {
    product:     { type: String, default: "" },
    inmodel:     { type: String, default: "" },
    outmodel:    { type: String, default: "" },
    desc:        { type: String, default: "" },
    receiveqty:  { type: String, default: "" },
    dispatchqty: { type: String, default: "" },
    consumed:    { type: String, default: "" },
    pending:     { type: String, default: "" },
    Extra:       { type: String, default: "" },
    repaired:    { type: String, default: "0" },
  },
  { _id: false }
);

const DispatchDetailSchema = new mongoose.Schema(
  {
    inlocation:   { type: String, default: "" },
    outlocation:  { type: String, default: "" },
    indocket:     { type: String, default: "" },
    outdocket:    { type: String, default: "" },
    inchalan:     { type: String, default: "" },
    outchalan:    { type: String, default: "" },
    receivedate:  { type: String, default: "" },
    dispatchdate: { type: String, default: "" },
  },
  { _id: false }
);

const InventorySchema = new mongoose.Schema(
  {
    product:         { type: String, required: true },
    vendorName:      { type: String, default: "" },
    engineer:        { type: String, default: "" },
    dispatchDetails: { type: [DispatchDetailSchema], default: [] },

    // ── legacy flat fields (kept for backward compatibility) ──
    inlocation:   { type: String, default: "" },
    outlocation:  { type: String, default: "" },
    indocket:     { type: String, default: "" },
    outdocket:    { type: String, default: "" },
    inchalan:     { type: String, default: "" },
    outchalan:    { type: String, default: "" },
    receivedate:  { type: String, default: "" },
    dispatchdate: { type: String, default: "" },

    quantities:   { type: [QuantitySchema], default: [] },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", InventorySchema);

/* ============================================================
   🧰 HELPERS
============================================================ */

// ✅ Normalize each quantity row
function normalizeQuantities(quantities) {
  if (!Array.isArray(quantities)) return [];
  return quantities.map((q) => {
    const r = Number(q.receiveqty) || 0;
    const d = Number(q.dispatchqty) || 0;
    return {
      product:     q.product ?? "",
      inmodel:     q.inmodel ?? "",
      outmodel:    q.outmodel ?? "",
      desc:        q.desc ?? "",
      receiveqty:  q.receiveqty  != null ? String(q.receiveqty)  : "",
      dispatchqty: q.dispatchqty != null ? String(q.dispatchqty) : "",
      consumed:    q.consumed    != null ? String(q.consumed)    : "",
      pending:     String(r - d),
      Extra:       q.Extra ?? q.extra ?? "",
      repaired:    q.repaired != null ? String(q.repaired) : "0",
    };
  });
}

// ✅ Normalize each dispatch detail row
function normalizeDispatchDetails(details) {
  if (!Array.isArray(details)) return [];
  return details.map((d) => ({
    inlocation:   d.inlocation   ?? "",
    outlocation:  d.outlocation  ?? "",
    indocket:     d.indocket     ?? "",
    outdocket:    d.outdocket    ?? "",
    inchalan:     d.inchalan     ?? "",
    outchalan:    d.outchalan    ?? "",
    receivedate:  d.receivedate  ?? "",
    dispatchdate: d.dispatchdate ?? "",
  }));
}

// ✅ Sanitize + normalize the incoming request body
function sanitizeBody(body = {}) {
  const details = normalizeDispatchDetails(body.dispatchDetails);

  // Backward-compat: if no dispatchDetails array, fall back to flat fields
  const first = details[0] || {
    inlocation:   body.inlocation   ?? "",
    outlocation:  body.outlocation  ?? "",
    indocket:     body.indocket     ?? "",
    outdocket:    body.outdocket    ?? "",
    inchalan:     body.inchalan     ?? "",
    outchalan:    body.outchalan    ?? "",
    receivedate:  body.receivedate  ?? "",
    dispatchdate: body.dispatchdate ?? "",
  };

  return {
    product:         body.product ?? body.vendor ?? "",
    vendorName:      body.vendorName ?? body.vendor ?? "",
    engineer:        body.engineer ?? "",
    dispatchDetails: details,

    // mirror first entry into legacy flat fields
    inlocation:   first.inlocation,
    outlocation:  first.outlocation,
    indocket:     first.indocket,
    outdocket:    first.outdocket,
    inchalan:     first.inchalan,
    outchalan:    first.outchalan,
    receivedate:  first.receivedate,
    dispatchdate: first.dispatchdate,

    quantities: normalizeQuantities(body.quantities),
  };
}

/* ============================================================
   🌐 EXPRESS APP
============================================================ */
const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Health check ---------- */
app.get("/", (_req, res) => {
  res.send("✅ Kelwon Inventory API is running");
});

/* ============================================================
   📦 ROUTES  →  /api/inventory
============================================================ */

// GET all
app.get("/api/inventory", async (_req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("GET /api/inventory:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET one
app.get("/api/inventory/:id", async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST create
app.post("/api/inventory", async (req, res) => {
  try {
    const clean = sanitizeBody(req.body);
    if (!clean.product) {
      return res.status(400).json({ error: "Product is required" });
    }
    const item = new Inventory(clean);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error("POST /api/inventory:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT update
app.put("/api/inventory/:id", async (req, res) => {
  try {
    const clean = sanitizeBody(req.body);
    const item = await Inventory.findByIdAndUpdate(req.params.id, clean, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("PUT /api/inventory/:id:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT repaired map (TRC page)
app.put("/api/inventory/:id/repaired", async (req, res) => {
  try {
    const { repairedMap } = req.body || {};
    if (!repairedMap || typeof repairedMap !== "object") {
      return res.status(400).json({ error: "repairedMap required" });
    }
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    Object.entries(repairedMap).forEach(([idx, val]) => {
      const i = Number(idx);
      if (item.quantities[i]) {
        item.quantities[i].repaired = val != null ? String(val) : "0";
      }
    });
    await item.save();
    res.json(item);
  } catch (err) {
    console.error("PUT /api/inventory/:id/repaired:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT consumed (Engineer Inventory only)
app.put("/api/inventory/:id/consumed", async (req, res) => {
  try {
    const { rowIndex, consumed } = req.body || {};
    if (rowIndex == null) {
      return res.status(400).json({ error: "rowIndex required" });
    }
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    if (!item.quantities[rowIndex]) {
      return res.status(400).json({ error: "Row not found" });
    }
    item.quantities[rowIndex].consumed =
      consumed != null ? String(consumed) : "";
    await item.save();
    res.json(item);
  } catch (err) {
    console.error("PUT consumed:", err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE
app.delete("/api/inventory/:id", async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    console.error("DELETE /api/inventory/:id:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ============================================================
   🔌 CONNECT DB & START SERVER
============================================================ */
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

/* ============================================================
   🛑 GRACEFUL SHUTDOWN
============================================================ */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});
