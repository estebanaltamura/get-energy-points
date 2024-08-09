import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());

let isProcessing = false; // Variable de bloqueo

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/scrape', async (req, res) => {
  if (isProcessing) {
    console.log('Solicitud rechazada: servidor ocupado.');
    return res.status(429).send('Server is busy processing another request. Please try again later.');
  }

  isProcessing = true; // Indicar que se ha iniciado un procesamiento
  console.log('Procesamiento iniciado...');
  let browser;
  try {
    // Extraer la URL y la clase desde la query string
    const { url, className } = req.query;

    // Validar que ambos parámetros estén presentes
    if (!url || !className) {
      return res.status(400).send('Error: url and className parameters are required.');
    }

    // Iniciar Puppeteer con Google Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome', // Ruta para Google Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Opciones recomendadas para servidores
    });

    const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 }); // 60 segundos de timeout
    const content = await page.content();

    // Crear una expresión regular dinámica usando la clase proporcionada
    const regex = new RegExp(`class="${className}"[^>]*>([^<]*)<`, 'g');
    let match;
    const matches = [];

    // Buscar todas las coincidencias en el contenido de la página
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }

    await browser.close();

    if (matches.length > 0) {
      res.status(200).send(matches);
    } else {
      res.status(404).send('Class not found or no content available');
    }
  } catch (error) {
    console.error('Error fetching the page:', error);
    res.status(500).send('Error fetching the page');
  } finally {
    console.log('Procesamiento finalizado.');
    isProcessing = false; // Liberar el bloqueo cuando se completa el procesamiento
  }
});

const options = {
  key: fs.readFileSync('/etc/cert/privkey.pem'),
  cert: fs.readFileSync('/etc/cert/fullchain.pem'),
};

const server = https.createServer(options, app);
const port = 3200;

server.listen(port, () => {
  console.log(`Servidor HTTPS escuchando en el puerto ${port}`);
});
