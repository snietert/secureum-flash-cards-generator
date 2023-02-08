const axios = require("axios");
const htmlToJson = require("html-to-json");
const fs = require("fs");
const puppeteer = require("puppeteer");
const extractUrls = require("extract-urls");
const striptags = require("striptags");
const qrCode = require("qrcode");
const sanitizeHtml = require("sanitize-html");
const escape = require("escape-html");

// globals
const log = false;
const logHtml = false;
const meta = false;
const limit = 1000000;
// const cardsFilter = null;
const cardsFilter = (card, index) => {
  // return index > 40 && index < 45; // 141 true;
  // const text = card.content.text().trim();
  // const length = textOnlyLength(text);
  // console.log(index + 1, text);
  // return text.includes("Unused or Unsafe Features") || index === 0;
  // return length > 2000;
  // return length > 500 && length < 1000;
  // return length < 300;
  // return length > 1000;
  // return length >= 300 && length <= 500;
  return true;
};

async function doStuff(options) {
  // read options
  const {
    website,
    headline,
    cachePathAndFilename,
    pdfPathAndFilename,
    startingNumber,
    selectors,
  } = options;

  // download HTML from URL (and cache)
  var html = await getContent(website, { cachePathAndFilename });

  // extract and remove references
  // TODO handle references (add an extra card!)
  const regex = /<p><strong>References.+<\/ol>/;
  const references = html.match(regex)[0];
  html = html.replace(regex, "");

  // extract content for cards from HTML
  var cards = await convertHtmlToJsonForSelectors(html, selectors);
  cards = cards.slice(0, limit);

  // prepare initial card data structure
  cards = cards.map((card, index) => {
    return {
      headline,
      counter: startingNumber + index,
      content: card,
    };
  });

  // generate PDF from cards content
  await generatePdf(cards, pdfPathAndFilename);
}

//////////////////////////// GET/CACHE CONTENT ////////////////////////////

async function getContent(website, options) {
  const cachePathAndFilename = options.cachePathAndFilename;

  // handle missing cache options
  if (!options || !cachePathAndFilename) {
    loggg(`Missing cache options`);
    return (await fetchWebsiteContent(website)).data;
  }

  // get from cache if cached
  if (fs.existsSync(cachePathAndFilename)) {
    loggg(`Returning content from cache: ${cachePathAndFilename}`);
    return fs.readFileSync(cachePathAndFilename).toString();
  }

  // download and write to cache
  const html = (await fetchWebsiteContent(website)).data;
  loggg(`Writing content to cache: ${cachePathAndFilename}`);
  fs.writeFileSync(cachePathAndFilename, html);
  return html;
}

////////////////////////////// PDF GNERATION //////////////////////////////

