// TODO make env vars
const logHtml = false; // NOTE: Log generated HTML of all cards
const meta = false; // NOTE: Whether to render used formatting on card

async function getHtmlForSplitCards(splitCards, headline) {
  // Prepare HTML to be rendered
  var html = "";

  for (let i = 0; i < splitCards.length; i++) {
    // open new row
    if (i === 0) {
      html += "<tr>";
    } else if (i % 2 === 0) {
      html += "</tr><tr>";
    }

    const card = splitCards[i];

    // header
    var headerHtml = '<div class="header sansserif">';
    headerHtml += `<h1>${
      card.headline.length > 30
        ? card.headline.substring(0, 20) +
          "…" +
          card.headline.substring(
            card.headline.length - 10,
            card.headline.length
          )
        : card.headline
    }</h1>`;
    headerHtml += `<span class="number">${card.number}`;
    headerHtml += card.xOfNX !== null ? ` (${card.xOfNX}/${card.xOfNN})` : "";
    headerHtml += "</span>";
    headerHtml += "</div>";

    // footer (uncluding meta info for debugging)
    var metaHtml = "";
    if (meta) {
      metaHtml = `<div class="meta sansserif">`;
      metaHtml += `${card.contentLength}/${card.clazz}`;
      metaHtml += `<div>`;
    }

    var footerHtml = "";
    if (meta || card.barcodes.length) {
      footerHtml = '<div class="footer">';
      footerHtml += `<div class="barcodes">`;
      card.barcodes.forEach((code) => {
        footerHtml += `<span class="barcode">${code}</span>`;
      });
      footerHtml += `</div>`;
      footerHtml += metaHtml;
      footerHtml += "</div>";
    }

    // main content
    var contentHtml = `<div class="${card.clazz} content">${card.content}${footerHtml}</div>`;

    // all card html combined
    html += `<td><div class="card">`;
    html += headerHtml;
    html += contentHtml;
    html += `</div></td>`;

    // close row
    if (i + 1 === splitCards.length) {
      html += "</tr>";
    }
  }

  // TODO check where this comes from
  html = html.replace("undefined", "");

  html = `<!DOCTYPE html>
    <html>
        <head>
            <style>
  
                .card {
                  height: 100%;
                  position: relative;
                  width: 552px;
                  height: 387px;
                }
  
                .content {
                  padding: 8px;
                  padding-top: 4px;
                }
  
                .header {
                  border-bottom: 4px solid #00fad0;
                  background: #000;
                  color: #fff;
                  display: flex;
                  padding: 10px;
                }
  
                .footer {
                  position: absolute;
                  width: 534px;
                  bottom: 0;
                  z-index: -1;
                }
  
                .meta {
                  font-size: 14px;
                  color: red;
                  float: left;
                }

                .barcodes {
                  float: right;
                }

                .barcode {
                  margin-left: 20px;
                }
  
                h1 {
                  font-size: 24px;
                  flex: 0.75;
                  margin: 0;
                  padding: 0;
                }
  
                .number {
                  font-weight: bold;
                  text-align: right;
                  font-size: 24px;
                  flex: 0.25;
                }
  
                body {
                    margin-top: 0cm;
                }
  
                p {
                    margin: 0;
                    margin-bottom: 8px;
                    padding: 0;
                }
  
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
  
                tr {
                  vertical-align: top;
                }
  
                td {
                    border: 1px dashed #ddd;
                    padding: 0;
                    margin: 0;
                }
  
                ol {
                  margin: 0;
                  padding-left: 20px;
                  list-style-type: lower-latin;
                }

                ol ol {
                  list-style-type: lower-roman;
                }

                ol.extraList {
                  list-style-type: decimal;
                }

                li {
                  margin: 0;
                }
  
                ol li::marker {
                  font-weight: bold;
                }

                .nanoFont {
                  font-size: 10px;
                  line-height: 130%;
                }
                .nanoFont ol { line-height: 120%; }
  
                .tinyFont {
                  font-size: 12px;
                  line-height: 130%;
                }
                .tinyFont ol { line-height: 120%; }
  
                .smallFont {
                    font-size: 16px;
                    line-height: 130%;
                }
                .smallFont ol { line-height: 120%; }
  
                .mediumFont {
                    font-size: 20px;
                    line-height: 130%;
                }
                .mediumFont ol { line-height: 120%; }
  
                .standardFont {
                    font-size: 22px;
                    line-height: 130%;
                }
                .standardFont ol { line-height: 120%; }
  
                .sansserif {
                  font-family: Helvetica, Verdana, Arial, sans-serif;
                }
  
            </style>
        </head>
            <body>
                <table>${html}</table>
            </body>
        </html>`;

  if (logHtml) {
    console.log(html);
  }

  return html;
}

module.exports = { getHtmlForSplitCards };
