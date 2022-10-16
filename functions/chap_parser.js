const parse = require("node-html-parser").parse;

async function fetching_book(link) {
  const resp = await fetch(link);

  const text = parse(await resp.text());

  const html = text.querySelector(".toc_w");

  return html;
}

module.exports = {
  fetching_book,
};
