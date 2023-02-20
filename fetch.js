const fs = require("fs");
const { loggg } = require("./tools");

async function getContent(website, options) {
  const cachePathAndFilename = options.cachePathAndFilename;

  // handle missing cache options
  if (!options || !cachePathAndFilename) {
    loggg(`Missing cache options`);
    return (await fetchWebsiteContent(website)).data;
  }

  // get from cache if cached
  if (fs.existsSync(cachePathAndFilename)) {
    loggg(`Returning content from cache: ${cachePathAndFilename}`);
    return fs.readFileSync(cachePathAndFilename).toString();
  }

  // download and write to cache
  const html = (await fetchWebsiteContent(website)).data;
  loggg(`Writing content to cache: ${cachePathAndFilename}`);
  fs.writeFileSync(cachePathAndFilename, html);
  return html;
}

module.exports = { getContent };
