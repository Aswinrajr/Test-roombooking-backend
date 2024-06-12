FROM node:slim

WORKDIR /

COPY ..

RUN npm install

CMD ["node","index.js"]

EXPOSE 1997

