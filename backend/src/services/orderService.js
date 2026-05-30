const { readOrders } = require("../data/store");
const { digitsOnly } = require("../utils/text");

function findOrder(orderNumber) {
  const orders = readOrders();
  const key = digitsOnly(String(orderNumber || ""));
  if (!key) {
    return null;
  }
  return (orders.orders || []).find(order => digitsOnly(String(order.number)) === key);
}

module.exports = { findOrder };
