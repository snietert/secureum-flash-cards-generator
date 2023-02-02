# Secureum posts as flash cards

## Problem/solution

I am currently accumulating skills to break into the web3 industry by becoming a **smart contract auditor**.

To improve my learning process I want to change the way how I learn from the invakluable [Secureum posts](https://secureum.substack.com/). These articles already present their content in a pretty digestable list format which is great!

But after finishing the [Solidity 101 article](https://secureum.substack.com/p/solidity-101) I wanted to get back to a few topics and repeat them to solidify and test the knowledge I gained from studying that article.

That process remembered me of times when I learned vocabulary for school and I wished I had learning cards ("flash cards") for Secureum articles. Learning this way is efficient for me. **The advantages I see:**

- I can go through each card one at a time
- I can put cards on stacks (e.g 100% understood; 75% understood but maybe content I may loose in parts due to its complexity; Concepts to dive deeper on, ...)
- I can make notes and highlight things on the cards
- ...

## Requirements

1. List based Secureum articles are automatically converted into printable PDFs consisting of flashcards (1 card for each list item)
2. A link to a Secureum article + maybe some article related meta data) should be the only required inputs for generating a PDF.
3. Downsides of printed material need to be covered (e.g. convert web links into printable QR codes, that can be scanned with a mobile phone while learning with the printed flashcards)

## Progress/Open topics

- HTML article download ✅
- Reading article into data structure that can be processed to extract relevant content: ✅
- Base logic for splitting article content into flash cards ✅
- Creating scannable QR codes from links in documents ✅
- Handle multiple links in a flash card (and links not at the end of an article)
- Fix issues where content outside of the articles is integrated into flashcards
- Fix issues where content may exceed the space available on 1 flashard (e.g. split content into front and backside; print 2 sides)
- Make sure the whol article to PDF conversion logic works with all (list based) Secureum articles.
- Need to polish font sizes, line-height etc. to make cards well readable
- Fix card headline to top left of the card (e.g. showing "Solidity 101/13")
- ... more issues will come up for sure
-

## A few notes

- I don't want to spend too much time finishing this little fun project
- I actually want to spend time learning the actual content of the Secureum articles
- In consequence don't expect clean JS code, test coverage etc.. I will hack this together to it done ASAP to provide value to me and other people that study the Securem content.
- An YES, maybe it would be quicker to manually convert the Secureum article content into flashcards. But after all... that is not fun and it surely would not scale for future articles.
- The PDFs in the Repo represent the current state of development
