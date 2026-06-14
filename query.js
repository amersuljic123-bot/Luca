import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const snaps = await getDocs(collection(db, "transactions"));
  const txs = snaps.docs.map(d => ({id: d.id, ...d.data()}));
  
  const snapIdGroups = {};
  for(const tx of txs) {
    if(tx.screenshotId) {
      if(!snapIdGroups[tx.screenshotId]) snapIdGroups[tx.screenshotId] = [];
      snapIdGroups[tx.screenshotId].push(tx);
    }
  }
  
  for(const snapId in snapIdGroups) {
    console.log("Screenshot:", snapId);
    let n = 0;
    for(const tx of snapIdGroups[snapId]) {
       console.log("  ", tx.merchant, tx.amount, tx.type, tx.category);
       n += tx.amount;
    }
  }
  process.exit(0);
}
run();
