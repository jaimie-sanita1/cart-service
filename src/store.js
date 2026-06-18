const { v4: uuidv4 } = require("uuid");

const PRODUCT_CATALOG = {
  prod_001: { name: "Wireless Headphones", price: 29.99 },
  prod_002: { name: "Gaming Mouse", price: 49.99 },
  prod_003: { name: "Mechanical Keyboard", price: 89.99 }
};

const carts = new Map();
const orders = new Map();

function nowIso() {
  return new Date().toISOString();
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function cartTotal(items) {
  return roundCurrency(items.reduce((sum, item) => sum + item.subtotal, 0));
}

function createCart() {
  const timestamp = nowIso();
  const cart = {
    id: `cart_${uuidv4()}`,
    items: [],
    total: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  carts.set(cart.id, cart);
  return cart;
}

function getCart(cartId) {
  return carts.get(cartId) || null;
}

function deleteCart(cartId) {
  return carts.delete(cartId);
}

function addItem(cartId, payload) {
  const cart = getCart(cartId);
  if (!cart) return null;

  const catalogItem = PRODUCT_CATALOG[payload.productId];
  const unitPrice = catalogItem ? catalogItem.price : 9.99;
  const item = {
    id: `item_${uuidv4()}`,
    productId: payload.productId,
    name: catalogItem ? catalogItem.name : `Product ${payload.productId}`,
    price: unitPrice,
    quantity: payload.quantity,
    subtotal: roundCurrency(unitPrice * payload.quantity)
  };

  cart.items.push(item);
  cart.total = cartTotal(cart.items);
  cart.updatedAt = nowIso();
  return item;
}

function updateItemQuantity(cartId, itemId, quantity) {
  const cart = getCart(cartId);
  if (!cart) return null;

  const item = cart.items.find((candidate) => candidate.id === itemId);
  if (!item) return undefined;

  item.quantity = quantity;
  item.subtotal = roundCurrency(item.price * quantity);
  cart.total = cartTotal(cart.items);
  cart.updatedAt = nowIso();
  return item;
}

function removeItem(cartId, itemId) {
  const cart = getCart(cartId);
  if (!cart) return null;

  const index = cart.items.findIndex((candidate) => candidate.id === itemId);
  if (index === -1) return undefined;

  cart.items.splice(index, 1);
  cart.total = cartTotal(cart.items);
  cart.updatedAt = nowIso();
  return true;
}

function checkout(cartId) {
  const cart = getCart(cartId);
  if (!cart) return null;
  if (cart.items.length === 0) return undefined;

  const order = {
    id: `order_${uuidv4()}`,
    cartId: cart.id,
    items: cart.items,
    total: cart.total,
    status: "confirmed",
    createdAt: nowIso()
  };

  orders.set(order.id, order);
  carts.delete(cartId);
  return order;
}

module.exports = {
  createCart,
  getCart,
  deleteCart,
  addItem,
  updateItemQuantity,
  removeItem,
  checkout
};
