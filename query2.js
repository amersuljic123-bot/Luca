import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const snaps = await getDocs(collection(db, "transactions"));
  const txs = snaps.docs.map(d => ({id: d.id, ...d.data()}));
  
  let pos = 0;
  let neg = 0;
  const snapIdGroups = {};
  for(const tx of txs) {
    if(tx.screenshotId) {
      if(!snapIdGroups[tx.screenshotId]) snapIdGroups[tx.screenshotId] = [];
      snapIdGroups[tx.screenshotId].push(tx);
    }
  }
  
  for(const snapId in snapIdGroups) {
    if(!snapId) continue;
    let sum = 0;
    console.log("Screenshot:", snapId);
    for(const tx of snapIdGroups[snapId]) {
       console.log("  ", tx.merchant, "amount/type:", tx.amount, tx.type, "cat:", tx.category);
    }
  }
  process.exit(0);
}
run();
