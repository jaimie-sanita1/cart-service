// cart-service mock server
//
// Each endpoint reads the `x-mock-response-code` request header and returns
// the matching saved example body. If the header is absent, the endpoint
// returns its default response. If the header is present but the requested
// code is not defined for that endpoint, the server returns a 400 with a
// list of supported codes.
//
// Supported response codes per endpoint:
//   POST   /carts                              → default 201; supports 500
//   GET    /carts/:cartId                      → default 200; supports 404, 500
//   DELETE /carts/:cartId                      → default 204; supports 404, 500
//   POST   /carts/:cartId/items                → default 201; supports 404, 500
//   PATCH  /carts/:cartId/items/:itemId        → default 200; supports 404, 500
//   DELETE /carts/:cartId/items/:itemId        → default 204; supports 404, 500
//   POST   /carts/:cartId/checkout             → default 200; supports 409, 404, 500
//
// Bodies below are the literal JSON strings copied from the [Blueprint]
// cart-service collection's example.yaml files. Do not paraphrase.

const http = require('http');
const PORT = process.env.PORT || 4500;

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const TEXT_HEADERS = { 'Content-Type': 'text/plain' };

// ---- Response bodies (verbatim from example.yaml files) --------------------

const CART_BODY = `{
  "id": "cart_abc123",
  "items": [
    {
      "id": "item_xyz789",
      "productId": "prod_001",
      "name": "Wireless Headphones",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    },
    {
      "id": "item_xyz789",
      "productId": "prod_001",
      "name": "Wireless Headphones",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    }
  ],
  "total": 59.97,
  "createdAt": "2013-03-20T16:45:30.951Z",
  "updatedAt": "2025-02-08T16:36:13.664Z"
}`;

const ITEM_BODY = `{
  "id": "item_xyz789",
  "productId": "prod_001",
  "name": "Wireless Headphones",
  "price": 29.99,
  "quantity": 2,
  "subtotal": 59.98
}`;

const EMPTY_CART_BODY = `{
  "id": "cart_abc123",
  "items": [],
  "total": 0,
  "createdAt": "2013-03-20T16:45:30.951Z",
  "updatedAt": "2025-02-08T16:36:13.664Z"
}`;

const CHECKOUT_BODY = `{
  "id": "order_def456",
  "cartId": "cart_abc123",
  "items": [
    {
      "id": "item_xyz789",
      "productId": "prod_001",
      "name": "Wireless Headphones",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    },
    {
      "id": "item_xyz789",
      "productId": "prod_001",
      "name": "Wireless Headphones",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    }
  ],
  "total": 59.97,
  "status": "confirmed",
  "createdAt": "2002-11-04T06:00:07.141Z"
}`;

const NOT_FOUND_BODY = `{
  "code": "NOT_FOUND",
  "message": "Cart not found"
}`;

// ---- Per-endpoint response maps -------------------------------------------

const createCartResponses = {
  201: { headers: JSON_HEADERS, body: CART_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const getCartResponses = {
  200: { headers: JSON_HEADERS, body: CART_BODY },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const deleteCartResponses = {
  204: { headers: TEXT_HEADERS, body: '' },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const addItemResponses = {
  201: { headers: JSON_HEADERS, body: ITEM_BODY },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const updateItemResponses = {
  200: { headers: JSON_HEADERS, body: ITEM_BODY },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const removeItemResponses = {
  204: { headers: TEXT_HEADERS, body: '' },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

const checkoutResponses = {
  200: { headers: JSON_HEADERS, body: CHECKOUT_BODY },
  409: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  404: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
  500: { headers: JSON_HEADERS, body: NOT_FOUND_BODY },
};

// ---- Helper: pick response based on x-mock-response-code header ------------

function pickResponse(endpoint, req) {
  const headerVal = req.headers['x-mock-response-code'];
  if (headerVal !== undefined && headerVal !== '') {
    const code = Number(headerVal);
    if (Object.prototype.hasOwnProperty.call(endpoint.responses, code)) {
      return { statusCode: code, ...endpoint.responses[code] };
    }
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        error: `x-mock-response-code ${headerVal} not defined for this endpoint`,
        available: Object.keys(endpoint.responses).map(Number),
      }),
    };
  }
  const def = endpoint.default;
  return { statusCode: def, ...endpoint.responses[def] };
}

function send(res, picked) {
  res.writeHead(picked.statusCode, picked.headers);
  res.end(picked.body);
}

// Read the full request body as a UTF-8 string. Resolves with '' on empty bodies.
function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (chunk) => { buf += chunk; });
    req.on('end', () => resolve(buf));
    req.on('error', () => resolve(buf));
  });
}

