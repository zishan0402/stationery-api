const token = sessionStorage.getItem("token");

// Pagination state
let currentPage = 1;
const productsPerPage = 10;

const storedUser = sessionStorage.getItem("user");

// If the user hasn't logged in, send them to the login page.
if (!token || !storedUser) {
  window.location.replace("/login.html");
} else {
  try {
    const user = JSON.parse(storedUser);

    // Display the signed-in user's name and role.
    document.getElementById("sidebarUser").textContent =
      user.name || user.email || "Signed in";

    document.getElementById("userRole").textContent = user.role || "staff";

    // Only show the Add Product button for admins.
    if (user.role === "admin") {
      document.getElementById("addProductButton").hidden = false;
    }

    const addProductButton = document.getElementById("addProductButton");
    const addProductForm = document.getElementById("addProductForm");
    const cancelProductButton = document.getElementById("cancelProductButton");

    addProductButton.addEventListener("click", () => {
      addProductForm.hidden = false;
      addProductButton.hidden = true;
    });

    cancelProductButton.addEventListener("click", () => {
      addProductForm.reset();
      addProductForm.hidden = true;

      if (user.role === "admin") {
        addProductButton.hidden = false;
      }
    });
  } catch (error) {
    // Invalid session data: clear it and return to login.
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.replace("/login.html");
  }
}

// Log out by clearing this tab's session.
document.getElementById("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  window.location.replace("/login.html");
});

