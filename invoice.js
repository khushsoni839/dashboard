// /////////////////////////////////////////////////////////////
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());  // Allow cross-origin requests
app.use(bodyParser.json());  // Parse incoming JSON bodies

// Mongoose model for Invoice
const invoiceSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  contactNumber: { type: String, required: true },
  courier: {
    dispatchLocation: { type: String },
    courierName: { type: String },
    status: { type: String, default: 'pending' },
  },
  productDetails: [
    {
      description: { type: String },
      product: { type: String },
      model: { type: String },
      hsnCode: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      cgst: { type: Number },
      sgst: { type: Number },
      totalAmount: { type: Number },
    },
  ],
  spgsDetails: [
    {
      description: { type: String },
      product: { type: String },
      model: { type: String },
      hsnCode: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      cgst: { type: Number },
      sgst: { type: Number },
      totalAmount: { type: Number },
    },
  ],
  focDetails: [
    {
      description: { type: String },
      product: { type: String },
      model: { type: String },
      hsnCode: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      cgst: { type: Number },
      sgst: { type: Number },
      totalAmount: { type: Number },
    },
  ],
  invoiceType: { type: String, default: 'intra-state' },
});

// Mongoose Model for Invoice
const Invoice = mongoose.model('Invoice', invoiceSchema);

// Connect to MongoDB
// mongoose.connect('mongodb+srv://khushsoni839:ks1234@cluster0.u3hib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
mongoose.connect('mongodb+srv://khushsoni839:ks1234@cluster0.u3hib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// GET route to fetch all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
});

// POST route to create a new invoice
app.post('/api/invoices', async (req, res) => {
  const { companyName, address, contactNumber, courier, productDetails, invoiceType } = req.body;

  const newInvoice = new Invoice({
    companyName,
    address,
    contactNumber,
    courier,
    productDetails,
    invoiceType,
  });

  try {
    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(400).json({ error: 'Error saving invoice' });
  }
});

// PUT route to update an existing invoice
app.put('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { companyName, address, contactNumber, courier, productDetails, invoiceType } = req.body;

  try {
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { companyName, address, contactNumber, courier, productDetails, invoiceType },
      { new: true }  // Return the updated invoice
    );
    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ error: 'Error updating invoice' });
  }
});

// DELETE route to delete an invoice
app.delete('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Invoice.findByIdAndDelete(id);
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(400).json({ error: 'Error deleting invoice' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const cors = require('cors');  // Import CORS middleware
// const { Schema } = mongoose;

// // Initialize Express app
// const app = express();

// // Enable CORS for all domains
// app.use(cors());  // This will allow all origins to make requests to this backend

// // Middleware to parse JSON requests
// app.use(bodyParser.json());

// // Connect to MongoDB (Replace with your MongoDB URI)
// mongoose.connect('mongodb+srv://khushsoni839:ks1234@cluster0.u3hib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('MongoDB connected'))
// .catch((err) => console.error('MongoDB connection error:', err));

// // Invoice Schema
// const productSchema = new Schema({
//   description: { type: String, required: true },
//   hsnCode: { type: String, required: true },
//   quantity: { type: Number, required: true, default: 1 },
//   price: { type: Number, required: true },
//   igst: { type: Number, required: true, default: 18 },
//   totalAmount: { type: Number, required: true }
// });

// const courierSchema = new Schema({
//   dispatchLocation: { type: String, required: true },
//   courierName: { type: String, required: true }
// });

// const invoiceSchema = new Schema({
//   companyName: { type: String, required: true },
//   address: { type: String, required: true },
//   contactNumber: { type: String, required: true },
//   companyFormation: { type: String, required: true, default: 'Milenium Company' },
//   courier: courierSchema,
//   productDetails: [productSchema]
// });

// const Invoice = mongoose.model('Invoice', invoiceSchema);

// // CRUD Routes

// // Create: Add a new invoice
// app.post('/api/invoices', async (req, res) => {
//   try {
//     const newInvoice = new Invoice(req.body);
//     await newInvoice.save();
//     res.status(201).json(newInvoice);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Read: Get all invoices
// app.get('/api/invoices', async (req, res) => {
//   try {
//     const invoices = await Invoice.find();
//     res.status(200).json(invoices);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Read: Get an invoice by ID
// app.get('/api/invoices/:id', async (req, res) => {
//   try {
//     const invoice = await Invoice.findById(req.params.id);
//     if (!invoice) {
//       return res.status(404).json({ error: 'Invoice not found' });
//     }
//     res.status(200).json(invoice);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Update: Update an invoice by ID
// app.put('/api/invoices/:id', async (req, res) => {
//   try {
//     const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!updatedInvoice) {
//       return res.status(404).json({ error: 'Invoice not found' });
//     }
//     res.status(200).json(updatedInvoice);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Delete: Delete an invoice by ID
// app.delete('/api/invoices/:id', async (req, res) => {
//   try {
//     const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
//     if (!deletedInvoice) {
//       return res.status(404).json({ error: 'Invoice not found' });
//     }
//     res.status(200).json({ message: 'Invoice deleted successfully' });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
