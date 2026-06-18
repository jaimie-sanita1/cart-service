FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY cart.yaml ./cart.yaml

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
