import fs from 'fs';

let dateStr = "2026-05-15T09:30:00";
let timePartMatch = dateStr.match(/T(\d{2}:\d{2})/);
console.log(timePartMatch);
