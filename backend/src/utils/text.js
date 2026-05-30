function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function digitsOnly(text) {
  return String(text || "").replace(/\D/g, "");
}

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = { normalize, digitsOnly, money, csvEscape };
