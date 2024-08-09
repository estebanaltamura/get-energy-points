import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());

let queue = []; // Cola para manejar solicitudes
let isProcessing = false; // Indicador de si se está procesando una solicitud

// Log inicial cuando el servidor se inicia
console.log(`Servidor iniciado. isProcessing: ${isProcessing}`);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/scrape', (req, res) => {
  // Agregar la solicitud a la cola
  queue.push({ req, res });
  console.log('Solicitud agregada a la cola. Longitud de la cola:', queue.length);
  
  // Procesar la siguiente solicitud si no hay ninguna en curso
  if (!isProcessing) {
    console.log('isProcessing es false. Iniciando el procesamiento de la cola.');
    processQueue();
  }
});

const processQueue = async () => {
  if (queue.length === 0) {
    console.log('La cola está vacía. Nada que procesar.');
    return; // No hay nada en la cola
  }

  isProcessing = true; // Marcar como en proceso
  console.log(`isProcessing cambiado a true. Procesando la siguiente solicitud. Cola restante: ${queue.length - 1}`);

  const { req, res } = queue.shift(); // Obtener la siguiente solicitud de la cola

  let browser;
  try {
    // Extraer la URL y la clase desde la query string
    const { url, className } = req.query;

    // Validar que ambos parámetros estén presentes
    if (!url || !className) {
      return res.status(400).send('Error: url and className parameters are required.');
    }

    console.log('Procesamiento iniciado...');

    // Validar la URL
    try {
      new URL(url);
    } catch (_) {
      return res.status(400).send('Error: URL no válida.');
    }

    // Iniciar Puppeteer con Google Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome', // Ruta para Google Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Opciones recomendadas para servidores
    });

    const page = await browser.newPage();
    
    // Manejo de errores específicos durante la navegación
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
    } catch (navigationError) {
      console.error('Error durante la navegación:', navigationError);
      return res.status(400).send('Error: No se pudo acceder a la URL proporcionada.');
    }

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
    isProcessing = false; // Marcar como no en proceso
    console.log(`isProcessing cambiado a false. Procesando la siguiente en la cola.`);
    processQueue(); // Procesar la siguiente solicitud en la cola
  }
};

const options = {
  key: fs.readFileSync('/etc/cert/privkey.pem'),
  cert: fs.readFileSync('/etc/cert/fullchain.pem'),
};

const server = https.createServer(options, app);
const port = 3200;

server.listen(port, () => {
  console.log(`Servidor HTTPS escuchando en el puerto ${port}. isProcessing: ${isProcessing}`);
});



