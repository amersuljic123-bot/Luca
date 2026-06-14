import * as fs from "fs";

function testMatch(transaction, rule) {
    let datetimeMatch = true;
    if (transaction.date) {
      // If it's a date-only string like "YYYY-MM-DD", append T12:00:00 to prevent local timezone from shifting it to the previous day
      const dateToParse = (transaction.date.length === 10) ? `${transaction.date}T12:00:00` : transaction.date;
      const d = new Date(dateToParse);
      
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const daysArray = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [rule.daysOfWeek];
        const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long' });
        if (!daysArray.includes(dayStr)) {
          datetimeMatch = false;
        }
      }
      if (datetimeMatch && (rule.startTime || rule.endTime)) {
        if (transaction.date.includes('T') || transaction.date.includes(':')) {
           const timePartMatch = transaction.date.match(/T(\d{2}:\d{2})/);
           let timeStr = "";
           if (timePartMatch && timePartMatch[1]) {
             timeStr = timePartMatch[1];
           } else {
             const hours = d.getHours().toString().padStart(2, '0');
             const mins = d.getMinutes().toString().padStart(2, '0');
             timeStr = `${hours}:${mins}`;
           }

           if (rule.startTime && timeStr < rule.startTime) datetimeMatch = false;
           if (rule.endTime && timeStr > rule.endTime) datetimeMatch = false;
        } else {
           datetimeMatch = false;
        }
      }
    }
    return datetimeMatch;
}

console.log(testMatch({ date: "2026-05-15T13:45:00" }, { startTime: "10:00", endTime: "14:00" }));
console.log(testMatch({ date: "2026-05-15 13:45:00" }, { startTime: "10:00", endTime: "14:00" }));
console.log(testMatch({ date: "2026-05-15" }, { startTime: "10:00", endTime: "14:00" }));
