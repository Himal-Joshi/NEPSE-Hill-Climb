const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://localhost:5174');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // Try changing mode to live
  await page.select('select[name="mode"]', 'live');
  await new Promise(r => setTimeout(r, 3000));
  
  // get game over text
  const gameOver = await page.evaluate(() => {
     const go = document.querySelector('.game-over-modal');
     return go ? go.innerText : 'No game over';
  });
  console.log('GameOver Text:', gameOver);
  
  await browser.close();
})();
