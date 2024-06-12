FROM node:21.6.0

WORKDIR /backend

COPY . .

RUN npm install

CMD ["node", "index.js"]

EXPOSE 1997
