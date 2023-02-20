const { textOnlyLength, removeParagraphTags } = require("./tools");

async function getSplitCards(chunks, headline) {
  var splitCards = [];

  // iterate all chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // set card number
    const number = i + 1;

    // check that chunk always begins with list-item-card
    if (chunk[0].type !== "list-item-card") {
      throw new Error("first chunk element should be of type list-item-card");
    }

    // get child nodes of first chunk element
    const chunkElementOneChildNodes = chunk[0].content.childNodes;

    // handle patterns of the beginning of a chunk
    const isPandOl = isExpectedTags(chunkElementOneChildNodes, ["p", "ol"]); // TODO name better
    const isP = isExpectedTags(chunkElementOneChildNodes, ["p"]);

    if (isPandOl) {
      splitCards = splitCards.concat(
        handleParagraphAndOneList(chunkElementOneChildNodes, number, headline)
      );
    } else if (isP) {
      splitCards = splitCards.concat(
        handleParagraphs(chunkElementOneChildNodes, number, headline)
      );
    }

    // handle chunk content after initial element
    const afterListItemCard = chunk.slice(1);

    if (afterListItemCard.length) {
      const afterListItemcardElements = afterListItemCard.map((c) => c.content);
      if (isExpectedTags(afterListItemcardElements, ["p", "ol"])) {
        checkParagraphPlusListStructure(afterListItemCard); // TODO maybe delete!
        splitCards = splitCards.concat(
          handleParagraphAndOneList(afterListItemcardElements, number, headline)
        );
      } else if (isOnlyParagraphs(afterListItemCard)) {
        splitCards = splitCards.concat(
          handleParagraphs(afterListItemcardElements, number, headline)
        );
      }
    }
  }

  return splitCards;
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

function handleParagraphs(nodes, number, headline, xxx) {
  var content = nodes.map((n) => n.toString()).join("");
  content = removeParagraphTags(content);

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

function handleParagraphAndOneList(nodes, number, headline) {
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

module.exports = { getSplitCards };
