const express = require('express');
const redis = require('redis');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;

const client = redis.createClient({
  host: process.env.REDIS_IP
});

client.on('error', function (error) {
  console.error(error);
});

app.use(cors());

app.get('/', async (req, res) => {
  try {
    // Verificar si el idTransaction está almacenado en Redis y si la marca de tiempo ha caducado
    client.get('idTransaction', async (err, redisData) => {
      if (err) {
        console.error('Error al obtener idTransaction de Redis:', err);
        return res.status(500).json({ error: 'Error en la solicitud GET' });
      }

      if (!redisData) {
        // Si el idTransaction no está en Redis, realizar la solicitud GET y POST
        const response = await axios.get('https://qasexp.clinicainternacional.com.pe/v1/additionalParameters/documents');
        const idTransaction = response.data.auditResponse.idTransaction;

        // Realizar la solicitud POST
        try {
          const postResponse = await axios.post('https://qasexp.clinicainternacional.com.pe/users/authentication', {
            documentNumber: process.env.DOCUMENT,
            documentType: "1",
            password: process.env.PASSWORD,
            deviceId: "randomDeviceId",
            idRRSS: "",
            typeRRSS: ""
          }, {
            headers: {
              idTransaction: idTransaction
            }
          });

          // Guardar el idTransaction, timestamp y la respuesta del POST en Redis
          const timestamp = Date.now();
          const responseMessage=postResponse.data.auditResponse.responseMessage;
          client.setex('idTransaction', 3600, JSON.stringify({ idTransaction, timestamp,responseMessage  }));

          //client.setex('idTransaction', 3600, JSON.stringify({ idTransaction, timestamp,loginrpta  }));

          // Devolver la respuesta del POST
          res.json({ idTransaction, timestamp, responseMessage});
        } catch (postError) {
          console.error('Error en la solicitud POST:', postError);
          res.status(500).json({ error: 'Error en la solicitud POST' });
        }
      } else {
        // Si el idTransaction está en Redis, verificar si la marca de tiempo ha caducado
        const { idTransaction, timestamp, responseMessage } = JSON.parse(redisData);
        const currentTime = Date.now();
        const elapsedTime = currentTime - timestamp;
        const expirationTime = 3600000; // 1 hora en milisegundos
        //const expirationTime = 3600000; // 1 hora en milisegundos

        if (elapsedTime >= expirationTime) {
          // Si ha pasado más de 1 hora, realizar nuevamente la solicitud GET y POST
          const response = await axios.get('https://qasexp.clinicainternacional.com.pe/v1/additionalParameters/documents');
          const newIdTransaction = response.data.auditResponse.idTransaction;

          // Realizar la solicitud POST
          try {
            const postResponse = await axios.post('https://qasexp.clinicainternacional.com.pe/users/authentication', {
              documentNumber: process.env.DOCUMENT,
              documentType: "1",
              password: process.env.PASSWORD,
              deviceId: "randomDeviceId",
              idRRSS: "",
              typeRRSS: ""
            }, {
              headers: {
                idTransaction: newIdTransaction
              }
            });

            // Guardar el nuevo idTransaction, timestamp y la respuesta del POST en Redis
            const newTimestamp = Date.now();
            const newresponseMessage=postResponse.data.auditResponse.responseMessage;

            client.setex('idTransaction', 3600, JSON.stringify({ idTransaction: newIdTransaction, timestamp: newTimestamp, responseMessage: newresponseMessage }));
           // client.setex('idTransaction', 3600, JSON.stringify({ idTransaction: newIdTransaction, timestamp: newTimestamp, loginrpta: newloginrpta }));

            // Devolver la respuesta del POST
            res.json({ idTransaction: newIdTransaction, timestamp: newTimestamp, responseMessage: newresponseMessage });
          } catch (postError) {
            console.error('Error en la solicitud POST:', postError);
            res.status(500).json({ error: 'Error en la solicitud POST' });
          }
        } else {
          // Si no ha pasado 1 hora, devolver el idTransaction almacenado en Redis junto con el timestamp y la respuesta del POST
          res.json({ idTransaction, timestamp, responseMessage });
        }
      }
    });
  } catch (error) {
    console.error('Error en la solicitud GET:', error);
    // Devolver un mensaje de error si hay algún problema con la solicitud
    res.status(500).json({ error: 'Error en la solicitud GET' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
