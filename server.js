const dns = require('dns');

dns.setServers(['8.8.8.8']);

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./utils/errorHandler');

//Security Middelware: Set HTTP headers
app.use(helmet());

// Secuirty Middleware: Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes"
  },
});

app.use('/api', limiter)
app.use(express.json());

app.use('/api', productRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB connected successfully");
})
.catch((error) => {
  console.log("MongoDB connection failed:", error.message);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});