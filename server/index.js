import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fastifyView from "@fastify/view";
import { Eta } from "eta";
const eta = new Eta();
const server = fastify();
server.register(fastifyView, {
    engine: { eta },
    templates: path.join(import.meta.dirname, "public"),
});
server.get("/", async function (req, res) {
    const data = { title: "My Page", message: "Hello, World!" };
    return res.view("index.eta", data);
});
server.get('/ping', async (request, reply) => {
    return 'pong\n';
});
server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
//# sourceMappingURL=index.js.map