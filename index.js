import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/google-chrome-stable', // Ruta al ejecutable de Chrome
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

const PORT = 3200;
const httpsOptions = {
  key: fs.readFileSync('/path/to/your/private.key'),
  cert: fs.readFileSync('/path/to/your/certificate.crt'),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





