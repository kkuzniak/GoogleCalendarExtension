FROM node:18

WORKDIR /usr/src/app

COPY apps/server/package*.json ./

RUN npm install

RUN npm install prisma --save-dev

COPY apps/server .

EXPOSE 3000