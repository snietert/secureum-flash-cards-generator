const extractUrls = require("extract-urls");
const qrCode = require("qrcode");
const escape = require("escape-html");

const { textOnlyLength, cleanParagraphTags, trimmedMean } = require("./tools");

async function getSplitCards(chunks, headline, formatting) {
  var splitCards = [];

  if (!formatting) {
    throw new Error("no formatting supplied");
  }

  // get formattings (split for default and additional pages)
  const defaultPagesFormatting = getFormatting(formatting, false);
  const additionalPagesFormatting = getFormatting(formatting, true);

  // iterate all chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // check that chunk always begins with list-item-card
    if (chunk[0].type !== "list-item-card") {
      throw new Error("first chunk element should be of type list-item-card");
    }

    // get child nodes of first chunk element
    const chunkElementOneChildNodes = chunk[0].content.childNodes;
    var number = chunk[0].number;

    // handle patterns of the beginning of a chunk
    const isPandOl = isExpectedTags(chunkElementOneChildNodes, ["p", "ol"]); // TODO name better
    const isP = isExpectedTags(chunkElementOneChildNodes, ["p"]);

    if (isPandOl) {
      splitCards = splitCards.concat(
        handleParagraphAndOneList(
          chunkElementOneChildNodes,
          headline,
          number,
          null,
          defaultPagesFormatting
        )
      );
    } else if (isP) {
      splitCards = splitCards.concat(
        handleParagraphs(
          chunkElementOneChildNodes,
          headline,
          number,
          defaultPagesFormatting
        )
      );
    }

    // handle chunk content after initial element
    const afterListItemCard = chunk.slice(1);

    if (afterListItemCard.length) {
      number += "+";
      const afterListItemcardElements = afterListItemCard.map((c) => c.content);
      if (isExpectedTags(afterListItemcardElements, ["p", "ol"])) {
        checkParagraphPlusListStructure(afterListItemCard); // TODO maybe delete!
        splitCards = splitCards.concat(
          handleParagraphAndOneList(
            afterListItemcardElements,
            headline,
            number,
            "extraList",
            additionalPagesFormatting
          )
        );
      } else if (isOnlyParagraphs(afterListItemCard)) {
        splitCards = splitCards.concat(
          handleParagraphs(
            afterListItemcardElements,
            headline,
            number,
            additionalPagesFormatting
          )
        );
      }
    }
  }

  // clean and enhance cards
  for (card of splitCards) {
    await addBarcodes(card);
    await prepareContent(card);
  }

  return splitCards;
}

function getFormatting(formatting, isAdditionalContent) {
  const newFormatting = JSON.parse(JSON.stringify(formatting));
  const pages = Object.keys(formatting.fonts.pages);

  pages.forEach((page) => {
    if (isAdditionalContent && newFormatting.fonts.pages[page][1]) {
      // formatting for additional pages if set
      newFormatting.fonts.pages[page] = newFormatting.fonts.pages[page][1];
    } else {
      // formatting for default pages (and additional pages if no extra formatting set)
      newFormatting.fonts.pages[page] = newFormatting.fonts.pages[page][0];
    }
  });

  return newFormatting;
}

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

function checkParagraphPlusListStructure(items) {
  items.forEach((item, index) => {
    if (items.length !== 2) {
      throw new Error("2 items were expected");
    }

    if (index === 0 && item.type !== "paragraph") {
      throw new Error("paragraph type was expected, got ", item.type);
    } else if (index == 1 && item.type !== "list") {
      throw new Error("list type was expected, got  ", item.type);
    }

    if (item.type === "list") {
      item.content.childNodes.forEach((li) => {
        li.childNodes.forEach((c) => {
          if (c.rawTagName !== "p") {
            throw new Error("paragraph tag was expected, got " + c.rawTagName);
          }
        });
      });
    }
  });
}

