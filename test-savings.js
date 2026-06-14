import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const snaps = await getDocs(collection(db, "transactions"));
  const txs = snaps.docs.map(d => ({id: d.id, ...d.data()}));
  
  let s = 0;
  for(const tx of txs) {
    if(tx.category === "Savings & Investments") {
       console.log("Bucket tx:", tx.merchant, tx.amount, tx.type, tx.subCategory);
       s += tx.amount;
    }
  }
  process.exit(0);
}
run();
