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
  console.log("SUCCESS");
} else {
  console.log("REGEX FAILED");
}