async function loadProducts() {
  const productTableBody = document.getElementById("productTableBody");
  const dashboardMessage = document.getElementById("dashboardMessage");

  try {
    const searchTerm = productSearch.value.trim();
    const sortOption = productSort.value;

    const sortMap = {
      "name-asc": { sortBy: "name", order: "asc" },
      "name-desc": { sortBy: "name", order: "desc" },
      "price-asc": { sortBy: "price", order: "asc" },
      "price-desc": { sortBy: "price", order: "desc" },
      "stock-asc": { sortBy: "stock", order: "asc" },
      "stock-desc": { sortBy: "stock", order: "desc" },
    };

    const selectedSort = sortMap[sortOption] || {
      sortBy: "_id",
      order: "asc",
    };

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(productsPerPage),
      sortBy: selectedSort.sortBy,
      order: selectedSort.order,
    });

    const categoryOption = document.getElementById("productCategory").value;

    if (categoryOption !== "all") {
      params.set("category", categoryOption);
    }

    if (searchTerm) {
      params.set("search", searchTerm);
    }

    const response = await fetch(`/api/products?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load products");
    }

    console.log("Products API response:", result);

    window.products = result.data;
    const products = window.products;

    const totalUnits = products.reduce((total, product) => {
      return total + Number(product.stock || 0);
    }, 0);

    const lowStockCount = products.filter((product) => {
      return Number(product.stock) <= 5;
    }).length;

    document.getElementById("totalProducts").textContent =
      result.pagination.totalProducts;

    document.getElementById("totalUnits").textContent = totalUnits;

    document.getElementById("lowStockCount").textContent = lowStockCount;

    const pagination = result.pagination;

    const startProduct =
      pagination.totalProducts === 0
        ? 0
        : (pagination.page - 1) * pagination.limit + 1;

    const endProduct = Math.min(
      pagination.page * pagination.limit,
      pagination.totalProducts,
    );

    document.getElementById("paginationInfo").textContent =
      `Showing ${startProduct}–${endProduct} of ${pagination.totalProducts} products`;

    document.getElementById("currentPageInfo").textContent =
      `Page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`;

    document.getElementById("previousPageButton").disabled =
      !pagination.hasPreviousPage;

    document.getElementById("nextPageButton").disabled =
      !pagination.hasNextPage;

    if (!Array.isArray(products)) {
      throw new Error("Invalid products data received from server");
    }

    renderProducts(products);

  } catch (error) {
    console.error("Error loading products:", error);
    productTableBody.innerHTML = `
      <tr>
        <td colspan="5">Unable to load products.</td>
      </tr>
    `;
    dashboardMessage.textContent = error.message;
  }
}

function renderProducts(products) {
  const productTableBody = document.getElementById("productTableBody");

  const isAdmin = JSON.parse(sessionStorage.getItem("user")).role === "admin";

  productTableBody.replaceChildren();

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.textContent = "No products found.";

    row.appendChild(cell);
    productTableBody.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = product.name ?? "";

    const categoryCell = document.createElement("td");
    categoryCell.textContent = product.category || "Uncategorized";

    const priceCell = document.createElement("td");
    priceCell.textContent = `₹${Number(product.price).toFixed(2)}`;

    const stockCell = document.createElement("td");
    stockCell.textContent = String(product.stock ?? "");

    const actionsCell = document.createElement("td");

    if (isAdmin) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-product-button";
      editButton.dataset.id = product._id;
      editButton.textContent = "Edit";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-product-button";
      deleteButton.dataset.id = product._id;
      deleteButton.textContent = "Delete";

      actionsCell.append(editButton, deleteButton);
    } else {
      actionsCell.textContent = "—";
    }

    row.append(nameCell, categoryCell, priceCell, stockCell, actionsCell);

    productTableBody.appendChild(row);
  });
}

if (token) {
  populateCategoryFilter().then(() => {
    loadProducts();
  });
}

const productSearch = document.getElementById("productSearch");
const productSort = document.getElementById("productSort");

function applyProductFilters() {
  const searchTerm = productSearch.value.trim().toLowerCase();
  const sortOption = productSort.value;
  const categoryOption = document.getElementById("productCategory").value;

  // First, filter by search term and category.
  const filteredProducts = (window.products || []).filter((product) => {
    const name = String(product.name || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

    const matchesSearch =
      name.includes(searchTerm) || category.includes(searchTerm);

    const matchesCategory =
      categoryOption === "all" || category === categoryOption.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Next, sort the filtered products.
  filteredProducts.sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return String(a.name || "").localeCompare(String(b.name || ""));

      case "name-desc":
        return String(b.name || "").localeCompare(String(a.name || ""));

      case "price-asc":
        return Number(a.price) - Number(b.price);

      case "price-desc":
        return Number(b.price) - Number(a.price);

      case "stock-asc":
        return Number(a.stock) - Number(b.stock);

      case "stock-desc":
        return Number(b.stock) - Number(a.stock);

      default:
        return 0;
    }
  });

  renderProducts(filteredProducts);
}


async function populateCategoryFilter() {
  const categoryFilter = document.getElementById("productCategory");
  const selectedCategory = categoryFilter.value;

  try {
    const response = await fetch("/api/products/categories", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load categories");
    }

    const categories = result.data;

    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    categoryFilter.appendChild(allOption);

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    if (categories.includes(selectedCategory)) {
      categoryFilter.value = selectedCategory;
    } else {
      categoryFilter.value = "all";
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}


// Reapply filtering and sorting whenever the search changes.
productSearch.addEventListener("input", () => {
  currentPage = 1;
  loadProducts();
});

// Reapply filtering and sorting whenever the sort option changes.
productSort.addEventListener("change", () => {
  currentPage = 1;
  loadProducts();
});

const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");

previousPageButton.addEventListener("click", async () => {
  if (currentPage > 1) {
    currentPage--;
    await loadProducts();
  }
});

nextPageButton.addEventListener("click", async () => {
  currentPage++;
  await loadProducts();
});

document.getElementById("productCategory").addEventListener("change", () => {
  currentPage = 1;
  loadProducts();
});

const addProductForm = document.getElementById("addProductForm");
const productFormMessage = document.getElementById("productFormMessage");
const saveProductButton = document.getElementById("saveProductButton");

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  productFormMessage.textContent = "";
  saveProductButton.disabled = true;
  saveProductButton.textContent = "Saving...";

  const product = {
    name: document.getElementById("productName").value.trim(),
    category: document.getElementById("productCategory").value.trim(),
    price: Number(document.getElementById("productPrice").value),
    stock: Number(document.getElementById("productStock").value),
  };

  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not create product");
    }

    //Success message
    productFormMessage.textContent = "Product added successfully!";
    productFormMessage.className = "success";

    addProductForm.reset();
    addProductForm.hidden = true;
    document.getElementById("addProductButton").hidden = false;

    await loadProducts();
  } catch (error) {
    console.error("Add product failed:", error);

    productFormMessage.textContent = error.message;
    productFormMessage.className = "error";
  } finally {
    saveProductButton.disabled = false;
    saveProductButton.textContent = "Save product";
  }
});

document
  .getElementById("productTableBody")
  .addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-product-button");

    if (!button) return;

    const productId = button.dataset.id;

    const confirmed = confirm("Are you sure you want to delete this product?");

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete product");
      }

      await loadProducts();

      const dashboardMessage = document.getElementById("dashboardMessage");

      dashboardMessage.textContent = "Product deleted successfully!";
      dashboardMessage.className = "success";
    } catch (error) {
      console.error("Delete product failed:", error);

      const dashboardMessage = document.getElementById("dashboardMessage");

      dashboardMessage.textContent = error.message;
      dashboardMessage.className = "error";
    }
  });

document
  .getElementById("productTableBody")
  .addEventListener("click", (event) => {
    const button = event.target.closest(".edit-product-button");

    if (!button) return;

    const productId = button.dataset.id;

    const product = window.products.find((item) => item._id === productId);

    if (!product) {
      document.getElementById("dashboardMessage").textContent =
        "Could not find this product.";
      return;
    }

    document.getElementById("editProductId").value = product._id;
    document.getElementById("editProductName").value = product.name;
    document.getElementById("editProductCategory").value =
      product.category || "";
    document.getElementById("editProductPrice").value = product.price;
    document.getElementById("editProductStock").value = product.stock;

    document.getElementById("editProductMessage").textContent = "";
    document.getElementById("editProductForm").hidden = false;
    document.getElementById("addProductForm").hidden = true;
    document.getElementById("addProductButton").hidden = true;

    document.getElementById("editProductForm").scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });

const editProductForm = document.getElementById("editProductForm");
const editProductMessage = document.getElementById("editProductMessage");
const updateProductButton = document.getElementById("updateProductButton");

editProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  editProductMessage.textContent = "";
  updateProductButton.disabled = true;
  updateProductButton.textContent = "Updating...";

  const productId = document.getElementById("editProductId").value;

  const updatedProduct = {
    name: document.getElementById("editProductName").value.trim(),
    category: document.getElementById("editProductCategory").value.trim(),
    price: Number(document.getElementById("editProductPrice").value),
    stock: Number(document.getElementById("editProductStock").value),
  };

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedProduct),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to update product");
    }

    editProductForm.reset();
    editProductForm.hidden = true;

    await loadProducts();

    const dashboardMessage = document.getElementById("dashboardMessage");

    dashboardMessage.textContent = "Product updated successfully!";
    dashboardMessage.className = "success";

    document.getElementById("addProductButton").hidden =
      JSON.parse(sessionStorage.getItem("user")).role !== "admin";

    document.getElementById("addProductButton").hidden =
      JSON.parse(sessionStorage.getItem("user")).role !== "admin";
  } catch (error) {
    console.error("Update product failed:", error);

    editProductMessage.textContent = error.message;
    editProductMessage.className = "error";
  } finally {
    updateProductButton.disabled = false;
    updateProductButton.textContent = "Update product";
  }
});

document.getElementById("cancelEditButton").addEventListener("click", () => {
  editProductForm.reset();
  editProductForm.hidden = true;
  editProductMessage.textContent = "";

  const user = JSON.parse(sessionStorage.getItem("user"));

  if (user.role === "admin") {
    document.getElementById("addProductButton").hidden = false;
  }
});
