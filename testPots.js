function getSignedAmount(tx) {
  const amt = tx.amount;
  if (tx.type === 'income') return amt;
  if (tx.type === 'expense') return -amt;
  return amt;
}

const transactions = [
  { id: 1, category: "Savings & Investments", subCategory: "Pot A", type: "expense", amount: 100 },
  { id: 2, category: "Savings & Investments", subCategory: "Pot B", type: "income", amount: 100 }
];

const savingsTxs = transactions.filter(t => t.category === "Savings & Investments");
const definedBuckets = [{name: "Pot A"}, {name: "Pot B"}];
const pots = [
  { name: "Unallocated", total: savingsTxs.filter(t => !t.subCategory || !definedBuckets.some(b => b.name === t.subCategory)).reduce((sum, t) => sum + getSignedAmount(t), 0) },
  ...definedBuckets.map(b => ({
    name: b.name,
    total: savingsTxs.filter(t => t.subCategory === b.name).reduce((sum, t) => sum + getSignedAmount(t), 0)
  }))
];
console.log(pots);