async function generatePdf(cards, pathAndFilename) {
  // start PDF generation
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // for only seeing cards with a specific length (for tuning font sizes)
  if (cardsFilter) {
    cards = cards.filter(cardsFilter);
  }

  // split cards where content should be on more than 1 card
  const splitCards = await getSplitCards(cards);

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

/////////////////////////////// SPLIT CARDS ///////////////////////////////

async function getSplitCards(cards) {
  var splitCards = [];

  for (let i = 0; i < cards.length; i++) {
    // prepare card content
    var content = await prepareContent(cards[i].content.toString());

    // get list count
    const listCount = (content.match(/<ol>/g) || []).length;
    loggg("Card", i + 1, "has lists:", listCount);

    // split card content split to multiple cards if required
    if (listCount === 0) {
      splitCards = splitCards.concat(handleNoLists(content, cards[i]));
    } else if (listCount === 1) {
      splitCards = splitCards.concat(await handleOneList(content, cards[i]));
    } else {
      splitCards = splitCards.concat(
        handleMultipleLists(content, cards[i], listCount)
      );
    }
  }

  return splitCards;
}

function handleNoLists(content, card) {
  // TODO improve interface!
  const { splitLength, clazz } = getClazzAndSplitLength(content, 0);

  const splitCardContent = [];
  const words = content.split(/\s+/);

  var index = 0;
  words.forEach((word) => {
    splitCardContent[index] = splitCardContent[index] || "";
    if (
      textOnlyLength(splitCardContent[index]) + textOnlyLength(word) >
      splitLength
    ) {
      splitCardContent[index] += "…</p>";
      splitCardContent[++index] = "<p>…";
    }
    splitCardContent[index] += splitCardContent[index].length ? " " : "";
    splitCardContent[index] += word;
  });

  // return cards
  return getCardsForSplitCardContent(splitCardContent, card, clazz);
}

async function handleOneList(content, card) {
  const { splitLength, clazz } = getClazzAndSplitLength(content, 1);

  // return if not split is required is required
  // if (textOnlyLength(content) <= splitLength) {
  //   return getCardsForSplitCardContent([content], card, clazz);
  // }

  // get content before list
  const beforeList = content.split("<ol>")[0];

  // get all list items of list
  var listItems = await convertHtmlToJsonForSelector(content, "li");
  listItems = listItems.map((i) => i.text().trim());

  // build 2 groups of list items
  const listItemGroups = [[]];
  listItems.forEach((item) => {
    item = escape(item);
    if (
      textOnlyLength(beforeList) +
        textOnlyLength(listItemGroups[0].join("")) +
        textOnlyLength(item) <
      splitLength
    ) {
      listItemGroups[0].push("<li>" + item + "</li>");
    } else {
      if (!listItemGroups[1]) {
        listItemGroups[1] = [];
      }
      listItemGroups[1].push("<li>" + item + "</li>");
    }
  });

  // build 2 card sides
  const splitCardContent = [];
  splitCardContent[0] = beforeList + "<ol>";
  splitCardContent[0] += listItemGroups[0].join("");
  splitCardContent[0] += "</ol>";

  if (listItemGroups[1]) {
    splitCardContent[1] = `<ol start="${listItemGroups[0].length + 1}">`; // TODO: Sometimes is incorrect!
    splitCardContent[1] += listItemGroups[1].join("");
    splitCardContent[1] += "</ol>";
  }

  // return cards
  return getCardsForSplitCardContent(splitCardContent, card, clazz);
}

function handleMultipleLists(content, card, listCount) {
  const { splitLength, clazz } = getClazzAndSplitLength(content, listCount);
  const splitCardContent = ["Card has multiple lists (open issue)!"];

  // return cards
  return getCardsForSplitCardContent(splitCardContent, card, clazz);
}

function getCardsForSplitCardContent(splitCardContent, card, clazz) {
  return splitCardContent.map((spc, index) => {
    card.content = null;
    const clone = JSON.parse(JSON.stringify(card));
    clone.xOfNX = splitCardContent.length > 1 ? index + 1 : null;
    clone.xOfNN = splitCardContent.length > 1 ? splitCardContent.length : null;
    clone.contentLength = textOnlyLength(spc);
    clone.clazz = clazz;
    clone.barcodes = []; //index === 1 ? barcodes : []; TODO
    clone.content = spc;
    return clone;
  });
}

////////////////////////// CLEAN / ENHANCE CARDS //////////////////////////

async function prepareContent(content) {
  // get barcodes before removing links
  const barcodes = await getBarcodes(content);

  // clean card content
  content = cleanUpcardContent(content);

  // enhance card content
  content = enhanceCardContent(content);

  // split very long lines that would push beyond card with
  content = content.replace("encodeWithSignature(", "encodeWithSignature( ");
  content = content.replace("encodeWithSelector(", "encodeWithSelector( ");

  return content;
}

function cleanUpcardContent(content) {
  // remove leading and trailing li
  if (content.startsWith("<li>")) {
    content = content.substring(4);
    content = content.slice(0, content.length - 6);
  }

  // remove all unallowed tags and link text
  const allowedTags = ["ol", "ul", "li", "p", "em", "i"];
  content = sanitizeHtml(content, { allowedTags });
  content = content.replace("(See here)", "");

  // TODO comment
  content = content.replace("encodeWithSignature(", "encodeWithSignature( ");
  content = content.replace("encodeWithSelector(", "encodeWithSelector( ");

  // remove any leading/trailing whitespace
  return content.trim();
}

function enhanceCardContent(content) {
  // add highlight to beginning of content
  // TODO: later!
  // const firstColon = content.indexOf(":");
  // if (firstColon !== -1 && firstColon < 100) {
  //   var strongContent = "<p><span><strong>" + content.slice(9, firstColon);
  //   strongContent += "</strong>" + content.slice(firstColon, content.length);
  //   content = strongContent;
  // }
  return content;
}

async function getHtmlForSplitCards(splitCards) {
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

    // header
    var headerHtml = '<div class="header sansserif">';
    headerHtml += `<h1>${card.headline}</h1>`;
    headerHtml += `<span class="counter">${card.counter}`;
    headerHtml += card.xOfNX !== null ? ` (${card.xOfNX}/${card.xOfNN})` : "";
    headerHtml += "</span>";
    headerHtml += "</div>";

    // footer (uncluding meta info for debugging)
    var metaHtml = "";
    if (meta) {
      metaHtml = `<span class="sansserif meta">`;
      metaHtml += `${card.contentLength}/${card.clazz}`;
      metaHtml += `<span>`;
    }

    var footerHtml = '<div class="footer">';
    if (typeof card !== "object") console.log(111, card);
    card.barcodes.forEach((code) => {
      footerHtml += `<span>${code}</span>`;
    });
    footerHtml += metaHtml;
    footerHtml += "</div>";

    // main content
    var contentHtml = `<div class="${card.clazz} content">${card.content}${footerHtml}</div>`;

    // all card html combined
    html += `<td><div class="card">`;
    html += headerHtml;
    html += contentHtml;
    html += `</div></td>`;

    // close row
    if (i + 1 === splitCards.length) {
      html += "</tr>";
    }
  }

  // TODO check where this comes from
  html = html.replace("undefined", "");

  html = `<!DOCTYPE html>
  <html>
      <head>
          <style>

              .card {
                height: 100%;
                position: relative;
              }

              .content {
                padding: 8px;
                padding-top: 4px;
              }

              .header {
                border-bottom: 4px solid #00fad0;
                background: #000;
                color: #fff;
                display: flex;
                padding: 10px;
              }

              .footer {
                position: absolute;
                bottom: 0;
                border: 1px solid red;
              }

              .meta {
                font-size: 14px;
              }

              h1 {
                font-size: 24px;
                flex: 0.8;
                margin: 0;
                padding: 0;
              }

              .counter {
                font-weight: bold;
                text-align: right;
                font-size: 24px;
                flex: 0.2;
              }

              body {
                  margin-top: 0cm;
              }

              p {
                  margin: 0;
                  margin-bottom: 8px;
                  padding: 0;
                  // line-height: 120%;
                  // border: 1px solid red;
              }

              table {
                  width: 100%;
                  margin-top: 7px;
                  border-collapse: collapse;
              }

              tr {
                vertical-align: top;
              }

              td {
                  width: 530px;
                  height: 385px; // 240px; // 231,86px; // 185.49px;
                  border: 1px dashed #ddd;
                  padding: 0;
                  margin: 0;
              }

              ol {
                margin: 0;
                padding-left: 20px;
                list-style-type: lower-latin;
                // border: 1px solid green;
              }

              li {
                margin: 0;
              }

              ol li::marker {
                font-weight: bold;
              }

              .nanoFont {
                font-size: 12px;
                line-height: 130%;
              }

              .microFont {
                  font-size: 16px;
                  line-height: 130%;
              }

              .tinyFont {
                  font-size: 18px;
                  line-height: 130%;
              }

              .smallFont {
                  font-size: 22px;
                  line-height: 130%;
              }

              .mediumFont {
                  font-size: 25px;
                  line-height: 130%;
              }

              .standardFont {
                  font-size: 27px;
                  line-height: 130%;
              }

              .largeFont {
                  font-size: 32px;
              }

              .sansserif {
                font-family: Helvetica, Verdana, Arial, sans-serif;
              }

          </style>
      </head>
          <body>
              <table>${html}</table>
          </body>
      </html>`;

  if (logHtml) {
    console.log(html);
  }

  return html;
}

