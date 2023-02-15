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
const logHtml = false;
const meta = false;
const limit = 1000000;

renderSolidity101 = true;
renderSolidity202 = true;
renderAuditFindings101 = true;
renderAuditFindings201 = true;
renderTechniquesAndTools101 = true;

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

  // split content into chunks that represent cards (on a high level)
  const chunks = getChunks(hlContent);

  // get cards for chunks
  const splitCards = await getSplitCards(chunks, headline);
  // console.log(111, splitCards);

  // generate PDF from cards content
  await generatePdf(splitCards, pdfPathAndFilename);
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

function getChunks(hlContent) {
  const cards = [];

  // handle top level elements
  var lastCardNumber = null;

  const getStartAttribute = (element) => {
    var start = element.rawAttrs.split('"')[1];
    return parseInt(start) || null;
  };

  const pushElement = (card, element, tag) => {
    loggg(`push element with tag: ${tag}`);
    card.push(element);
  };

  const saveCard = (card, where, start, lastStart) => {
    // log where card is saved and card was empty
    if (!card.length) {
      loggg(
        `-------------------- SAVE CARD IGNORED (where: "${where}", start: ${start}, last start: ${lastStart}) --------------------`
      );
      return;
    }

    // push card on stack and create new card
    const tags = card.map((i) => i.content.rawTagName);
    cards.push(card);
    card = [];
    loggg(
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

    // check if a new card needs to be created
    if (lastCardNumber && cardNumber !== lastCardNumber) {
      saveCard(card, "hl iteration", cardNumber, lastCardNumber);
      card = [];
    }

    // handle top level list
    if (hl.rawTagName === "ol") {
      loggg(
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
          loggg("li iteration -> list item is no card");
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
      loggg(
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

  return cards;
}

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

/////////////////////////////// SPLIT CARDS ///////////////////////////////

async function getSplitCards(chunks, headline) {
  var splitCards = [];

  // iterate all chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // set card number
    const number = i + 1;

    // get child nodes of first chunk element
    const childNodes = chunk[0].content.childNodes;

    // ---------- handle single list item card ----------

    const singleListItemCard =
      chunk.length === 1 && chunk[0].type === "list-item-card";

    if (singleListItemCard) {
      loggg(`# Handle single list item (chunk number/index: ${i + 1}/${i})`);

      // console.log(
      //   "000",
      //   chunk.map((t) => t.type),
      //   childNodes.map((t) => {
      //     if (t.rawTagName === "ol") {
      //       return (
      //         t.rawTagName + " -> " + t.childNodes.map((c) => c.rawTagName)
      //       );
      //     }
      //     return t.rawTagName;
      //   })
      // );

      // handle a single paragraph is in list item
      if (isExpectedTags(childNodes, ["p"])) {
        loggg(
          `... Handle a single paragraph in list item (chunk number/index: ${
            i + 1
          }/${i})`
        );
        splitCards = splitCards.concat(
          handleSingleParagraph(childNodes[0], number, headline)
        );
        continue;
      }

      // handle a single paragraph followed by a single list in list item
      if (isExpectedTags(childNodes, ["p", "ol"])) {
        loggg(
          `... Handle a single paragraph followed by a single list in list item (chunk number/index: ${
            i + 1
          }/${i})`
        );

        splitCards = splitCards.concat(
          await handleParagraphAndOneList(
            chunk[0].content.childNodes,
            number,
            headline
          )
        );
        continue;
      }

      console.log(
        111,
        childNodes.map((t) => t.rawTagName)
      );
      continue;
    }

    // -------- handle non single list item card --------

    loggg(`# Handle NOT single list item (chunk number/index: ${i + 1}/${i})`);

    // handle where content begins with single paragraph followed by a list
    if (isExpectedTags(childNodes, ["p", "ol"])) {
      console.log(
        333,
        chunk.map((c) => c.type)
      );
      // handle paragraph and list
      splitCards = splitCards.concat(
        await handleParagraphAndOneList(
          chunk[0].content.childNodes,
          number,
          headline
        )
      );
      continue;

      // handle additional content

      console.log(
        222,
        i,
        chunk.map((t) => {
          if (t.content.rawTagName === "li") {
            return (
              t.content.rawTagName +
              " / " +
              t.number +
              " -> " +
              t.content.childNodes.map((c) => c.rawTagName)
            );
          }
          return t.content.rawTagName;
        })
      );
    }
  }

  return splitCards;

  function isExpectedTags(nodes, expectedTags) {
    if (!nodes || !expectedTags) {
      throw new Error("nodes or expected tags is wrong");
    }
    const tags = getTagsFromNodes(nodes);
    return JSON.stringify(tags) === JSON.stringify(expectedTags);
  }

  function getTagsFromNodes(nodes) {
    return nodes.map((t) => t.rawTagName);
  }

  // // get list count
  // const listCount = chunk.elements.filter((e) => e.tag === "ol").length;
  // loggg(`Chunk ${i} has ${listCount} lists`);

  // if (listCount === 1 && i === 2) {
  //   splitCards = splitCards.concat(await handleParagraphAndOneList(chunk, headline));
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
  return splitCards;
}

function handleSingleParagraph(node, number, headline) {
  const content = node.toString();
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

  return getCardsForSplitCardContent(splitCardContent, clazz, number, headline);
}

async function handleParagraphAndOneList(nodes, number, headline) {
  const paragraph = nodes[0];
  const list = nodes[1];

  if (
    nodes.length !== 2 ||
    paragraph.rawTagName !== "p" ||
    list.rawTagName !== "ol"
  ) {
    throw new Error("Chunk for paragraph with single list has wrong stucture!");
  }

  // get the clazz based on full content length
  const fullContent = nodes.toString();
  const { splitLength, clazz } = getClazzAndSplitLength(fullContent, 1);

  // get the content of the paragraph
  const paragraphContent = paragraph.toString();

  // get all list items
  const listItems = list.childNodes;

  // build 2 groups of list items
  const listItemGroups = [[]];
  listItems.forEach((item) => {
    const itemContent = item.toString();
    item = escape(itemContent);
    if (
      textOnlyLength(paragraphContent) +
        textOnlyLength(listItemGroups[0].join("")) +
        textOnlyLength(itemContent) <
      splitLength
    ) {
      listItemGroups[0].push(itemContent);
    } else {
      listItemGroups[1] = listItemGroups[1] || [];
      listItemGroups[1].push(itemContent);
    }
  });

  // build 2 card sides
  const splitCardContent = [];
  splitCardContent[0] = `${paragraphContent}`;
  splitCardContent[0] += "<ol>";
  splitCardContent[0] += listItemGroups[0].join("");
  splitCardContent[0] += "</ol>";

  if (listItemGroups[1]) {
    splitCardContent[1] = `<ol start="${listItemGroups[0].length + 1}">`; // TODO: Sometimes is incorrect!
    splitCardContent[1] += listItemGroups[1].join("");
    splitCardContent[1] += "</ol>";
  }

  return getCardsForSplitCardContent(splitCardContent, clazz, number, headline);
}

function handleMultipleLists(content, card, listCount) {
  const { splitLength, clazz } = getClazzAndSplitLength(content, listCount);
  const splitCardContent = ["Card has multiple lists (open issue)!"];

  // return cards
  return getCardsForSplitCardContent(splitCardContent, card, clazz);
}

function getCardsForSplitCardContent(
  splitCardContent,
  clazz,
  number,
  headline
) {
  return splitCardContent.map((spc, index) => {
    return {
      headline,
      counter: number,
      xOfNX: splitCardContent.length > 1 ? index + 1 : null,
      xOfNN: splitCardContent.length > 1 ? splitCardContent.length : null,
      contentLength: textOnlyLength(spc),
      clazz,
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
                color: red;
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

              .picoFont {
                font-size: 11px;
                line-height: 130%;
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

  if (length >= 1800) {
    return {
      clazz: "picoFont",
      splitLength: listCount > 0 ? 1650 : 2200,
    };
  }

  if (length >= 1500) {
    return {
      clazz: "nanoFont",
      splitLength: listCount > 0 ? 1300 : 2000,
    };
  }

  if (length >= 1000) {
    return {
      clazz: "microFont",
      splitLength: listCount > 0 ? 700 : 1000,
    };
  }

  if (length >= 450) {
    return {
      clazz: "tinyFont",
      splitLength: listCount > 0 ? 600 : 1000,
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
  if (renderSolidity101) {
    await doStuff({
      website: "https://secureum.substack.com/p/solidity-101",
      startingNumber: 1,
      headline: "Secureum Solidity 101",
      cachePathAndFilename: "./secureum_solidity_101.html",
      pdfPathAndFilename: "./secureum_solidity_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Solidity 201
  if (renderSolidity202) {
    await doStuff({
      website: "https://secureum.substack.com/p/solidity-201",
      startingNumber: 102,
      headline: "Secureum Solidity 201",
      cachePathAndFilename: "./secureum_solidity_201.html",
      pdfPathAndFilename: "./secureum_solidity_201.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Audit Findings 101
  if (renderAuditFindings101) {
    await doStuff({
      website: "https://secureum.substack.com/p/audit-findings-101",
      startingNumber: 1,
      headline: "Secureum Audit Findings 101",
      cachePathAndFilename: "./secureum_audit_findings_101.html",
      pdfPathAndFilename: "./secureum_audit_findings_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Audit Findings 201
  if (renderAuditFindings201) {
    await doStuff({
      website: "https://secureum.substack.com/p/audit-findings-201",
      startingNumber: 102,
      headline: "Secureum Audit Findings 201",
      cachePathAndFilename: "./secureum_audit_findings_201.html",
      pdfPathAndFilename: "./secureum_audit_findings_201.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Audit Techniques & Tools 101
  if (renderTechniquesAndTools101) {
    await doStuff({
      website: "https://secureum.substack.com/p/audit-techniques-and-tools-101",
      startingNumber: 1,
      headline: "Secureum Audit Techniques & Tools 101",
      cachePathAndFilename: "./secureum_audit_techniques_and_tools_101.html",
      pdfPathAndFilename: "./secureum_audit_techniques_and_tools_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }
})();
