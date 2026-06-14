import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const q = collection(db, 'rules');
  const d = await getDocs(q);
  console.log(d.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  process.exit(0);
}
check();
