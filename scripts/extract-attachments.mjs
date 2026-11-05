import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse/lib/pdf-parse.js";

const downloads = "C:/Users/RICARDO/Downloads";
const sources = [
  ["RRSS_Final.pdf", "rrss-final"],
  [
    "ANEXO RM. 165-2021-MINAM - GUIA IDENTIFICACION ZONAS POTENCIALES PARA INFRAESTRUCTURA DE DISPOSICION FINAL DE RSM.pdf.pdf",
    "rm-165-2021-anexo",
  ],
  ["2645 (1).pdf", "minam-2011-guia"],
];

const outDir = path.join(process.cwd(), "docs", "sources", "text");
fs.mkdirSync(outDir, { recursive: true });

for (const [file, slug] of sources) {
  const filePath = path.join(downloads, file);
  if (!fs.existsSync(filePath)) {
    console.log(`${slug}: missing ${filePath}`);
    continue;
  }
  const buf = fs.readFileSync(filePath);
  let page = 0;
  const pages = [];
  const parsed = await pdf(buf, {
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
  console.log(`${slug}: ${parsed.numpages} pages, ${pages.join("").length} chars extracted`);
}
