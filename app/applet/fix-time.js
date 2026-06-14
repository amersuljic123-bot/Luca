const fs = require('fs');
let code = fs.readFileSync('src/services/transactionService.ts', 'utf-8');

const regex = /let datetimeMatch = true;[\s\S]*?if \(merchantMatch && tagMatch && exactAmountMatch && minAmountMatch && maxAmountMatch && datetimeMatch\) \{/g;

code = code.replace(regex, `let datetimeMatch = true;
    if (transaction.date) {
      const d = new Date(transaction.date);
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const daysArray = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [rule.daysOfWeek];
        const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long' });
        if (!daysArray.includes(dayStr)) {
          datetimeMatch = false;
        }
      }
      if (datetimeMatch && (rule.startTime || rule.endTime)) {
        if (transaction.date.includes('T') || transaction.date.includes(':')) {
           const timePartMatch = transaction.date.match(/T(\\d{2}:\\d{2})/);
           let timeStr = "";
           if (timePartMatch && timePartMatch[1]) {
             timeStr = timePartMatch[1];
           } else {
             const hours = d.getHours().toString().padStart(2, '0');
             const mins = d.getMinutes().toString().padStart(2, '0');
             timeStr = \`\${hours}:\${mins}\`;
           }
           if (rule.startTime && timeStr < rule.startTime) datetimeMatch = false;
           if (rule.endTime && timeStr > rule.endTime) datetimeMatch = false;
        } else {
           datetimeMatch = false;
        }
      }
    }

    if (merchantMatch && tagMatch && exactAmountMatch && minAmountMatch && maxAmountMatch && datetimeMatch) {`);

fs.writeFileSync('src/services/transactionService.ts', code);
