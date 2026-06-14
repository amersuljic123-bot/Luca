import fs from 'fs';
const code = fs.readFileSync('/src/App.tsx', 'utf8');

const startIndex = code.indexOf('      {showAddRule && (');
const nextDivIndex = code.indexOf('                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">', startIndex);

if (startIndex !== -1 && nextDivIndex !== -1) {
  const modalCode = code.substring(startIndex, nextDivIndex);
  let newCode = code.substring(0, startIndex) + code.substring(nextDivIndex);
  
  const insertIndex = newCode.indexOf('{/* Category Manager Modal */}');
  
  newCode = newCode.substring(0, insertIndex) + '<AnimatePresence>\n' + modalCode + '</AnimatePresence>\n      ' + newCode.substring(insertIndex);
  
  fs.writeFileSync('/src/App.tsx', newCode);
  console.log("Moved successfully!");
} else {
  console.log("Could not find boundaries");
}
