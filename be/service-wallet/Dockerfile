FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .

ENV NODE_ENV=production
CMD ["npm", "start"]

EXPOSE 3002

