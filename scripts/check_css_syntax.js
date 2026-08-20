import fs from 'fs';

const content = fs.readFileSync('src/App.css', 'utf-8');
const lines = content.split('\n');

let braceCount = 0;
let inComment = false;

const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (!inComment && line.slice(j, j + 2) === '/*') {
      inComment = true;
      j++;
    } else if (inComment && line.slice(j, j + 2) === '*/') {
      inComment = false;
      j++;
    } else if (!inComment) {
      if (line[j] === '{') stack.push(i + 1);
      if (line[j] === '}') {
        if (stack.length > 0) {
          stack.pop();
        } else {
          console.log(`Extra closing brace at line ${i + 1}`);
        }
      }
    }
  }
}

console.log('Unclosed braces at line numbers:', stack);