async function getBarcodes(content) {
  const links = extractUrls(content);
  const barcodes = [];

  if (links) {
    for (const link of links) {
      barcodes.push(
        await qrCode.toString(link, {
          type: "svg",
          width: 40,
          margin: 0,
        })
      );
    }
  }

  return barcodes;
}

function getClazzAndSplitLength(content, listCount) {
  // NOTE: Only use content length without HTML tags
  const length = textOnlyLength(content);

  if (length >= 1500) {
    return {
      clazz: "nanoFont",
      splitLength: listCount > 0 ? 1700 : 2000,
    };
  }

  if (length >= 1000) {
    return {
      clazz: "microFont",
      splitLength: listCount > 0 ? 855 : 1000,
    };
  }

  if (length >= 450) {
    return {
      clazz: "tinyFont",
      splitLength: listCount > 0 ? 650 : 1000,
    };
  }

  if (length >= 300) {
    return {
      clazz: "mediumFont",
      splitLength: listCount > 0 ? 350 : 550,
    };
  }

  return {
    clazz: "standardFont",
    splitLength: listCount > 0 ? 250 : 400,
  };
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
  loggg("Fetching content from website!");
  return axios.get(website);
}

/////////////////////////// UTILITIES ///////////////////////////

function loggg(toLog) {
  if (log) {
    console.log(toLog);
  }
}

function textOnly(content) {
  return striptags(content, { allowedTags: [] });
}

function textOnlyLength(content) {
  return textOnly(content).length;
}

(async () => {
  // Solidity 101
  await doStuff({
    website: "https://secureum.substack.com/p/solidity-101",
    startingNumber: 1,
    headline: "Secureum Solidity 101",
    cachePathAndFilename: "./secureum_solidity_101.html",
    pdfPathAndFilename: "./secureum_solidity_101.pdf",
    selectors: [
      "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div > ol > li",
    ],
  });

  // Solidity 201
  await doStuff({
    website: "https://secureum.substack.com/p/solidity-201",
    startingNumber: 102,
    headline: "Secureum Solidity 201",
    cachePathAndFilename: "./secureum_solidity_201.html",
    pdfPathAndFilename: "./secureum_solidity_201.pdf",
    selectors: [
      "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div > ol > li",
    ],
  });
})();
