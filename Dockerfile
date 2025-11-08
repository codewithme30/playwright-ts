# Generic Node image to run the assignment app for all roles
FROM node:18-alpine

WORKDIR /app
RUN apk add --no-cache bash

CMD ["node", "app.js"]
