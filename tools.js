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

function cleanParagraphTags(content) {
  return striptags(content, ["p", "i", "em", "b", "strong", "span", "a"]);
}

// NOTE: Taken from https://gist.github.com/raymyers/44807526ca4fdf6d8db1a7d545c7e2c8
const trimmedMean = (values, trimAmount) => {
  var trimCount = Math.floor(trimAmount * values.length);
  return mean(
    values.sort((a, b) => a - b).slice(trimCount, values.length - trimCount)
  );
};

const mean = (values) => {
  let sum = values.reduce((previous, current) => (current += previous));
  return sum / values.length;
};

module.exports = {
  loggg,
  textOnly,
  textOnlyLength,
  cleanParagraphTags,
  trimmedMean,
};
