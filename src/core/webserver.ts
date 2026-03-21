import express from "express";

const webserver = express();

webserver.get("/", (request, response) => {
  return response.send({ ok: true });
});

export { webserver };