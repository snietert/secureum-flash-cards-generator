var HTMLParser = require("node-html-parser");

const { getContent } = require("./fetch");
const { getChunks } = require("./chunks");
const { getSplitCards } = require("./cards");
const { generatePdf } = require("./pdf");

// document selectors
renderEthereum101 = true; // NOTE: reviewed (PDF vs. website)
renderSolidity101 = true; // NOTE: reviewed (PDF vs. website)
renderSolidity201 = true; // NOTE: reviewed (PDF vs. website)
renderAuditTechniques101 = true; // NOTE: reviewed (PDF vs. website)
renderAuditFindings101 = true; // NOTE: reviewed (PDF vs. website)
renderAuditFindings201 = true; // NOTE: reviewed (PDF vs. website)
renderSecurityPitfalls101 = true; // NOTE: reviewed (PDF vs. website)
renderSecurityPitfalls201 = true; // NOTE: reviewed (PDF vs. website)

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
  // standard formats
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
            32: [[null, 800, null, "mediumFont", 0.05]],
            33: [[null, 1100, null, "smallFont", 0.1]],
            37: [[null, 800, null, "mediumFont", 0.05]],
            43: [[null, 800, null, "mediumFont", 0.05]],
            52: [[null, 800, null, "mediumFont", 0.05]],
            54: [[null, 1100, null, "smallFont", 0.1]],
            66: [[null, 1100, null, "smallFont", 0.1]],
            67: [[null, 400, null, "mediumFont", 0.05]],
            67: [[null, 350, null, "mediumFont", 0.05]],
            68: [[null, 380, null, "mediumFont", 0.05]],
            70: [[null, 600, null, "smallFont", 0.1]],
            72: [[null, 350, null, "mediumFont", 0.05]],
            82: [[null, 800, null, "mediumFont", 0.05]],
            84: [[null, 1000, null, "smallFont", 0.1]],
            87: [[null, 1000, null, "smallFont", 0.1]],
            88: [[null, 1000, null, "smallFont", 0.1]],
            91: [[null, 1000, null, "smallFont", 0.1]],
            92: [[null, 1000, null, "smallFont", 0.1]],
            94: [[null, 800, null, "mediumFont", 0.05]],
            95: [[null, 1000, null, "smallFont", 0.1]],
            96: [[null, 1800, null, "tinyFont", 0.1]],
            98: [[null, 1000, null, "smallFont", 0.1]],
            101: [[null, 1000, null, "smallFont", 0.1]],
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
            9: [[null, 1200, null, "smallFont", 0.1]],
            16: [[null, 1200, null, "smallFont", 0.1]],
            18: [[null, 800, null, "mediumFont", 0.05]],
            21: [[null, 1200, null, "smallFont", 0.1]],
            23: [[null, 1200, null, "smallFont", 0.1]],
            34: [[null, 1200, null, "smallFont", 0.1]],
            40: [[null, 1200, null, "smallFont", 0.1]],
            42: [[null, 800, null, "mediumFont", 0.05]],
            45: [[null, 1200, null, "smallFont", 0.1]],
            49: [[null, 1200, null, "smallFont", 0.1]],
            52: [[null, 1100, null, "smallFont", 0.1]],
            55: [[null, 800, null, "mediumFont", 0.05]],
            56: [[null, 1200, null, "smallFont", 0.1]],
            57: [[null, 800, null, "mediumFont", 0.05]],
            59: [[null, 1200, null, "smallFont", 0.1]],
            63: [[null, 730, null, "smallFont", 0.1]],
            65: [[null, 800, null, "smallFont", 0.1]],
            67: [[null, 1200, null, "smallFont", 0.1]],
            68: [[null, 500, null, "standardFont", 0.1]],
            69: [[null, 1200, null, "smallFont", 0.1]],
            70: [[null, 1200, null, "smallFont", 0.1]],
            72: [[null, 800, null, "mediumFont", 0.05]],
            77: [[null, 1200, null, "smallFont", 0.1]],
            78: [[null, 1200, null, "smallFont", 0.1]],
            98: [[null, 700, null, "smallFont", 0.1]],
            99: [[null, 850, null, "smallFont", 0.1]],
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
          pages: {
            113: [[null, 1500, null, "smallFont", 0.1]],
            119: [[null, 800, null, "mediumFont", 0.05]],
            123: [[null, null, 1200, "smallFont", 0.1]],
            136: [[null, 1200, null, "smallFont", 0.1]],
            138: [[null, 1200, null, "smallFont", 0.1]],
            140: [[null, 900, null, "smallFont", 0.1]],
            141: [[null, 800, null, "smallFont", 0.1]],
            142: [[null, 900, null, "smallFont", 0.1]],
            143: [[null, 900, null, "smallFont", 0.1]],
            152: [[null, 1500, null, "tinyFont", 0.1]],
            153: [[null, 1000, null, "smallFont", 0.1]],
            155: [null, [null, null, 1200, "smallFont", 0.1]],
            166: [[null, 1000, null, "smallFont", 0.1]],
            177: [[null, 800, null, "smallFont", 0.1]],
            178: [[null, 800, null, "smallFont", 0.1]],
            180: [[null, 800, null, "smallFont", 0.1]],
            181: [[null, 800, null, "smallFont", 0.1]],
            183: [null, [null, null, 600, "mediumFont", 0.05]],
            184: [[null, 800, null, "mediumFont", 0.05]],
            185: [[null, 1000, null, "smallFont", 0.1]],
            186: [[null, 400, null, "mediumFont", 0.05]],
            187: [null, [null, 800, null, "smallFont", 0.1]],
            188: [[null, 1500, null, "tinyFont", 0.1]],
            189: [[null, 1500, null, "tinyFont", 0.1]],
            190: [[null, 300, null, "mediumFont", 0.05]],
            197: [[null, null, 1500, "smallFont", 0.1]],
            199: [[null, 2000, null, "tinyFont", 0.1]],
            200: [[null, 1000, null, "smallFont", 0.1]],
          },
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
          pages: {
            2: [[null, 1500, null, "smallFont", 0.1]],
            5: [[null, 1000, null, "mediumFont", 0.05]],
            6: [[null, 1500, null, "smallFont", 0.1]],
            8: [[null, 1500, null, "smallFont", 0.1]],
            11: [[null, 1500, null, "smallFont", 0.1]],
            13: [[null, 1500, null, "smallFont", 0.1]],
            14: [[null, 1500, null, "smallFont", 0.1]],
            16: [[null, 1500, null, "smallFont", 0.1]],
            19: [[null, 700, null, "mediumFont", 0.05]],
            20: [[null, 1500, null, "smallFont", 0.1]],
            21: [[null, 1500, null, "smallFont", 0.1]],
            23: [[null, 1500, null, "smallFont", 0.1]],
            24: [[null, 1000, null, "smallFont", 0.1]],
            25: [[null, 1000, null, "smallFont", 0.1]],
            27: [[null, 1000, null, "smallFont", 0.1]],
            28: [[null, 1000, null, "smallFont", 0.1]],
            29: [[null, 1000, null, "smallFont", 0.1]],
            30: [[null, 1000, null, "smallFont", 0.1]],
            31: [[null, 1000, null, "smallFont", 0.1]],
            33: [[null, 1000, null, "smallFont", 0.1]],
            34: [[null, 1000, null, "smallFont", 0.1]],
            35: [[null, 1000, null, "smallFont", 0.1]],
            36: [[null, 1000, null, "smallFont", 0.1]],
            37: [[null, 1000, null, "smallFont", 0.1]],
            39: [[null, 1000, null, "smallFont", 0.1]],
            40: [[null, 1000, null, "smallFont", 0.1]],
            41: [[null, 1000, null, "smallFont", 0.1]],
            42: [[null, 1000, null, "smallFont", 0.1]],
            43: [[null, 650, null, "smallFont", 0.1]],
            44: [[null, 700, null, "smallFont", 0.1]],
            45: [[null, 750, null, "smallFont", 0.1]],
            46: [[null, 1000, null, "smallFont", 0.1]],
            50: [[null, 1500, null, "smallFont", 0.1]],
            52: [[null, 1000, null, "smallFont", 0.1]],
            53: [[null, 1000, null, "smallFont", 0.1]],
            54: [[null, 1000, null, "smallFont", 0.1]],
            55: [[null, 1500, null, "smallFont", 0.1]],
            56: [[null, 1000, null, "smallFont", 0.1]],
            57: [[null, 1000, null, "smallFont", 0.1]],
            58: [[null, 1000, null, "smallFont", 0.1]],
            59: [[null, 1000, null, "smallFont", 0.1]],
            60: [[null, 1500, null, "smallFont", 0.1]],
            61: [[null, 1000, null, "smallFont", 0.1]],
            62: [[null, 1000, null, "smallFont", 0.1]],
            63: [[null, 1000, null, "smallFont", 0.1]],
            64: [[null, 1500, null, "smallFont", 0.1]],
            65: [[null, 1000, null, "smallFont", 0.1]],
            66: [[null, 1000, null, "smallFont", 0.1]],
            67: [[null, 1000, null, "smallFont", 0.1]],
            68: [[null, 1000, null, "smallFont", 0.1]],
            69: [[null, 1000, null, "smallFont", 0.1]],
            70: [[null, 1000, null, "smallFont", 0.1]],
            71: [[null, 1000, null, "smallFont", 0.1]],
            72: [[null, 1000, null, "smallFont", 0.1]],
            73: [[null, 1000, null, "smallFont", 0.1]],
            74: [[null, 1000, null, "smallFont", 0.1]],
            75: [[null, 1000, null, "smallFont", 0.1]],
            77: [[null, 1000, null, "smallFont", 0.1]],
            76: [[null, 2000, null, "tinyFont", 0.1]],
            78: [[null, 1000, null, "smallFont", 0.1]],
            79: [[null, 1000, null, "smallFont", 0.1]],
            81: [[null, 1000, null, "smallFont", 0.1]],
            82: [[null, 1000, null, "smallFont", 0.1]],
            83: [[null, 500, null, "smallFont", 0.1]],
            84: [[null, 1000, null, "smallFont", 0.1]],
            85: [[null, 1000, null, "smallFont", 0.1]],
            87: [[null, 750, null, "smallFont", 0.1]],
            88: [[null, 1500, null, "smallFont", 0.1]],
            89: [[null, 1500, null, "smallFont", 0.1]],
            90: [[null, 1000, null, "smallFont", 0.1]],
            91: [[null, 500, null, "smallFont", 0.1]],
            92: [[null, 1000, null, "smallFont", 0.1]],
            93: [[null, 1000, null, "smallFont", 0.1]],
            94: [[null, 1000, null, "smallFont", 0.1]],
            96: [[null, 1000, null, "smallFont", 0.1]],
            97: [[null, 1000, null, "smallFont", 0.1]],
            98: [[null, 1000, null, "mediumFont", 0.05]],
          },
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
          standard: [[0, 1000, 1500, "smallFont", 0.1]],
          pages: {
            103: [[null, 410, null, "smallFont", 0.1]],
            115: [[null, 2000, null, "smallFont", 0.1]],
            117: [[null, 650, null, "smallFont", 0.1]],
            118: [[null, 650, null, "smallFont", 0.1]],
            134: [[null, 850, null, "smallFont", 0.1]],
            138: [[null, 850, null, "smallFont", 0.1]],
            140: [[null, 2000, null, "smallFont", 0.1]],
            141: [[null, 2000, null, "smallFont", 0.1]],
            145: [[null, 2000, null, "smallFont", 0.1]],
            141: [[null, 2000, null, "smallFont", 0.1]],
            146: [[null, 700, null, "smallFont", 0.1]],
            151: [[null, 700, null, "smallFont", 0.1]],
            154: [[null, 700, null, "smallFont", 0.1]],
            158: [[null, 750, null, "smallFont", 0.1]],
            159: [[null, 2000, null, "smallFont", 0.1]],
            162: [[null, 2000, null, "smallFont", 0.1]],
            164: [[null, 2000, null, "smallFont", 0.1]],
            165: [[null, 810, null, "smallFont", 0.1]],
            166: [[null, 2000, null, "smallFont", 0.1]],
            178: [[null, 530, null, "smallFont", 0.1]],
            193: [[null, 2000, null, "smallFont", 0.1]],
          },
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
          pages: {
            7: [[null, 800, null, "mediumFont", 0.05]],
            11: [[null, 1000, null, "tinyFont", 0.1]],
            12: [[null, 1000, null, "smallFont", 0.1]],
            15: [[null, 400, null, "mediumFont", 0.05]],
            19: [[null, null, 1000, "mediumFont", 0.05]],
            23: [[null, 1000, null, "smallFont", 0.1]],
            24: [[null, 1000, null, "smallFont", 0.1]],
            25: [[null, 1000, null, "smallFont", 0.1]],
            27: [[null, null, 1000, "mediumFont", 0.05]],
            28: [[null, null, 1000, "mediumFont", 0.05]],
            29: [[null, 1000, null, "mediumFont", 0.05]],
            34: [[null, 1000, null, "smallFont", 0.1]],
            38: [[null, 1000, null, "smallFont", 0.1]],
            39: [[null, 1000, null, "mediumFont", 0.05]],
            40: [[null, 1000, null, "smallFont", 0.1]],
            41: [[null, 1000, null, "smallFont", 0.1]],
            42: [[null, 1000, null, "smallFont", 0.1]],
            43: [[null, 1000, null, "smallFont", 0.1]],
            44: [[null, 1000, null, "smallFont", 0.1]],
            46: [[null, 1000, null, "smallFont", 0.1]],
            51: [[null, 1000, null, "smallFont", 0.1]],
            54: [[null, 1000, null, "smallFont", 0.1]],
            57: [[null, 1000, null, "smallFont", 0.1]],
            63: [[null, 1000, null, "smallFont", 0.1]],
            65: [[null, 1000, null, "smallFont", 0.1]],
            70: [[null, 600, null, "standardFont", 0.1]],
            80: [[null, 800, null, "smallFont", 0.1]],
            81: [[null, 1000, null, "smallFont", 0.1]],
            82: [[null, 1000, null, "smallFont", 0.1]],
            83: [[null, 1000, null, "smallFont", 0.1]],
            86: [[null, 1000, null, "mediumFont", 0.05]],
            88: [[null, 1000, null, "smallFont", 0.1]],
            89: [[null, 1000, null, "smallFont", 0.1]],
            90: [[null, 1000, null, "mediumFont", 0.05]],
            92: [[null, 600, null, "mediumFont", 0.05]],
            93: [[null, 1000, null, "smallFont", 0.1]],
            94: [[null, 1000, null, "smallFont", 0.1]],
            95: [[null, 750, null, "smallFont", 0.1]],
            96: [[null, 300, null, "mediumFont", 0.05]],
            98: [[null, 2000, null, "tinyFont", 0.1]],
            99: [[null, 1000, null, "smallFont", 0.1]],
          },
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
          pages: {
            11: [[null, null, 2000, "smallFont", 0.1]],
          },
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
          pages: {
            130: [[null, null, 1000, "standardFont", 0.1]],
            193: [[null, null, 1000, "smallFont", 0.1]],
          },
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
