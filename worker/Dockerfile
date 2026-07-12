FROM node:18-alpine

# Install Docker CLI so the worker can invoke docker commands on host socket
RUN apk add --no-repeat --no-cache docker-cli bash

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
