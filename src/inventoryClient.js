const { outboundTraceparent } = require("./tracing");

const INVENTORY_BASE_URL = (process.env.INVENTORY_BASE_URL || "").replace(
  /\/$/,
  ""
);

function inventoryEnabled() {
  return Boolean(INVENTORY_BASE_URL);
}

async function inventoryRequest(req, method, path, body) {
  if (!INVENTORY_BASE_URL) {
    const err = new Error("INVENTORY_BASE_URL is not configured");
    err.code = "INVENTORY_NOT_CONFIGURED";
    throw err;
  }

  const headers = {
    Accept: "application/json",
    traceparent: outboundTraceparent(req)
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${INVENTORY_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }

  return { status: response.status, body: json };
}

async function getItem(req, sku) {
  return inventoryRequest(req, "GET", `/v1/items/${encodeURIComponent(sku)}`);
}

async function createReservation(req, { sku, quantity }) {
  return inventoryRequest(req, "POST", "/v1/reservations", { sku, quantity });
}

module.exports = {
  inventoryEnabled,
  getItem,
  createReservation
};
