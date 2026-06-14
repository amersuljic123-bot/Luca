const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const renderBucket = \(bucketName: string, isUncategorized: boolean = false\) => \{\n.*?const txsInBucket.*?;\n.*?if.*?;\n.*?\n.*?const total = .*?;\n\n.*?return \(\n.*?<div key=\{bucketName\} className="bg-white rounded-\[2rem\] border border-slate-200 shadow-sm p-6 flex flex-col">/s;

const newCode = `const renderBucket = (bucketName: string, isUncategorized: boolean = false) => {
                        const txsInBucket = savingsTxs.filter(t => isUncategorized ? !t.subCategory || !activeBuckets.includes(t.subCategory) : t.subCategory === bucketName);
                        if (isUncategorized && txsInBucket.length === 0) return null;
                        
                        const total = txsInBucket.reduce((sum, t) => sum + (t.type === 'income' ? -t.amount : t.amount), 0);
                        const bucketConfig = definedBucketConfigs.find(b => b.name === bucketName);

                        let monthlyTarget = 0;
                        if (bucketConfig?.target && bucketConfig?.targetDate) {
                          const monthsLeft = Math.max(1, Math.ceil((new Date(bucketConfig.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)));
                          const remaining = Math.max(0, bucketConfig.target - total);
                          monthlyTarget = remaining / monthsLeft;
                        }

                        return (
                          <div 
                            key={bucketName} 
                            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col transition-all"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('ring-2', 'ring-indigo-200', 'scale-[1.02]');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('ring-2', 'ring-indigo-200', 'scale-[1.02]');
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('ring-2', 'ring-indigo-200', 'scale-[1.02]');
                              const txId = e.dataTransfer.getData('transactionId');
                              if (txId) {
                                await updateTransaction(txId, { subCategory: isUncategorized ? null : bucketName });
                                loadData();
                              }
                            }}
                          >`;

const m = code.match(regex);
if (m) {
  const updated = code.replace(regex, newCode);
  fs.writeFileSync('src/App.tsx', updated);
  console.log("SUCCESS1");
} else {
  console.log("REGEX1 FAILED");
}

const regex2 = /<div className="flex items-center gap-2">\s*<div className="text-xl font-bold text-slate-900">\{formatCurrency\(total\)\}<\/div>\s*\{\!isUncategorized && \([^<]*<button/s;
const newCode2 = `<div className="flex flex-col items-end gap-1">
                                <div className="text-xl font-bold text-slate-900">{formatCurrency(total)}</div>
                                {!isUncategorized && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {bucketConfig && (
                                     <button
                                       onClick={() => {
                                         setEditingBucket(bucketConfig);
                                         setShowBucketForm(true);
                                       }}
                                       className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                     >
                                       <Edit3 className="w-3 h-3" />
                                     </button>
                                    )}
                                    <button`;
const m2 = code.match(regex2);
if (m2) {
  const code2 = fs.readFileSync('src/App.tsx', 'utf8');
  fs.writeFileSync('src/App.tsx', code2.replace(regex2, newCode2));
  console.log("SUCCESS2");
} else { console.log('REGEX2 FAILED'); }

const regex3 = /className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded"/s;
const newCode3 = `className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"`;
let code3 = fs.readFileSync('src/App.tsx', 'utf8');
fs.writeFileSync('src/App.tsx', code3.replace(regex3, newCode3));
console.log("SUCCESS3");

const regex5 = /<\/button>\s*\}\)\s*<\/div>\s*<\/div>\s*<div className="space-y-2 flex-1">/s;

let newCode5 = `</button>
                                )}
                              </div>
                            </div>

                            {!isUncategorized && bucketConfig?.target && (
                              <div className="mb-4">
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                  <span className="text-slate-500">Progress</span>
                                  <span className="text-slate-900">{formatCurrency(total)} / {formatCurrency(bucketConfig.target)}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: \`\${Math.min(100, Math.max(0, (total / bucketConfig.target) * 100))}%\` }}></div>
                                </div>
                                {bucketConfig.targetDate && (
                                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                    Target: <span className="font-bold text-slate-600">{format(new Date(bucketConfig.targetDate), 'MMM yyyy')}</span> 
                                    {monthlyTarget > 0 ? \` (approx \${formatCurrency(monthlyTarget)}/mo needed)\` : ' (Goal reached!)'}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="space-y-2 flex-1 min-h-[100px]">`;
let code5 = fs.readFileSync('src/App.tsx', 'utf8');
const m5 = code5.match(regex5);
if (m5) {
  fs.writeFileSync('src/App.tsx', code5.replace(regex5, newCode5));
  console.log("SUCCESS5");
} else {
  console.log("REGEX5 FAILED");
}

let code6 = fs.readFileSync('src/App.tsx', 'utf8');
fs.writeFileSync('src/App.tsx', code6.replace(/className="flex items-center justify-between cursor-pointer" onClick=\{\(\) => setEditingTransaction\(tx\)\}/g, `className="flex items-center justify-between cursor-pointer" onClick={() => setEditingTransaction(tx)} draggable onDragStart={(e) => { if (tx.id) e.dataTransfer.setData('transactionId', tx.id); }}`));

let code7 = fs.readFileSync('src/App.tsx', 'utf8');
fs.writeFileSync('src/App.tsx', code7.replace('{txsInBucket.length === 0 && (\n                                <div className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Empty bucket</div>\n                              )}', `{txsInBucket.length === 0 && (\n                                <div className="h-full flex items-center justify-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none">Empty bucket. Drag items here</div>\n                              )}`));

console.log("DONE");
