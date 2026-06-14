const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add selectedTxIds state
code = code.replace(
  "const [editingMerchant, setEditingMerchant] = useState<MerchantMetadata | null>(null);",
  "const [editingMerchant, setEditingMerchant] = useState<MerchantMetadata | null>(null);\n  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());\n\n  const handleBulkCategoryChange = async (newCategory: string) => {\n    if (!newCategory || selectedTxIds.size === 0) return;\n    setUploadStatus(`Updating ${selectedTxIds.size} transactions...`);\n    try {\n      await Promise.all(Array.from(selectedTxIds).map(id => updateTransaction(id, { category: newCategory, subCategory: null })));\n      setSelectedTxIds(new Set());\n      loadData();\n    } catch (err) {\n      console.error(err);\n    } finally {\n      setUploadStatus('');\n    }\n  };"
);

// 2. Add Bulk Actions Bar + Update Header
const regexHeader = /\{\/\* Table Header - Only visible on desktop \*\/\}\s*<div className="hidden lg:grid grid-cols-6 px-8 py-5 border-b border-slate-100 bg-slate-50\/50 text-\[11px\] font-bold text-slate-400 uppercase tracking-\[0\.1em\]">\s*<div>Date<\/div>/s;

const newHeader = `{selectedTxIds.size > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl mx-4 md:mx-8 mb-4 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {selectedTxIds.size}
                        </div>
                        <span className="text-sm font-bold text-indigo-900">selected</span>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select 
                          className="flex-1 sm:w-48 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value=""
                          onChange={(e) => handleBulkCategoryChange(e.target.value)}
                        >
                          <option value="" disabled>Move to category...</option>
                          {allAvailableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => setSelectedTxIds(new Set())}
                          className="px-4 py-2 bg-white text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors border border-slate-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table Header - Only visible on desktop */}
                  <div className="hidden lg:grid grid-cols-6 px-8 py-5 border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] items-center">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={filteredTransactions.length > 0 && selectedTxIds.size === filteredTransactions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTxIds(new Set(filteredTransactions.map(t => t.id!).filter(Boolean)));
                          } else {
                            setSelectedTxIds(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Date
                    </div>`;

code = code.replace(regexHeader, newHeader);

// 3. Update Row Item Date Column
const regexRow = /\{\/\* Date - Mobile: tiny badge, Desktop: column 1 \*\/\}\s*<div \n\s*className="text-\[9px\] md:text-sm text-slate-400 font-bold uppercase tracking-wider lg:tracking-normal lg:font-semibold hover:text-indigo-600 transition-colors cursor-pointer p-1 -m-1 rounded-md hover:bg-indigo-50"/s;

const newRow = `{/* Date - Mobile: tiny badge, Desktop: column 1 */}
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={!!tx.id && selectedTxIds.has(tx.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (!tx.id) return;
                                  const newSet = new Set(selectedTxIds);
                                  if (e.target.checked) newSet.add(tx.id);
                                  else newSet.delete(tx.id);
                                  setSelectedTxIds(newSet);
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer hidden lg:block"
                              />
                            <div 
                              className="text-[9px] md:text-sm text-slate-400 font-bold uppercase tracking-wider lg:tracking-normal lg:font-semibold hover:text-indigo-600 transition-colors cursor-pointer p-1 -m-1 rounded-md hover:bg-indigo-50"`;

code = code.replace(regexRow, newRow);

fs.writeFileSync('src/App.tsx', code);
console.log("SUCCESS");
