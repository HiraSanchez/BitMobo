import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog } from "../api.js";

async function init() {
  const catalog = await fetchCatalog();
  await mountLayout({ activePath: "", catalog });

  const name = catalog.store?.name || "BitMobo";
  document.getElementById("about-title").textContent = `Sobre a ${name}`;
}

init().catch(console.error);