function isOnlyParagraphs(items) {
  items.forEach((item) => {
    if (item.type !== "paragraph") {
      return false;
    }
  });
  return true;
}

function handleParagraphs(nodes, headline, number, formatting) {
  var content = nodes.map((n) => n.toString()).join("");
  content = cleanParagraphTags(content);

  // NOTE: Links count equals barcodes count
  const barcodesCount = getLinks(content).length;

  const { splitLength, clazz } = getClazzAndSplitLength(
    content,
    [],
    barcodesCount,
    number,
    formatting
  );

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

function handleParagraphAndOneList(
  nodes,
  headline,
  number,
  listClazz,
  formatting
) {
  const paragraph = nodes[0];
  const list = nodes[1];

  if (
    nodes.length !== 2 ||
    paragraph.rawTagName !== "p" ||
    list.rawTagName !== "ol"
  ) {
    throw new Error("Chunk for paragraph with single list has wrong stucture!");
  }

  // get the full content
  const fullContent = nodes.toString();

  // NOTE: Links count equals barcodes count
  const barcodesCount = getLinks(fullContent).length;

  // get the clazz based on full content length
  const { splitLength, clazz } = getClazzAndSplitLength(
    fullContent,
    [list],
    barcodesCount,
    number,
    formatting
  );

  // get the content of the paragraph
  const paragraphContent = paragraph.toString();

  // get all list items
  const listItems = list.childNodes;

  // build 2 groups of list items
  const listItemGroups = [[]];
  listItems.forEach((item) => {
    // Get current item content
    const itemContent = item.toString();
    item = escape(itemContent);

    // Calculate the length of current content + content to add (current item)
    const newLength =
      textOnlyLength(paragraphContent) +
      textOnlyLength(listItemGroups[0].join("")) +
      textOnlyLength(itemContent);

    // Only add to second list if split length is exceeded
    if (newLength <= splitLength) {
      listItemGroups[0].push(itemContent);
    } else {
      listItemGroups[1] = listItemGroups[1] || [];
      listItemGroups[1].push(itemContent);
    }
  });

  // build 2 card sides
  const splitCardContent = [];
  splitCardContent[0] = `${paragraphContent}`;
  splitCardContent[0] += `<ol class="${listClazz || ""}">`;
  splitCardContent[0] += listItemGroups[0].join("");
  splitCardContent[0] += "</ol>";

  if (listItemGroups[1]) {
    splitCardContent[1] = `<ol class="${listClazz || ""}" start="${
      listItemGroups[0].length + 1
    }">`; // TODO: Sometimes is incorrect!
    splitCardContent[1] += listItemGroups[1].join("");
    splitCardContent[1] += "</ol>";
  }

  return getCardsForSplitCardContent(splitCardContent, clazz, number, headline);
}

////////////////////////// CLEAN / ENHANCE CARDS //////////////////////////

async function addBarcodes(card) {
  card.barcodes = await getBarcodes(card.content);
}

function prepareContent(card) {
  var content = card.content;

  // clean card content
  content = cleanUpcardContent(content);

  // enhance card content
  content = enhanceCardContent(content, card.xOfNX);

  // split very long lines that would push beyond card with
  content = content.replace("encodeWithSignature(", "encodeWithSignature( ");
  content = content.replace("encodeWithSelector(", "encodeWithSelector( ");

  card.content = content;

  return card;
}

function cleanUpcardContent(content) {
  // add whitespaces to make long expressions break (would overflow layout otherwise)
  content = content.replace("encodeWithSignature(", "encodeWithSignature( ");
  content = content.replace("encodeWithSelector(", "encodeWithSelector( ");
  content = content.replace(
    // TODO make general or move into document specific input
    "CALLDATASIZE/CALLDATALOAD/CALLDATACOPY",
    "CALLDATASIZE / CALLDATALOAD / CALLDATACOPY"
  );

  // remove any leading/trailing whitespace
  return content.trim();
}

function enhanceCardContent(content, xOfN) {
  // add highlight to beginning of content on first card page
  if ([null, 1].includes(xOfN)) {
    const maxColonPosition = 200;
    const colonPosition = content.indexOf(":");
    const isHeadline = colonPosition !== -1 && colonPosition < maxColonPosition; // NOTE: Heuristic to estimate if it is a headline
    if (colonPosition && isHeadline) {
      const emPosition = content.indexOf("<em>");
      const emContained = emPosition !== -1 && emPosition < colonPosition;
      if (emContained) {
        // if em is contained
        content = content.replace(
          /(\S*<em>)((?:(?!<\/em>).)*)(.*)/gm,
          "$1<strong>$2</strong>$3"
        );
      } else {
        // if no em contained
        content = content.replace(
          /(\S+>)([^<:]+:)(.*)/gm,
          "$1<strong>$2</strong>$3"
        );
      }
    }
  }
  return content;
}

async function getBarcodes(content) {
  const links = getLinks(content);
  const barcodes = [];

  /* NOTE: We ignore barcodes where there would be too many
   like in card 30 of https://secureum.substack.com/p/audit-techniques-and-tools-101 */
  // TODO: maybe solve differently
  if (links.length > 8) {
    return ["(QR codes omitted)"];
  }

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

function getLinks(content) {
  return extractUrls(content) || [];
}

/////////////////////////////// SPLIT CARDS ///////////////////////////////

function getCardsForSplitCardContent(
  splitCardContent,
  clazz,
  number,
  headline
) {
  return splitCardContent.map((spc, index) => {
    return {
      headline,
      number,
      xOfNX: splitCardContent.length > 1 ? index + 1 : null,
      xOfNN: splitCardContent.length > 1 ? splitCardContent.length : null,
      contentLength: textOnlyLength(spc),
      clazz,
      barcodes: [],
      content: spc,
    };
  });
}

function getClazzAndSplitLength(
  content,
  lists,
  barcodesCount,
  number,
  formatting
) {
  const length = textOnlyLength(content); // NOTE: Only use content length without HTML tags
  const listCount = lists.length;
  const { standard, pages } = formatting.fonts;

  // get font from page specific formatting (standard overwrites to fix edge cases)
  var font = pages && pages[("" + number).replace("+", "")]; // TODO solve differently

  // get font from standard formatting for content length
  if (!font) {
    font = standard.find((font) => length >= font[0]);
  }

  const clazzAndLength = {
    clazz: font[3],
    splitLength: listCount > 0 ? font[1] : font[2],
    barcodesFactor: font[4],
  };

  // handle barcodes
  if (barcodesCount) {
    clazzAndLength.splitLength = Math.floor(
      clazzAndLength.splitLength * (1 - clazzAndLength.barcodesFactor)
    );
  }

  // handle lists with many short items (they stack high and take lots of vertical space)
  if (listCount > 0) {
    if (listCount > 1) {
      throw new Error("handling more tahn one list is not yet implemented!");
    }

    // inspect the list for hints of occupying lots of vertical space
    const childNodes = lists[0].childNodes;
    if (childNodes.length > 5) {
      const itemLengths = childNodes.map((item) => {
        return textOnlyLength(item.toString());
      });
      const trimFromBithSides = childNodes.length <= 5 ? 0.25 : 0.1;
      const mean = trimmedMean(itemLengths, trimFromBithSides);

      // reduce split length for small means
      const threshold = 30;
      const reduction = 0.15;

      if (mean < threshold) {
        clazzAndLength.splitLength =
          clazzAndLength.splitLength * (1 - reduction);
      }
    }

    // TODO fix! (seems to belong to 1 particular card!)
    // clazzAndLength.splitLength =
    //   number === 90 ? 250 : clazzAndLength.splitLength;
  }

  return clazzAndLength;
}

module.exports = { getSplitCards };
