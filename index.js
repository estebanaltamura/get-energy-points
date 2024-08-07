import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
app.use(cors());

// Ruta de prueba
app.get('/', (req, res) => {
  console.log('Alguien entro')
  res.send('Servidor funcionando correctamente');
});

app.get('/scrape', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

