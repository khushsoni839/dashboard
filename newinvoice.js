
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
  personName: { type: String },
  gstuin: { type: String },
  address: { type: String, required: true },
  statename: { type: String },
  contactNumber: { type: String, required: true },
  companyFormation: { type: String, default: 'Milenium Company' },
  courier: {
    dispatchLocation: { type: String },
    deleiveryNote: { type: String },
    dated: { type: String },
    docket: { type: String },
    buyer: { type: String },
    otherRef: { type: String },
    refernceNO: { type: String },
    mode: { type: String },
    deleveryNote: { type: String },
    invoiceno: { type: String },
    currentdate: { type: String },
    courierName: { type: String },
    termsofdeleivery: { type: String }
  },
  productDetails: [
    {
      hsnCode: { type: String },
      product: { type: String },
      model: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      discount: { type: Number },
      totalAmount: { type: Number },
    },
  ],
  spgsDetails: [
    {
      hsnCode: { type: String },
      product: { type: String },
      model: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      discount: { type: Number },
      totalAmount: { type: Number },
    },
  ],
  focDetails: [
    {
      hsnCode: { type: String },
      product: { type: String },
      model: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      igst: { type: Number },
      discount: { type: Number },
      totalAmount: { type: Number },
    },
  ]
});


// Mongoose Model for Invoice
const Invoice = mongoose.model('Invoice', invoiceSchema);

// Connect to MongoDB
// mongoose.connect('mongodb+srv://khushsoni839:ks1234@cluster0.u3hib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
mongoose.connect('mongodb+srv://service:services1234@cluster0.wxa147v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
// mongoose.connect('mongodb+srv://ages27771:ages12345@cluster0.t2zpj0w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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
app.get('/api/newinvoice', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
});

// mongodb+srv://service:<db_password>@cluster0.wxa147v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// POST route to create a new invoice
app.post('/api/newinvoice', async (req, res) => {
  const {
    companyName,
    personName,
    gstuin,
    address,
    statename,
    contactNumber,
    companyFormation,
    courier,
    productDetails,
    spgsDetails,
    focDetails
  } = req.body;

  const newInvoice = new Invoice({
    companyName,
    personName,
    gstuin,
    address,
    statename,
    contactNumber,
    companyFormation,
    courier,
    productDetails,
    spgsDetails,
    focDetails
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
app.put('/api/newinvoice/:id', async (req, res) => {
  const { id } = req.params;
  const {
    companyName,
    personName,
    gstuin,
    address,
    statename,
    contactNumber,
    companyFormation,
    courier,
    productDetails,
    spgsDetails,
    focDetails
  } = req.body;

  try {
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        companyName,
        personName,
        gstuin,
        address,
        statename,
        contactNumber,
        companyFormation,
        courier,
        productDetails,
        spgsDetails,
        focDetails
      },
      { new: true }
    );
    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ error: 'Error updating invoice' });
  }
});


// DELETE route to delete an invoice
app.delete('/api/newinvoice/:id', async (req, res) => {
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
