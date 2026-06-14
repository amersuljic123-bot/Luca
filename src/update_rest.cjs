const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexTrash = /const newBuckets = profile\?\.savingsBuckets\?\.filter\(b => b !== bucketName\) \|\| \[\];\n\s+if \(profile\) \{\n\s+setProfile\(\{ \.\.\.profile, savingsBuckets: newBuckets \}\);\n\s+await updateUserProfile\(\{ savingsBuckets: newBuckets \}\);\n\s+\}/s;

const newTrash = `const newConfigs = definedBucketConfigs.filter(b => b.name !== bucketName);
                                           const newBuckets = newConfigs.map(b => b.name);
                                           if (profile) {
                                             setProfile({ ...profile, savingsBuckets: newBuckets, savingsBucketsConfig: newConfigs });
                                             await updateUserProfile({ savingsBuckets: newBuckets, savingsBucketsConfig: newConfigs });
                                           }`;

if (regexTrash.test(code)) {
  code = code.replace(regexTrash, newTrash);
  console.log('regexTrash SUCCESS');
} else {
  console.log('regexTrash FAILED');
}

const regexProgress = /<div className="space-y-2 flex-1">/s;
const newProgress = `{!isUncategorized && bucketConfig?.target && (
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

if (regexProgress.test(code)) {
  code = code.replace(regexProgress, newProgress);
  console.log('regexProgress SUCCESS');
} else {
  console.log('regexProgress FAILED');
}

const regexAdd = /<button \n\s+onClick=\{async \(\) => \{\n\s+const name = prompt\('New Bucket Name:'\);\n\s+if \(name && profile\) \{\n\s+const newBuckets = Array.from\(new Set\(\[\.\.\.\(profile\.savingsBuckets \|\| \[\]\), name\]\)\);\n\s+setProfile\(\{ \.\.\.profile, savingsBuckets: newBuckets \}\);\n\s+await updateUserProfile\(\{ savingsBuckets: newBuckets \}\);\n\s+\}\n\s+\}\}/s;

const newAdd = `<button 
                        onClick={() => {
                          setEditingBucket(null);
                          setShowBucketForm(true);
                        }}`;

if (regexAdd.test(code)) {
  code = code.replace(regexAdd, newAdd);
  console.log('regexAdd SUCCESS');
} else {
  console.log('regexAdd FAILED');
}

fs.writeFileSync('src/App.tsx', code);

