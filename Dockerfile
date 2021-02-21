FROM node:12-alpine3.12
LABEL author="Tom Saleeba"

WORKDIR /app/
ADD index.js package.json yarn.lock README.md ./
RUN yarn install --frozen-lockfile

ENTRYPOINT [ "node", "." ]
