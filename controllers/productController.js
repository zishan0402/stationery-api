const Product = require("../models/Product");
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const addProduct = async (req, res, next) => {
  try {
    const { name, price, stock, category } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative number",
      });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({
        succcess: false,
        message: "Category is required and must be a non-empty string",
      });
    }

    const newProduct = new Product({
      name,
      price,
      stock,
      category,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 5);

    //Price query
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;

    //Sorting query
    const sortBy = req.query.sortBy || "_id";
    const order = req.query.order || "asc";

    //Price Validation
    if (minPrice !== undefined && isNaN(Number(minPrice))) {
      return res.status(400).json({
        success: false,
        message: "minPrice must be a valid number",
      });
    }

    if (maxPrice !== undefined && isNaN(Number(maxPrice))) {
      return res.status(400).json({
        success: false,
        message: "maxPrice must be a valid number",
      });
    }

    // Validate negative values (Price)
    if (minPrice !== undefined && Number(minPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be negative",
      });
    }

    if (maxPrice !== undefined && Number(maxPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "maxPrice cannot be negative",
      });
    }

    //minimum isn't greater than maximum (Price)
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      Number(minPrice) > Number(maxPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be greater than maxPrice",
      });
    }

    //Stock query
    const minStock = req.query.minStock;
    const maxStock = req.query.maxStock;

    //Stock Validation
    if (minStock !== undefined && isNaN(Number(minStock))) {
      return res.status(400).json({
        success: false,
        message: "minStock must be a valid number",
      });
    }

    if (maxStock !== undefined && isNaN(Number(maxStock))) {
      return res.status(400).json({
        success: false,
        message: "maxStock must be a valid number",
      });
    }

    // Validate negative values (Stock)
    if (minStock !== undefined && Number(minStock) < 0) {
      return res.status(400).json({
        success: false,
        message: "minStock cannot be negative",
      });
    }

    if (maxStock !== undefined && Number(maxStock) < 0) {
      return res.status(400).json({
        success: false,
        message: "maxStock cannot be negative",
      });
    }

    //minimum isn't greater than maximum (Stock)
    if (
      minStock !== undefined &&
      maxStock !== undefined &&
      Number(minStock) > Number(maxStock)
    ) {
      return res.status(400).json({
        success: false,
        message: "minStock cannot be greater than maxStock",
      });
    }

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (!Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive integer",
      });
    }

    if (limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit cannot be greater than 100",
      });
    }

    //Validate sorting
    const allowedSortFields = ["name", "price", "stock", "category", "_id"];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort field",
      });
    }

    if (!["asc", "desc"].includes(order)) {
      return res.status(400).json({
        success: false,
        message: "Order must be asc or desc",
      });
    }

    const skip = (page - 1) * limit;

    //Filter
    const filter = {};

    //search Validation
    const search = req.query.search;

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({
        success: false,
        message: "Search must be a string",
      });
    }

    if (search !== undefined && search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search cannot exceed 100 characters",
      });
    }

    //Search filter
    if (search && search.trim()) {
      filter.name = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    // Price Filter
    if (minPrice !== undefined) {
      filter.price = {
        ...filter.price,
        $gte: Number(minPrice),
      };
    }

    if (maxPrice !== undefined) {
      filter.price = {
        ...filter.price,
        $lte: Number(maxPrice),
      };
    }

    //Stock filter
    if (minStock !== undefined) {
      filter.stock = {
        ...filter.stock,
        $gte: Number(minStock),
      };
    }

    if (maxStock !== undefined) {
      filter.stock = {
        ...filter.stock,
        $lte: Number(maxStock),
      };
    }

    //Category Filter
    const category = req.query.category;

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category must be a non-empty string",
        });
      }
      filter.category = category.trim().toLowerCase();
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    if (sortBy !== "_id") {
      sortOptions._id = 1;
    }

    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    //Pagination
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const currentPageProducts = products.length;

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: products,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        currentPageProducts,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Low stock alert code
const getLowStockProducts = async (req, res, next) => {
  try {
    const thresholdQuery = req.query.threshold;
    let threshold = 5; // Default threshold

    if (thresholdQuery !== undefined) {
      const parsedThreshold = Number(thresholdQuery);
      if (
        isNaN(parsedThreshold) ||
        parsedThreshold < 0 ||
        !Number.isInteger(parsedThreshold)
      ) {
        return res.status(400).json({
          success: false,
          message: "Threshold must be a non-negative integer",
        });
      }
      threshold = parsedThreshold;
    }

    const lowStockProducts = await Product.find({
      stock: { $lte: threshold },
    }).sort({ stock: 1 });

    res.status(200).json({
      success: true,
      message: `Products with stock less than or equal to ${threshold}`,
      count: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Your Product",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    const { name, price, stock, category } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative number",
      });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required and must be a non-empty string",
      });
    }

    const updateData = {
      name,
      price,
      stock,
      category,
    };

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const patchProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    const { name, price, stock, category } = req.body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Name must be a valid non-empty string",
      });
    }

    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative number",
      });
    }

    if (category !== undefined && (typeof category !== "string" || !category.trim())){
      return res.status(400).json({
        success: false,
        message: "Category must be a non-empty string",
      });
    }

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (price !== undefined) {
      updateData.price = price;
    }

    if (stock !== undefined) {
      updateData.stock = stock;
    }
    if (category !== undefined) {
      updateData.category = category;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addProduct,
  getProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  patchProduct,
  getLowStockProducts,
};
