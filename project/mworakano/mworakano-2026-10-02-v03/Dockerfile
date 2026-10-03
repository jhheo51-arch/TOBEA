FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node prompts ./prompts
COPY --chown=node:node skills ./skills
USER node
ENV HOST=0.0.0.0 PORT=8795
EXPOSE 8795
CMD ["node", "server.mjs"]
