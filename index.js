const axios = require("axios");
const fs = require("fs");
const puppeteer = require("puppeteer");
const extractUrls = require("extract-urls");
const striptags = require("striptags");
const qrCode = require("qrcode");
const sanitizeHtml = require("sanitize-html");
const escape = require("escape-html");
const util = require("util");
var HTMLParser = require("node-html-parser");

// globals
const log = false;
const logHtml = true;
const meta = false;
const limit = 1000000;

async function doStuff(options) {
  // read options
  const {
    website,
    headline,
    cachePathAndFilename,
    pdfPathAndFilename,
    startingNumber,
    selector,
  } = options;

  console.log(
    `\n---------- HANDLING DOCUMENT "${headline.toUpperCase()}" ----------`
  );

  // download HTML from URL (and cache)
  var html = await getContent(website, { cachePathAndFilename });

  // extract the high level content separation (stacked lists and paragraphs)
  var highlevel = await fetchHighLevelContentSeparation(html, selector);

  // split highlevel content into content and references
  // TODO handle for list only pages (e.g. "Solidity 101")
  const splitPosition = highlevel.findIndex((h) => h.rawTagName === "div");
  const hlContent =
    splitPosition !== -1 ? highlevel.slice(0, splitPosition) : highlevel;
  const refrences =
    splitPosition !== -1 ? highlevel.slice(splitPosition + 1) : null;

  // package high level content into enumerated cards and additional content
  const cards = [];

  // handle top level elements
  var number;
  var lastCardNumber = null;

  const getStartAttribute = (element) => {
    var start = element.rawAttrs.split('"')[1];
    return parseInt(start) || null;
  };

  const pushElement = (card, element, tag) => {
    console.log(`push element with tag: ${tag}`);
    card.push(element);
  };

  const saveCard = (card, where, start, lastStart) => {
    // log where card is saved and card was empty
    if (!card.length) {
      console.log(
        `-------------------- SAVE CARD IGNORED (where: "${where}", start: ${start}, last start: ${lastStart}) --------------------`
      );
      return;
    }

    // push card on stack and create new card
    const tags = card.map((i) => i.content.rawTagName);
    cards.push(card);
    card = [];
    console.log(
      `-------------------- SAVE CARD (tags: ${tags}, where: "${where}", start: ${start}, last start: ${lastStart}) --------------------`
    );
  };

  var card = []; // create the first card

  hlContent.forEach((hl, index) => {
    // get next highlevel content element
    const nextHlContent = hlContent[index + 1];
    var contentFollowing = nextHlContent && !getStartAttribute(nextHlContent);

    // try to detect the start from the start attribute
    var cardNumber = getStartAttribute(hl) || lastCardNumber;
    if (cardNumber === null && hlContent.length === 1) {
      cardNumber = 1;
    }

    // // check if a new card needs to be created
    if (lastCardNumber && cardNumber !== lastCardNumber) {
      saveCard(card, "hl iteration", cardNumber, lastCardNumber);
      card = [];
    }

    // handle top level list
    if (hl.rawTagName === "ol") {
      console.log(
        `# LIST (card number: ${cardNumber}, last card number: ${lastCardNumber}, children: ${hl.childNodes.length})`
      );

      // check if list items should be treated as single cards
      const listItemsAreCards =
        getStartAttribute(hl) !== null || (index === 0 && !nextHlContent);

      // iterate all list items
      const listItems = hl.childNodes;

      listItems.forEach((li, index) => {
        const number = cardNumber + (listItemsAreCards ? index : 0); // TODO
        loggg(`... list item (index: ${index}, number: ${number})`);

        // get next list item
        const nextListItem = listItems[index + 1];

        // push the list item onto the card
        pushElement(
          card,
          {
            type: listItemsAreCards ? "list-item-card" : "list-item",
            content: li,
            number,
          },
          "li"
        );

        // do not close card for list items that are no card
        if (!listItemsAreCards) {
          console.log("li iteration -> list item is no card");
          lastCardNumber = number;
          return;
        }

        // close card for list items that are cards
        if (nextListItem) {
          // close card if here is a next list item
          loggg("li iteration -> list item is card | not last list item");
          saveCard(card, "li iteration", cardNumber, lastCardNumber);
          card = [];
        } else if (!contentFollowing) {
          // close card if there is no next list item and no content following
          loggg(
            "li iteration -> list item is card | last list item + no content following"
          );
          saveCard(card, "li iteration", cardNumber, lastCardNumber);
          card = [];
        } else if (contentFollowing) {
          // do not close card if there is no next list item and content following
          loggg(
            "li iteration -> list item is card | last list item + content following"
          );
        } else {
          throw new Error("unhandled condition!");
        }

        lastCardNumber = number;
      });
    }

    // handle top level paragraphs
    else if (hl.rawTagName === "p") {
      console.log(
        `# PARAGRAPH (card number: ${cardNumber}, last card number: ${lastCardNumber})`
      );
      pushElement(
        card,
        {
          type: "paragraph",
          content: hl,
          number: lastCardNumber,
        },
        "p"
      );
    }

    // close list if no next high level element
    if (!nextHlContent) {
      saveCard(card, "end", cardNumber, lastCardNumber);
      card = [];
    }
  });

  console.log(cards);

  return;

  // process high level content separation
  const splitCards = await getSplitCards(chunks, headline);
  await browser.close();
  return;

  // // split HTML content into high level chunks
  // const chunks = getChunks(elements);

  // generate PDF from cards content
  await generatePdf(highlevel, headline, pdfPathAndFilename);
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

function getChunks(elements) {
  const chunks = [];
  var chunk = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const nextElement = elements[i + 1];

    // create new chunk
    chunk = chunk || [];

    // collect element in chunk
    chunk.push({
      tag: element["0"].name,
      start: element["0"].attribs.start || null,
      content: element,
    });

    // push chunk if chunk has ended or last element was reached
    if (!nextElement || nextElement["0"].attribs.start) {
      chunks.push(chunk);
      chunk = null;
    }
  }

  return chunks;
}

