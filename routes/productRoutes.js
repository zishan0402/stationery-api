const express = require('express');

const router = express.Router();

const { addProduct, getProduct, getProductById, updateProduct, deleteProduct, patchProduct} = require('../controllers/productController.js');

router.get("/products", getProduct);

router.post("/products", addProduct);

router.get('/products/:id', getProductById);

router.put('/products/:id', updateProduct);

router.delete('/products/:id', deleteProduct);

router.patch('/products/:id', patchProduct);

module.exports = router;

