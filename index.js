import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/scrape', async (req, res) => {
  let browser;
  try {
    // Obtener la clase y la URL desde la consulta
    const { className, url } = req.query;

    if (!className || !url) {
      return res.status(400).send('Error: both className and url parameters are required');
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/headless-chromium', // Ruta al ejecutable de Chromium
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    await browser.close();

    // Crear una expresión regular dinámica usando la clase proporcionada
    const regex = new RegExp(`class="${className}"[^>]*>([^<]*)<`, 'g');
    let match;
    const matches = [];

    // Buscar todas las coincidencias en el contenido de la página
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }

    if (matches.length > 0) {
      res.status(200).send(matches);
    } else {
      res.status(404).send('Class not found or no content available');
    }
  } catch (error) {
    console.error('Error fetching the page:', error);
    res.status(500).send('Error fetching the page');
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
