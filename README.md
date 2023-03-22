# Secureum flash card generator

## Problem

I am currently accumulating skills to break into the web3 industry by becoming a **smart contract auditor / security researcher**.

To improve my learning process I want to change the way how I learn from the invaluable [Secureum posts](https://secureum.substack.com/). These articles already present their content in a pretty digestable list format which is great!

But after finishing the [Solidity 101 article](https://secureum.substack.com/p/solidity-101) I wanted to get back to a few topics and repeat them to solidify and test the knowledge I gained from studying that article.

That process remembered me of times when I learned vocabulary for school and I wished I had learning cards ("flash cards") for Secureum articles. Learning this way is efficient for me.

**The advantages I see:**

- I can go through each card one at a time
- I can put cards on stacks (e.g 100% understood; 75% understood and I want to revisit; concepts to dive deeper on, etc.)
- I can make notes and highlight things on the cards
- ...

## Requirements

1. List based Secureum articles are automatically converted into printable PDFs consisting of flashcards (1 card for each list item)

2. A link to a Secureum article + maybe some article related meta data) should be the only required inputs for generating a PDF of flash cards.

3. Downsides of printed material need to be covered (e.g. convert web links into printable QR codes, that can be scanned with a mobile phone)

4. The system should be generic/flexible enough to convert future (list based) Secureum articles to flashcard PDF documents quickly

## Features

- HTML article download (including local caching on first download) ✅

- Reading article into data structure that can be processed to extract relevant content ✅

- Logic for splitting article content into flash cards ✅

- Creating scannable QR codes from links in documents ✅

- Handle multiple links in a flash card ✅

- Handle different page layouts of Secureum articles ✅

- Make sure the whole article to PDF conversion logic works with all (list based) Secureum articles ✅

- Print content that appears after an item in the articles on an additional card (also show relation to carditem number) ✅

- Option to pass custom page formatting for pages to overwrite defaults e.g. to improve where content breaks to a new card etc.) ✅

- Option to print the formatting on the page for debugging (selected font and number of chars) ✅

- Option to log the HTML that is rendered into PDF of flash cards for debugging ✅

## Issues

- Fix issues where content outside of the articles is integrated into flashcards ✅

- Fix issues where content may exceed the space available on 1 flashard (e.g. split content into front and backside; print 2 sides) ✅

- Fix card headline to top right of the card (e.g. showing "Solidity 101/13") ✅

- Need to polish font sizes, line-height etc. to make cards well readable ✅
- Some list items are switched with one another. I think this happens during render when the space at the bottom of a card is tight and content is also rendered on the next card. Need to dig more into the root cause.

- Standard formats need overhaul as some documents needed larger amounts of custom page formats. This could be solved by giving each documents its own set of defaults that fits the most common layouts of list item content extracted from articles. Having compiled all documents it is clear that the same standard formats do not work for all documents and it is super hard and time consuming to find them.

- Make more PDF compilation parameters controllable from command line (print formatting on card, log HTML to console)
- General cleanup (this is a pretty rough build)

## Covered Secureum documents

1. https://secureum.substack.com/p/ethereum-101
2. https://secureum.substack.com/p/solidity-101
3. https://secureum.substack.com/p/solidity-201
4. https://secureum.substack.com/p/audit-findings-101
5. https://secureum.substack.com/p/audit-findings-201
6. https://secureum.substack.com/p/audit-techniques-and-tools-101
7. https://secureum.substack.com/p/security-pitfalls-and-best-practices-101
8. https://secureum.substack.com/p/security-pitfalls-and-best-practices-201

## A few notes

- I didn't want to spend too much time finishing this little fun project. Well, in the end it was way more time than expected. But it was a fun project. And it may help lots of other people to learn quicker. That makes the space more secure faster and that's a good thing.

- Still in consequence that I wanted to make it quick, I didn't aim for clean JS code, test coverage etc.. I rather hacked this together to get it done ASAP to provide value to me and other people that study the Securem content.

- The PDFs in the Repo represent the current state of development. I checked them all manually against the Secureum articles.
