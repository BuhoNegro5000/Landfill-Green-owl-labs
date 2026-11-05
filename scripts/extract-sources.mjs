// Extracts plain text from the two source guides into per-page text files.
// Output is used only to build the traceability matrix in lib/methods.ts.
import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse/lib/pdf-parse.js";

const sources = [
  ["honduras-2014.pdf", "honduras-2014"],
  ["minam-2011.pdf", "minam-2011"],
];

const outDir = path.join(process.cwd(), "docs", "sources", "text");
fs.mkdirSync(outDir, { recursive: true });

for (const [file, slug] of sources) {
  const buf = fs.readFileSync(path.join(process.cwd(), "docs", "sources", file));
  let page = 0;
  const pages = [];
  await pdf(buf, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      let lastY;
      let text = "";
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || lastY === undefined) {
          text += item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = item.transform[5];
      }
      page += 1;
      pages.push(`\n===== PAGINA ${page} =====\n${text}`);
      return text;
    },
  });
  fs.writeFileSync(path.join(outDir, `${slug}.txt`), pages.join("\n"), "utf8");
  console.log(`${slug}: ${pages.length} pages extracted`);
}
