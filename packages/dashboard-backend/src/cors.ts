import fastifyCors from 'fastify-cors';
import { FastifyInstance } from 'fastify';

export function registerCors(server: FastifyInstance) {
  // todo replace an 'any' with the target type
  server.register(fastifyCors, () => (req: any, callback: any) => {
    const corsOptions = /^(https?:\/\/)?localhost:8080/.test(req.headers.host) ? {
      origin: false
    } : {
        origin: [process.env.CHE_HOST],
        methods: ['GET', 'POST', 'PATCH', 'DELETE']
      };
    callback(null, corsOptions);
  });
}
