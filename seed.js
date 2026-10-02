const dns = require("dns");

dns.setServers(["8.8.8.8"]);

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const sampleProducts = [
  { name: "Blue Ballpoint Pen", price: 15, stock: 50, category: "pens" },
  { name: "Gel Ink Rollerball Pen", price: 45, stock: 4, category: "pens" }, // Low stock!
  { name: "Fountain Pen - Black", price: 250, stock: 12, category: "pens" },
  { name: "A5 Spiral Notebook", price: 120, stock: 30, category: "notebooks" },
  {
    name: "Hardcover Executive Journal",
    price: 350,
    stock: 2,
    category: "notebooks",
  }, // Low stock!
  { name: "Graph Paper Pad", price: 80, stock: 20, category: "notebooks" },
  {
    name: "Sticky Notes 3x3 (Yellow)",
    price: 30,
    stock: 100,
    category: "paper",
  },
  {
    name: "A4 Printing Paper (500 sheets)",
    price: 450,
    stock: 15,
    category: "paper",
  },
  {
    name: "Highlighter Set (Pastel 4-pack)",
    price: 180,
    stock: 3,
    category: "art supplies",
  }, // Low stock!
  {
    name: "Acrylic Paint Set (12 colors)",
    price: 600,
    stock: 8,
    category: "art supplies",
  },
  {
    name: "Wooden Ruler 30cm",
    price: 25,
    stock: 40,
    category: "desk accessories",
  },
  {
    name: "Metal Stapler Heavy Duty",
    price: 220,
    stock: 0,
    category: "desk accessories",
  }, // Out of stock!
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products.");

    // Insert sample data
    await Product.insertMany(sampleProducts);
    console.log("Successfully seeded 12 sample products!");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDatabase();
