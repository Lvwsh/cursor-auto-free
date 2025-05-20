const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'reset_machine.py');
console.log('filePath:', filePath);
console.log('exists:', fs.existsSync(filePath)); 