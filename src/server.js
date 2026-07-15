const express = require("express");
const store = require("./store");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

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
  res.status(200).json({ status: "ok" });
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

app.post("/carts/:cartId/items", (req, res) => {
  const { productId, quantity } = req.body || {};
  if (!productId || !Number.isInteger(quantity) || quantity < 1) {
    return badRequest(res, "productId and quantity >= 1 are required");
  }

  const item = store.addItem(req.params.cartId, { productId, quantity });
  if (!item) return notFound(res, "Cart not found");
  return res.status(201).json(item);
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
});
