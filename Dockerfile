FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p data/outbox
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]