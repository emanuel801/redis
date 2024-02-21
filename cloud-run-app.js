const express = require('express');
const cors = require('cors')
const redis = require("redis");

const app = express();

const client = redis.createClient({
  "host": "172.17.55.3"
});
client.on("error", function(error) {
  console.error(error);
});

app.use(cors());

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  client.set("key", "value!", redis.print);
  client.get("key", (err, reply) => {
    res.send(`
    <html>
      <head>
      </head>
      <body>
        <p>Connecting to Redis 172.17.55.3 </p>
        <p>Value of key just read: ${reply}</p>
      </body>
    </html>
    `);
    });
  });


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});