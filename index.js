var HTMLParser = require("node-html-parser");

const { getContent } = require("./fetch");
const { getChunks } = require("./chunks");
const { getSplitCards } = require("./cards");
const { generatePdf } = require("./pdf");

// document selectors
renderEthereum101 = true;
renderSolidity101 = false;
renderSolidity201 = false;
renderAuditTechniques101 = false;
renderAuditFindings101 = false;
renderAuditFindings201 = false;
renderSecurityPitfalls101 = false;
renderSecurityPitfalls201 = false;

async function doStuff(options) {
  const {
    website,
    headline,
    formatting,
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
  const splitCards = await getSplitCards(chunks, headline, formatting);

  // generate PDF from cards content
  await generatePdf(splitCards, pdfPathAndFilename);
}

(async () => {
  // default formats
  const standardFontFormat = [
    [2400, 1650, 2200, "nanoFont", 0.1],
    [1500, 1300, 2000, "tinyFont", 0.1],
    [1000, 900, 1000, "smallFont", 0.1],
    [425, 500, 1000, "mediumFont", 0.05],
    [0, 425, 550, "standardFont", 0.1],
  ];

  // Ethereum 101
  if (renderEthereum101) {
    await doStuff({
      website: "https://secureum.substack.com/p/ethereum-101",
      startingNumber: 1,
      headline: "Ethereum 101",
      formatting: {
        fonts: {
          standard: standardFontFormat,
          pages: {
            32: [null, 800, null, "mediumFont", 0.05],
            37: [null, 800, null, "mediumFont", 0.05],
            43: [null, 800, null, "mediumFont", 0.05],
            52: [null, 800, null, "mediumFont", 0.05],
            54: [null, 1100, null, "smallFont", 0.1],
            66: [null, 250, null, "standardFont", 0.1],
            67: [null, 400, null, "mediumFont", 0.05],
            68: [null, 400, null, "mediumFont", 0.05],
            70: [null, 700, null, "smallFont", 0.1],
            72: [null, 400, null, "mediumFont", 0.05],
            82: [null, 800, null, "mediumFont", 0.05],
            91: [null, 650, null, "mediumFont", 0.05],
            94: [null, 800, null, "mediumFont", 0.05],
            96: [null, 1800, null, "tinyFont", 0.1],
            98: [null, 800, null, "mediumFont", 0.05],
            101: [null, 600, null, "mediumFont", 0.05],
          },
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
          pages: {
            18: [null, 800, null, "mediumFont", 0.05],
            23: [null, 800, null, "mediumFont", 0.05],
            40: [null, 800, null, "mediumFont", 0.05],
            42: [null, 800, null, "mediumFont", 0.05],
            45: [null, 800, null, "mediumFont", 0.05],
            55: [null, 800, null, "mediumFont", 0.05],
            57: [null, 800, null, "mediumFont", 0.05],
            72: [null, 800, null, "mediumFont", 0.05],
            78: [null, 800, null, "mediumFont", 0.05],
            49: [null, 1200, null, "smallFont", 0.1],
            52: [null, 1100, null, "smallFont", 0.1],
            68: [null, 500, null, "standardFont", 0.1],
            86: [1000, 1500, 1000, "smallFont", 0.1],
            // 65: [null, 800, null, "mediumFont", 0.05],
          },
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
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
      formatting: {
        fonts: {
          standard: standardFontFormat,
        },
      },
      cachePathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_201.html",
      pdfPathAndFilename:
        "./secureum_audit_pitfalls_and_best_practices_201.pdf",
      selector:
        "#main > div:nth-child(2) > div > div.container > div > article > div:nth-child(4) > div.available-content > div",
    });
  }
})();
