FROM node:alpine3.18

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . . 

EXPOSE 1997

CMD ["npm", "start"]

