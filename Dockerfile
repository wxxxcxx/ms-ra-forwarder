FROM node:latest

WORKDIR /app

COPY ./ ./
RUN npm install

EXPOSE 3000

ENV TOKEN=

ENTRYPOINT [ "npm", "run", "start" ]