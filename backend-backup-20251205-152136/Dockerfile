FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# ensure storage dir exists
RUN mkdir -p storage

EXPOSE 4000
CMD ["npm", "start"]