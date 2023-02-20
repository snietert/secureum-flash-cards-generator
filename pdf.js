const puppeteer = require("puppeteer");
const { getHtmlForSplitCards } = require("./html");

async function generatePdf(splitCards, pathAndFilename) {
  // start PDF generation
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // get HTMl content for render
  const html = await getHtmlForSplitCards(splitCards);

  // Write the PDF
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  const pdf = await page.pdf({
    path: pathAndFilename,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
    displayHeaderFooter: false,
    format: "A4",
    landscape: true,
  });

  // Close the browser instance
  await browser.close();
}

module.exports = { generatePdf };
