
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 9002;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Generic event listener
    socket.onAny((eventName: string, ...args: any[]) => {
      console.log(`Received event "${eventName}" from ${socket.id} with data:`, args);
      // Echo the event back to the sender
      socket.emit('eventEcho', { name: eventName, args });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
       console.log(`> Ready on http://${hostname}:${port}`);
     });
});
