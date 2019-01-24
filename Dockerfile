FROM kkarczmarczyk/node-yarn:8.0-slim
LABEL author="Tom Saleeba"

ADD index.js package.json yarn.lock README.md /app/
WORKDIR /app/
RUN yarn

ENTRYPOINT [ "node", "/app/index.js" ]
