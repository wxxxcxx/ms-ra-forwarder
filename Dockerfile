FROM node:latest

WORKDIR /app

COPY ./ ./
RUN npm install

ENTRYPOINT [ "npm", "run", "start" ]