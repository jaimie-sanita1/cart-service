#!/usr/bin/env python3
"""
Appends CreateCartRequest + CheckoutRequest to components/schemas.
"""

with open('cart.yaml', 'r') as f:
    lines = f.readlines()

# ── Append new schemas before the final `    Error:` schema ────────────────
create_cart_schema = """\
    CreateCartRequest:
      type: object
      description: Optional request body for initializing a new cart.
      properties:
        customerId:
          type: string
          description: Optional customer ID to associate with the cart.
          example: cust_789xyz

"""

checkout_schema = """\
    CheckoutRequest:
      type: object
      description: Optional request body for checkout options.
      properties:
        shippingAddress:
          type: string
          description: Destination address for the order.
          example: '123 Main St, Springfield, USA'
        paymentMethod:
          type: string
          description: Payment method token or identifier.
          example: pm_card_visa

"""

# Find the `    Error:` line to insert before it
error_idx = None
for i, line in enumerate(lines):
    if line.rstrip() == '    Error:':
        error_idx = i
        break

if error_idx is None:
    print("ERROR: could not find '    Error:' schema to insert before")
    exit(1)

lines.insert(error_idx, checkout_schema)
lines.insert(error_idx, create_cart_schema)
print(f"Inserted CreateCartRequest and CheckoutRequest before line {error_idx+1}")

with open('cart.yaml', 'w') as f:
    f.writelines(lines)

print("Done — cart.yaml updated successfully")
