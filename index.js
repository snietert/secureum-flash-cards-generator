const axios = require("axios");
const htmlToJson = require("html-to-json");
const fs = require("fs");
const puppeteer = require("puppeteer");
const extractUrls = require("extract-urls");
const splitHtml = require("split-html");
const qrCode = require("qrcode");

// globals
const log = false;
const meta = false;

async function doStuff(options) {
  // extract options
  const website = options.website;
  const headline = options.headline;
  const cachePathAndFilename = options.cachePathAndFilename;
  const pdfPathAndFilename = options.pdfPathAndFilename;
  const startingNumber = options.startingNumber;
  const selectors = options.selectors;

  // download
  const html = await getContent(website, { cachePathAndFilename });

  // collect the headlines
  var cards = await convertHtmlToJsonForSelectors(html, selectors);
  // cards = cards.slice(0, 16);

  var counter = startingNumber;
  cards = cards.map((card) => {
    return {
      headline,
      counter: counter++,
      content: card,
    };
  });

  // create PDF
  await generatePdf(cards, pdfPathAndFilename);
}

async function getContent(website, options) {
  // ------------ IGNORE CACHE ------------
  if (!options || !options.cachePathAndFilename) {
    return (await fetchWebsiteContent(website)).data;
  }

  // ------------ HANDLE CACHE ------------
  // get storage location
  const cachePathAndFilename = options.cachePathAndFilename;

  // check if file exists
  const exists = fs.existsSync(cachePathAndFilename);

  // return from cache if already cached
  if (exists) {
    loggg(`Returning content from cache: ${cachePathAndFilename}!`);
    return fs.readFileSync(cachePathAndFilename).toString();
  }

  // fetch and write to cache if file does not yet exist
  loggg("Fetching content from website!");
  const html = (await fetchWebsiteContent(website)).data;

  loggg(`Writing content to cache: ${cachePathAndFilename}!`);
  fs.writeFileSync(cachePathAndFilename, html);

  // return content from cache
  return getContent(website, options);
}

////////////////////////////// PDF GNERATION //////////////////////////////

