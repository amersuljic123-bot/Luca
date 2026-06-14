const assert = require('assert');

function getSignedAmount(tx) {
  const amt = 100;
  if (tx.type === 'income') return amt;
  if (tx.type === 'expense') return -amt;
  return amt;
}

const tx1 = { merchant: "Internal move (From A)", type: "expense" };
const tx2 = { merchant: "Internal move (To B)", type: "income" };

console.log(getSignedAmount(tx1));
console.log(getSignedAmount(tx2));
