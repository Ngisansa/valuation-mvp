FROM node:18-alpine
WORKDIR /usr/src/app
COPY . .
RUN npm install --production
COPY . .
EXPOSE 10000
CMD ["node", "server.js"]