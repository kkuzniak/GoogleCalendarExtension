FROM node:18

WORKDIR /usr/src/app

COPY apps/client/package*.json ./

RUN npm install

COPY apps/client .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]