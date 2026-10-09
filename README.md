# cart-service

Simple Node.js checkout flow service built with Express and in-memory state.

## What is implemented

- `POST /carts` create cart
- `GET /carts/:cartId` fetch cart
- `DELETE /carts/:cartId` delete cart
- `POST /carts/:cartId/items` add item
- `PATCH /carts/:cartId/items/:itemId` update quantity
- `DELETE /carts/:cartId/items/:itemId` remove item
- `POST /carts/:cartId/checkout` checkout cart
- `GET /healthz` container health check endpoint

The API behavior aligns with `cart.yaml` and your Postman requests.

## Inventory dependency

When `INVENTORY_BASE_URL` is set, `POST /carts/:cartId/items` calls inventory-service:

1. `GET /v1/items/{productId}` for name/price
2. `POST /v1/reservations` to reserve stock

Both services propagate W3C `traceparent` so Postman Insights can build the cart → inventory edge in API Catalog.

Without `INVENTORY_BASE_URL`, cart falls back to its local hard-coded product catalog (existing local/demo behavior).

```bash
# terminal 1 — inventory-service
INVENTORY_BASE_URL=http://localhost:3004 npm start   # from cart-service after inventory is up
```

Kind/Insights demo scripts live in the inventory-service repo (`scripts/run-insights-demo.sh`).

## Local run

1. Install dependencies:
   - `npm install`
2. Start service:
   - `npm start`
3. Service URL:
   - `http://localhost:3001`

## Quick flow example

1. Create cart:
   - `curl -s -X POST http://localhost:3001/carts`
2. Add item:
   - `curl -s -X POST http://localhost:3001/carts/<cartId>/items -H "Content-Type: application/json" -d '{"productId":"prod_001","quantity":2}'`
3. Checkout:
   - `curl -s -X POST http://localhost:3001/carts/<cartId>/checkout`

## Docker

1. Build:
   - `docker build -t cart-service:local .`
2. Run:
   - `docker run --rm -p 3001:3001 cart-service:local`

## EKS notes

- This service is stateless except in-memory cart/order data.
- In-memory state is per pod and resets on restart.
- For production, replace in-memory store with Redis or a database.