async function generatePdf(chunks, headline, pathAndFilename) {
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

/////////////////////////////// SPLIT CARDS ///////////////////////////////

async function getSplitCards(chunks, headline) {
  // handle single toplevel list
  if (chunks.length === 1) {
    var content = chunks[0][0].content.html();
    // content = content.substring(4);
    // content = content.substring(0, content.length - 5);
    var listItems = await fetchHighLevelContentSeparation(content, "li");
    listItems = listItems.map((i) => i.text().trim()); // TODO check if necessary!
    console.log(listItems);
  }

  return;

  // handle vs.multiple top level lists with start attribute

  // iterate all chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const startList = entry.start !== null;

    // handle single toplevel list

    // iterate all chunk entries
    for (let x = 0; x < chunk.length; x++) {
      const entry = chunk[x];
      // console.log(111, entry);
    }

    // // get list count
    // const listCount = chunk.elements.filter((e) => e.tag === "ol").length;
    // loggg(`Chunk ${i} has ${listCount} lists`);

    // if (listCount === 1 && i === 2) {
    //   splitCards = splitCards.concat(await handleOneList(chunk, headline));
    // }

    // prepare card content
    // var content = await prepareContent(cards[i].content.toString());

    // split card content split to multiple cards if required
    // if (listCount === 0) {
    //   splitCards = splitCards.concat(handleNoLists(chunk, cards[i]));
    // } else if (listCount === 1) {

    // } else {
    //   splitCards = splitCards.concat(
    //     handleMultipleLists(chunk, cards[i], listCount)
    //   );
    // }
  }

  return [];
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

async function handleOneList(chunk, headline) {
  loggg(`Handle chunk with tags: ${chunk.elements.map((e) => e.tag)}`);

  // NOTE: Assumption is that chunks with a list always start with a list
  if (chunk.elements[0].tag !== "ol" || chunk.elements[0].start === null) {
    throw new Error("Chunk with single list does not start with a list!");
  }

  // get the list content
  const fullContent = chunk.elements.map((e) => e.element.html()).join("");
  const beforeListContent = fullContent.split(/<ol.*>/)[0].substring(4); // TODO clean the leading <i> in a better way
  // TODO handle after list content!
  const listContent = chunk.elements[0].element.html();
  console.log("LIST", listContent);
  return;

  const { splitLength, clazz } = getClazzAndSplitLength(fullContent, 1);

  // get all list items of list
  var listItems = await fetchHighLevelContentSeparation(listContent, "li");
  listItems = listItems.map((i) => i.text().trim()); // TODO check if necessary!

  listItems.forEach((item, index) => {
    console.log(123, index, item);
  });

  // build 2 groups of list items
  const listItemGroups = [[]];
  listItems.forEach((item) => {
    item = escape(item);
    if (
      textOnlyLength(beforeListContent) +
        textOnlyLength(listItemGroups[0].join("")) +
        textOnlyLength(item) <
      splitLength
    ) {
      listItemGroups[0].push("<li>" + item + "</li>");
    } else {
      listItemGroups[1] = listItemGroups[1] || [];
      listItemGroups[1].push("<li>" + item + "</li>");
    }
  });

  // build 2 card sides
  const splitCardContent = [];
  splitCardContent[0] = `AAA1${beforeListContent}<ol>`;
  splitCardContent[0] += listItemGroups[0].join("");
  splitCardContent[0] += "</ol>AAA2" + listItemGroups[0].length;

  if (listItemGroups[1]) {
    splitCardContent[1] = `BBB1<ol start="${listItemGroups[0].length + 1}">`; // TODO: Sometimes is incorrect!
    splitCardContent[1] += listItemGroups[1].join("");
    splitCardContent[1] += "</ol>BBB2" + listItemGroups[1].length;
  }

  // return cards
  return getCardsForSplitCardContent(splitCardContent, headline, clazz);
}

function handleMultipleLists(content, card, listCount) {
  const { splitLength, clazz } = getClazzAndSplitLength(content, listCount);
  const splitCardContent = ["Card has multiple lists (open issue)!"];

  // return cards
  return getCardsForSplitCardContent(splitCardContent, card, clazz);
}

function getCardsForSplitCardContent(splitCardContent, headline, clazz) {
  return splitCardContent.map((spc, index) => {
    return {
      headline,
      xOfNX: splitCardContent.length > 1 ? index + 1 : null,
      xOfNN: splitCardContent.length > 1 ? splitCardContent.length : null,
      contentLength: textOnlyLength(spc),
      clazz: clazz,
      barcodes: [], //index === 1 ? barcodes : [], TODO
      content: spc,
    };
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

async function getHtmlForSplitCards(splitCards, headline) {
  // Prepare HTML to be rendered
  var html = "";

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

async function fetchHighLevelContentSeparation(html, selector) {
  return HTMLParser.parse(html).querySelector(selector).childNodes;
  // .childNodes.map((t) => t.rawTagName);
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
    selector:
      "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
  });

  // Solidity 201
  await doStuff({
    website: "https://secureum.substack.com/p/solidity-201",
    startingNumber: 102,
    headline: "Secureum Solidity 201",
    cachePathAndFilename: "./secureum_solidity_201.html",
    pdfPathAndFilename: "./secureum_solidity_201.pdf",
    selector:
      "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
  });
})();
