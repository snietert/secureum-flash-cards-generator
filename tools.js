const striptags = require("striptags");

// TODO make env vars
// globals
const log = false;

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

function removeParagraphTags(content) {
  return striptags(content, ["i", "em", "strong", "b", "span"]);
}

module.exports = { loggg, textOnly, textOnlyLength, removeParagraphTags };
