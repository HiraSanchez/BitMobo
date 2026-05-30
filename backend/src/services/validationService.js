const { digitsOnly } = require("../utils/text");

function validateName(value) {
  return String(value || "").trim().length >= 2;
}

function validatePhone(value) {
  return digitsOnly(value).length >= 10;
}

function validateOrder(value) {
  const text = String(value || "").trim();
  return /^\d{3,}$/.test(digitsOnly(value)) || /^BM-\d{8}-\d{4}$/i.test(text);
}

function validateReason(value) {
  return String(value || "").trim().length >= 10;
}

function validateRating(value) {
  const rating = Number(String(value || "").match(/[1-5]/)?.[0]);
  return rating || null;
}

module.exports = {
  validateName,
  validatePhone,
  validateOrder,
  validateReason,
  validateRating
};