async function generatePdf(cards, pathAndFilename) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  /* Some cards neet to be split since they would overflow the card sice.
    Cards that are split can be glued together (front/back) to make it 1 card. */
  const splitLength = 1000;

  const splitCards = [];
  for (let i = 0; i < cards.length; i++) {
    // set card content as html
    cards[i].content = cards[i].content.toString().trim();

    // remove li tags if required
    if (cards[i].content.startsWith("<li>")) {
      cards[i].content = cards[i].content.substring(4); // remove leading <li>
      cards[i].content = cards[i].content.slice(0, cards[i].content.length - 5); // remove trailing </li>
    }

    // no need to split if short enough
    if (cards[i].content.length < splitLength) {
      cards[i].xOfNX = null;
      cards[i].xOfNN = null;
      splitCards.push(cards[i]);
      continue;
    }

    // split at list (heuristic)
    var splitCardContent = splitHtml(cards[i].content, "ol");
    splitCardContent = splitCardContent.filter((item) => item.length);

    splitCardContent.forEach((spc, index) => {
      const clone = JSON.parse(JSON.stringify(cards[i]));
      clone.xOfNX = index + 1;
      clone.xOfNN = splitCardContent.length;
      clone.content = spc;
      splitCards.push(clone);
    });
  }

  // Prepare HTML to be rendered
  var html;

  for (let i = 0; i < splitCards.length; i++) {
    // open new row
    if (i === 0) {
      html += "<tr>";
    } else if (i % 2 === 0) {
      html += "</tr><tr>";
    }

    const card = splitCards[i];

    // get headline only for single-page cards of first page of multi-page cards
    var headlineHtml = "";
    if (card.xOfNX === null || (card.xOfNX && card.xOfNX === 1)) {
      headlineHtml = `<strong>${card.headline}/${card.counter}`;
      headlineHtml +=
        card.xOfNX !== null ? ` (${card.xOfNX}/${card.xOfNN})` : "";
      headlineHtml += "</strong>";
    }

    // main content and appropriate font formatting class
    card.contentLength = card.content.length; // save card content length for debugging (meta)
    const clazz = getClazz(card.content);

    var contentHtml = `<span class="${clazz}">${card.content}</span>`;

    // get meta for debugging
    var metaHtml = "";
    if (meta) {
      metaHtml += `<i>(${card.contentLength}/${clazz})</i>`;
    }

    // compile html content
    var cardContentHtml = `${headlineHtml} ${metaHtml}${contentHtml}`;

    // replace links in card content with QR code
    const links = extractUrls(cardContentHtml);
    if (links) {
      const link = links[0]; // TODO handle multiple links

      // remove the see here part
      //   const seeHerePos = cardContentHtml.indexOf("(See");
      //   cardContentHtml = cardContentHtml.slice(0, seeHerePos);

      // generate and barcode
      const code = await qrCode.toString(link, {
        type: "svg",
        width: 80,
        margin: 0,
      });

      // NOTE find better solution to bring back/save the trailing span
      cardContentHtml += "</span></p></span>";

      // add barcode
      cardContentHtml += `<span class="qrCode">${code}</span>`;
    }

    html += `<td>${cardContentHtml}</td>`;

    // close row
    if (i + 1 === cards.length) {
      html += "</tr>";
    }
  }

  //   console.log(html);

  function getClazz(cardHtml) {
    if (cardHtml.length >= 900) {
      return "microFont";
    } else if (cardHtml.length >= 800) {
      return "tinyFont";
    } else if (cardHtml.length >= 600) {
      return "smallFont";
    } else if (cardHtml.length >= 400) {
      return "mediumFont";
    } else if (cardHtml.length >= 275) {
      return "standardFont";
    }
    return "largeFont";
  }

  // TODO check where this comes from
  html = html.replace("undefined", "");

  // console.log(html);

  html = `<!DOCTYPE html>
    <html>
        <head>
            <style>
                body {
                    margin-top: 0cm;
                }

                p {
                    line-height: 140%;
                }

                li p {
                    margin: 0;
                    padding: 0;
                    padding-bottom: 6px;
                    line-height: 120%;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    // table-layout: fixed;
                }

                tr {
                    // width: 100%;
                }

                td {
                    width: 530px;
                    height: 360px; // 240px; // 231,86px; // 185.49px;
                    border: 1px dashed black;
                    padding: 10px;
                    overflow: hidden;
                }

                .microFont {
                    font-size: 14px;
                }

                .tinyFont {
                    font-size: 16px;
                }

                .smallFont {
                    font-size: 17px;
                }

                .mediumFont {
                    font-size: 18px;
                }

                .standardFont {
                    font-size: 20px;
                }

                .largeFont {
                    font-size: 26px;
                }

                .qrCode {
                    height: 40px !important;
                    width: 40px !important;
                }

            </style>
        </head>
            <body>
                <table>${html}</table>
            </body>
        </html>`;

  //   console.log(html);
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  // Download the PDF
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

/////////////////////////// GETTING THE CONTENT ///////////////////////////

async function convertHtmlToJsonForSelectors(html, selectors) {
  var collected = [];
  for (let i = 0; i < selectors.length; i++) {
    var result = await convertHtmlToJsonForSelector(html, selectors[i]);
    collected = collected.concat(result);
  }
  return collected;
}

async function convertHtmlToJsonForSelector(html, selector) {
  return await htmlToJson.parse(html, [
    selector,
    function ($item) {
      return $item;
    },
  ]);
}

async function fetchWebsiteContent(website) {
  return axios.get(website);
}

function extractTopList(content) {
  const $ = cheerio.load(content);
  return $("li > p").text();
}

/////////////////////////// UTILITIES ///////////////////////////

function loggg(toLog) {
  if (log) {
    console.log(toLog);
  }
}

(async () => {
  // Solidity 101
  //   await doStuff({
  //     website: "https://secureum.substack.com/p/solidity-101",
  //     startingNumber: 1,
  //     headline: "Secureum Solidity 101",
  //     cachePathAndFilename: "./secureum_solidity_101.html",
  //     pdfPathAndFilename: "./secureum_solidity_101.pdf",
  //     selectors: [
  //       "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div > ol > li",
  //     ],
  //   });

  // Solidity 201
  await doStuff({
    website: "https://secureum.substack.com/p/solidity-201",
    startingNumber: 102,
    headline: "Secureum Solidity 201",
    cachePathAndFilename: "./secureum_solidity_201.html",
    pdfPathAndFilename: "./secureum_solidity_201.pdf",
    selectors: [
      "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div > ol[start] > li > p:nth-child(1)",
    ],
  });
})();
