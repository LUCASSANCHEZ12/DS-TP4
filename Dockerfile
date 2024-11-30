FROM node

WORKDIR /usr/src/app

COPY app .

RUN npm install

EXPOSE 8000

CMD ["node", "./app.js"]