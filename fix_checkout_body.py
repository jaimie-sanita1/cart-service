path = 'postman/collections/[Blueprint] cart-service/Checkout a cart.request.yaml'
with open(path, 'r') as f:
    content = f.read()

content = content.replace('"street": "{ADDRESS}"', '"street": "123 Main St"')
content = content.replace('"city": "{ADDRESS}"', '"city": "San Francisco"')
content = content.replace('"state": "{ADDRESS}"', '"state": "CA"')
content = content.replace('"zip": "{ADDRESS}"', '"zip": "94105"')
content = content.replace('"country": "{ADDRESS}"', '"country": "US"')

with open(path, 'w') as f:
    f.write(content)

print("Done")
