const { loggg } = require("./tools");

function getChunks(hlContent) {
  const cards = [];

  // handle top level elements
  var lastCardNumber = null;

  // TODO move functions out
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

      // ----- check if list items should be treated as single cards -----
      const listItemsAreCards =
        getStartAttribute(hl) !== null || (index === 0 && !nextHlContent);

      // -- handle list where list items are cards ---

      if (listItemsAreCards) {
        // iterate all list items
        const listItems = hl.childNodes;

        listItems.forEach((li, index) => {
          const number = cardNumber + index;
          loggg(`... list item (index: ${index}, number: ${number})`);

          // get next list item
          const nextListItem = listItems[index + 1];

          // push the list item onto the card
          pushElement(
            card,
            {
              type: "list-item-card",
              content: li,
              number,
            },
            "li"
          );

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

        return;
      }

      // -- handle list where list items are no cards (additional content e.g. to last card) ---

      pushElement(
        card,
        {
          type: "list",
          content: hl,
          number: lastCardNumber,
        },
        "ol"
      );
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

module.exports = { getChunks };