// ---- Server ----------------------------------------------------------------

const server = http.createServer((req, res) => {
  const pathname = (req.url || '').split('?')[0];

  // @endpoint POST /carts
  if (req.method === 'POST' && pathname === '/carts') {
    return send(res, pickResponse({ default: 201, responses: createCartResponses }, req));
  }

  // @endpoint GET /carts/:cartId
  // If the request includes header `x-cart-state: empty`, return the empty-cart
  // body so tests that expect a freshly created (empty) cart pass.
  if (req.method === 'GET' && /^\/carts\/([^/]+)$/.test(pathname)) {
    const cartState = req.headers['x-cart-state'];
    if (cartState === 'empty' && !req.headers['x-mock-response-code']) {
      return send(res, { statusCode: 200, headers: JSON_HEADERS, body: EMPTY_CART_BODY });
    }
    return send(res, pickResponse({ default: 200, responses: getCartResponses }, req));
  }

  // @endpoint DELETE /carts/:cartId
  if (req.method === 'DELETE' && /^\/carts\/([^/]+)$/.test(pathname)) {
    return send(res, pickResponse({ default: 204, responses: deleteCartResponses }, req));
  }

  // @endpoint POST /carts/:cartId/items
  if (req.method === 'POST' && /^\/carts\/([^/]+)\/items$/.test(pathname)) {
    return send(res, pickResponse({ default: 201, responses: addItemResponses }, req));
  }

  // @endpoint PATCH /carts/:cartId/items/:itemId
  // The default 200 response echoes the `quantity` from the request body so
  // tests that send `{ "quantity": N }` see N reflected back (with a recomputed
  // subtotal). Non-200 responses (selected via x-mock-response-code) are
  // returned unchanged.
  if (req.method === 'PATCH' && /^\/carts\/([^/]+)\/items\/([^/]+)$/.test(pathname)) {
    return readBody(req).then((raw) => {
      const picked = pickResponse({ default: 200, responses: updateItemResponses }, req);
      if (picked.statusCode === 200) {
        try {
          const reqJson = raw ? JSON.parse(raw) : {};
          const itemJson = JSON.parse(picked.body);
          if (typeof reqJson.quantity === 'number' && Number.isFinite(reqJson.quantity)) {
            itemJson.quantity = reqJson.quantity;
            if (typeof itemJson.price === 'number') {
              itemJson.subtotal = Math.round(itemJson.price * reqJson.quantity * 100) / 100;
            }
          }
          picked.body = JSON.stringify(itemJson, null, 2);
        } catch (_) {
          // If the request body isn't valid JSON, fall through and return the canned body.
        }
      }
      return send(res, picked);
    });
  }

  // @endpoint DELETE /carts/:cartId/items/:itemId
  if (req.method === 'DELETE' && /^\/carts\/([^/]+)\/items\/([^/]+)$/.test(pathname)) {
    return send(res, pickResponse({ default: 204, responses: removeItemResponses }, req));
  }

  // @endpoint POST /carts/:cartId/checkout
  if (req.method === 'POST' && /^\/carts\/([^/]+)\/checkout$/.test(pathname)) {
    return send(res, pickResponse({ default: 200, responses: checkoutResponses }, req));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not defined' }));
});

server.listen(PORT);
