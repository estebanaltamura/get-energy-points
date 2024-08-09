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
    // Cambia la ruta del ejecutable para usar Google Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome', // Ruta para Google Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Opciones recomendadas para servidores
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.khanacademy.org/profile/idev0x00', { waitUntil: 'networkidle0' });
    const content = await page.content();
    await browser.close();
    res.status(200).send(content);
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