// TODO make env vars
const logHtml = false;
const meta = false;

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
      metaHtml = `<span class="sansserif meta">`;
      metaHtml += `${card.contentLength}/${card.clazz}`;
      metaHtml += `<span>`;
    }

    var footerHtml = '<div class="footer">';
    card.barcodes.forEach((code) => {
      footerHtml += `<span>${code}</span>`;
    });
    footerHtml += metaHtml;
    footerHtml += "</div>";

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
                  bottom: 0;
                }
  
                .meta {
                  font-size: 14px;
                  color: red;
                }
  
                h1 {
                  font-size: 24px;
                  flex: 0.8;
                  margin: 0;
                  padding: 0;
                }
  
                .number {
                  font-weight: bold;
                  text-align: right;
                  font-size: 24px;
                  flex: 0.2;
                }
  
                body {
                    margin-top: 0cm;
                }
  
                p {
                    margin: 0;
                    margin-bottom: 8px;
                    padding: 0;
                    // line-height: 120%;
                    // border: 1px solid red;
                }
  
                table {
                    width: 100%;
                    margin-top: 7px;
                    border-collapse: collapse;
                }
  
                tr {
                  vertical-align: top;
                }
  
                td {
                    width: 530px;
                    height: 385px; // 240px; // 231,86px; // 185.49px;
                    border: 1px dashed #ddd;
                    padding: 0;
                    margin: 0;
                }
  
                ol {
                  margin: 0;
                  padding-left: 20px;
                  list-style-type: lower-latin;
                  // border: 1px solid green;
                }
  
                li {
                  margin: 0;
                }
  
                ol li::marker {
                  font-weight: bold;
                }
  
                .picoFont {
                  font-size: 11px;
                  line-height: 130%;
                }
  
                .nanoFont {
                  font-size: 12px;
                  line-height: 130%;
                }
  
                .microFont {
                    font-size: 16px;
                    line-height: 130%;
                }
  
                .tinyFont {
                    font-size: 18px;
                    line-height: 130%;
                }
  
                .smallFont {
                    font-size: 22px;
                    line-height: 130%;
                }
  
                .mediumFont {
                    font-size: 25px;
                    line-height: 130%;
                }
  
                .standardFont {
                    font-size: 27px;
                    line-height: 130%;
                }
  
                .largeFont {
                    font-size: 32px;
                }
  
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
