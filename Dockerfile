FROM node:latest

WORKDIR /app

COPY ./ ./
RUN npm install

EXPOSE 3000

ENV TOKEN= LOG_LEVEL=info

ENTRYPOINT [ "npm", "run", "start" ]