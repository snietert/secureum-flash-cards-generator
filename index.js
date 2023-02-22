var HTMLParser = require("node-html-parser");

const { getContent } = require("./fetch");
const { getChunks } = require("./chunks");
const { getSplitCards } = require("./cards");
const { generatePdf } = require("./pdf");

// document selectors
renderEthereum101 = true;
renderSolidity101 = true;
renderSolidity201 = true;
renderAuditTechniques101 = true;
renderAuditFindings101 = true;
renderAuditFindings201 = true;
renderSecurityPitfalls101 = true;
renderSecurityPitfalls201 = true;

async function doStuff(options) {
  const {
    website,
    headline,
    cachePathAndFilename,
    pdfPathAndFilename,
    selector,
  } = options;

  console.log(
    `\n---------- HANDLING DOCUMENT "${headline.toUpperCase()}" ----------`
  );

  // download HTML from URL (and cache)
  var html = await getContent(website, { cachePathAndFilename });

  // extract the high level content separation (stacked lists and paragraphs)
  var highlevel = HTMLParser.parse(html).querySelector(selector).childNodes;

  // split highlevel content into content and references
  const splitPosition = highlevel.findIndex((h) => h.rawTagName === "div");
  const hlContent =
    splitPosition !== -1 ? highlevel.slice(0, splitPosition) : highlevel;
  const refrences =
    splitPosition !== -1 ? highlevel.slice(splitPosition + 1) : null;

  // split content into chunks that represent cards (on a high level)
  const chunks = getChunks(hlContent);

  // get cards for chunks
  const splitCards = await getSplitCards(chunks, headline);

  // generate PDF from cards content
  await generatePdf(splitCards, pdfPathAndFilename);
}

(async () => {
  // Ethereum 101
  if (renderEthereum101) {
    await doStuff({
      website: "https://secureum.substack.com/p/ethereum-101",
      startingNumber: 1,
      headline: "Ethereum 101",
      cachePathAndFilename: "./secureum_ethereum_101.html",
      pdfPathAndFilename: "./secureum_ethereum_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Solidity 101
  if (renderSolidity101) {
    await doStuff({
      website: "https://secureum.substack.com/p/solidity-101",
      startingNumber: 1,
      headline: "Solidity 101",
      cachePathAndFilename: "./secureum_solidity_101.html",
      pdfPathAndFilename: "./secureum_solidity_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Solidity 201
  if (renderSolidity201) {
    await doStuff({
      website: "https://secureum.substack.com/p/solidity-201",
      startingNumber: 102,
      headline: "Solidity 201",
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
      headline: "Audit Findings 101",
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
      headline: "Audit Findings 201",
      cachePathAndFilename: "./secureum_audit_findings_201.html",
      pdfPathAndFilename: "./secureum_audit_findings_201.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Audit Techniques & Tools 101
  if (renderAuditTechniques101) {
    await doStuff({
      website: "https://secureum.substack.com/p/audit-techniques-and-tools-101",
      startingNumber: 1,
      headline: "Audit Techniques & Tools 101",
      cachePathAndFilename: "./secureum_audit_techniques_and_tools_101.html",
      pdfPathAndFilename: "./secureum_audit_techniques_and_tools_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Security Pitfalls & Best Practices 101
  if (renderSecurityPitfalls101) {
    await doStuff({
      website:
        "https://secureum.substack.com/p/security-pitfalls-and-best-practices-101",
      startingNumber: 1,
      headline: "Security Pitfalls & Best Practices 101",
      cachePathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_101.html",
      pdfPathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_101.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }

  // Security Pitfalls & Best Practices 201
  if (renderSecurityPitfalls201) {
    await doStuff({
      website:
        "https://secureum.substack.com/p/security-pitfalls-and-best-practices-201",
      startingNumber: 1,
      headline: "Security Pitfalls & Best Practices 201",
      cachePathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_201.html",
      pdfPathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_201.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }
})();
