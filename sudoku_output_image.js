const fs = require('fs');
const { createCanvas } = require("canvas");

function create_sudoku(sudoku) {
const width = 900;
const height = 900;
const canvas = createCanvas(width, height);
const context = canvas.getContext("2d");
for(var i = 100; i < 900; i+= 100) {
if(i == 300 || i == 600) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 900);
    context.strokeStyle = 'red';
    context.stroke();
}
else{
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 900);
    context.strokeStyle = 'black';
    context.stroke();
}
}
for(var i = 100; i < 900; i+= 100) {
if(i == 300 || i == 600) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(900, i);
    context.strokeStyle = 'red';
    context.stroke();
}
else{
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(900, i);
    context.strokeStyle = 'black';
    context.stroke();
}
}
context.font = '48px serif';
var i = 0;
for(var y = 60; y < 900; y += 100) {
var j = 0;
for(var x = 40; x < 900; x += 100) {
    context.fillText(sudoku[i][j], x, y);
    j++;
}
i++;
}
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("./image.png", buffer);
}