FROM node:latest

WORKDIR /app

COPY ./ ./
RUN npm install

ENV TOKEN=

ENTRYPOINT [ "npm", "run", "start" ]