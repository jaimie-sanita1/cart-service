const express = require("express");
const store = require("./store");
const { tracingMiddleware } = require("./tracing");
const inventory = require("./inventoryClient");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(tracingMiddleware);

function notFound(res, message) {
  return res.status(404).json({
    code: "NOT_FOUND",
    message
  });
}

function badRequest(res, message) {
  return res.status(400).json({
    code: "BAD_REQUEST",
    message
  });
}

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    inventoryConfigured: inventory.inventoryEnabled()
  });
});

app.post("/carts", (req, res) => {
  const cart = store.createCart();
  res.status(201).json(cart);
});

app.get("/carts/:cartId", (req, res) => {
  const cart = store.getCart(req.params.cartId);
  if (!cart) return notFound(res, "Cart not found");
  return res.status(200).json(cart);
});

app.delete("/carts/:cartId", (req, res) => {
  const deleted = store.deleteCart(req.params.cartId);
  if (!deleted) return notFound(res, "Cart not found");
  return res.status(204).send();
});

app.post("/carts/:cartId/items", async (req, res, next) => {
  try {
    const { productId, quantity } = req.body || {};
    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      return badRequest(res, "productId and quantity >= 1 are required");
    }

    const cart = store.getCart(req.params.cartId);
    if (!cart) return notFound(res, "Cart not found");

    let product;
    if (inventory.inventoryEnabled()) {
      const lookup = await inventory.getItem(req, productId);
      if (lookup.status === 404) {
        return res.status(404).json({
          code: "PRODUCT_NOT_FOUND",
          message: `Inventory item not found for sku ${productId}`
        });
      }
      if (lookup.status < 200 || lookup.status >= 300) {
        return res.status(502).json({
          code: "INVENTORY_UNAVAILABLE",
          message: "Failed to look up product in inventory-service",
          upstream: lookup.body
        });
      }

      const reservation = await inventory.createReservation(req, {
        sku: productId,
        quantity
      });
      if (reservation.status === 409) {
        return res.status(409).json({
          code: "INSUFFICIENT_STOCK",
          message: "Not enough quantity available in inventory",
          upstream: reservation.body
        });
      }
      if (reservation.status < 200 || reservation.status >= 300) {
        return res.status(502).json({
          code: "INVENTORY_UNAVAILABLE",
          message: "Failed to reserve inventory",
          upstream: reservation.body
        });
      }

      product = {
        name: lookup.body.name,
        price: lookup.body.price
      };
    } else {
      product = store.resolveLocalProduct(productId);
    }

    const item = store.addItem(req.params.cartId, { productId, quantity }, product);
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
});

app.patch("/carts/:cartId/items/:itemId", (req, res) => {
  const { quantity } = req.body || {};
  if (!Number.isInteger(quantity) || quantity < 1) {
    return badRequest(res, "quantity must be an integer >= 1");
  }

  const result = store.updateItemQuantity(
    req.params.cartId,
    req.params.itemId,
    quantity
  );

  if (result === null) return notFound(res, "Cart not found");
  if (result === undefined) return notFound(res, "Item not found");
  return res.status(200).json(result);
});

app.delete("/carts/:cartId/items/:itemId", (req, res) => {
  const result = store.removeItem(req.params.cartId, req.params.itemId);
  if (result === null) return notFound(res, "Cart not found");
  if (result === undefined) return notFound(res, "Item not found");
  return res.status(204).send();
});

app.post("/carts/:cartId/checkout", (req, res) => {
  const result = store.checkout(req.params.cartId);
  if (result === null) return notFound(res, "Cart not found");
  if (result === undefined) {
    return res.status(409).json({
      code: "EMPTY_CART",
      message: "Cart is empty"
    });
  }

  return res.status(200).json(result);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error"
  });
});

app.listen(port, () => {
  console.log(`cart-service listening on ${port}`);
  if (inventory.inventoryEnabled()) {
    console.log(
      `inventory dependency enabled: ${process.env.INVENTORY_BASE_URL}`
    );
  } else {
    console.log("inventory dependency disabled (local catalog fallback)");
  }
});
