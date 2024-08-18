const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const extName = require('ext-name');
const fetch = require('node-fetch');
const urlUtil = require('url');
const path = require('path');
const fs = require('fs');
const _ = require("lodash");
const { createCanvas } = require("canvas");

const Twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const config = require('./config');

const client = require('twilio')(config.twilioKey, config.twilioSecretKey);
const PUBLIC_DIR = './image_buffer';

let aws = require('aws-sdk');
const { toInteger } = require('lodash');
aws.config.update({
    accessKeyId: config.awsAccesskeyID,
    secretAccessKey: config.awsSecretAccessKey,
    region: config.awsRegion
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

let twilioClient;
let sudoku_array = [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
];


const textract = new aws.Textract();


function getTwilioClient() {
    return twilioClient || new Twilio(config.twilioKey, 
        config.twilioSecretKey);
}

function SaveMedia(mediaItem) {
    const { mediaUrl, extension } = mediaItem;
    const fullPath = path.resolve(`${PUBLIC_DIR}/image_from_user.${extension}`);

    fetch(mediaUrl)
   .then(
    res =>
      new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(fullPath);
        res.body.pipe(dest);
        res.body.on("end", () => resolve("it worked"));
        dest.on("error", reject);
      })
  )
  .then(x => console.log(x));

    deleteMediaItem(mediaItem);

  }
//   async function SaveMedia(mediaItem) {
//     const { mediaUrl, extension } = mediaItem;
//     const fullPath = path.resolve(`${PUBLIC_DIR}/image_from_user.${extension}`);

//     let res = await fetch(mediaUrl);
//     return new Promise((resolve, reject) => {
//         const dest = fs.createWriteStream(fullPath);
//         res.body.pipe(dest);
//         deleteMediaItem(mediaItem);
//         res.body.on("end", () => resolve("it worked"));
//         dest.on("error", reject);
//     })
//   }

  function deleteMediaItem(mediaItem) {
    const client = getTwilioClient();

    return client
      .api.accounts(config.twilioKey)
      .messages(mediaItem.MessageSid)
      .media(mediaItem.mediaSid).remove();
  }

app.post('/sms', async(req, res) => {
    let mediaItem;
    const { body } = req;
    const { NumMedia, From: SenderNumber, MessageSid } = body;
    
    const mediaUrl = body[`MediaUrl0`];
    const contentType = body[`MediaContentType0`];
    const extension = extName.mime(contentType)[0].ext;
    if(extension === 'jpeg' || extension === 'png'){
        const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
        const filename = `image_from_user.${extension}`;
        mediaItem = { mediaSid, MessageSid, mediaUrl, filename, extension };
        await SaveMedia(mediaItem);
    }

    let params = {Document: {Bytes: fs.readFileSync(`${PUBLIC_DIR}/${mediaItem.filename}`)}, FeatureTypes: ['TABLES']};
    const request = textract.analyzeDocument(params);
    const data = await request.promise();
    let cells = data.Blocks.filter(block => block.BlockType == "CELL");
    let words = data.Blocks.filter(block => block.BlockType == "WORD");

    for (let cellNum = 0; cellNum < cells.length; cellNum++) {
        let cell = cells[cellNum];
        let y = cell.RowIndex - 1;
        let x = cell.ColumnIndex - 1;
        if (cell.Relationships == undefined) {
            sudoku_array[y][x] = 0;
        } else {
            if (data.Blocks.find(block => block.Id == cell.Relationships[0].Ids[0]).BlockType != "WORD") {
                sudoku_array[y][x] = 0;
            } else {
                let val = words.find(word => word.Id == cell.Relationships[0].Ids[0]).Text;
                sudoku_array[y][x] = toInteger(val);
            }
        }
    }

    // fs.unlinkSync(`${PUBLIC_DIR}/${mediaItem.filename}`, (e) => console.log(e));
    fs.unlinkSync(`./public/image.jpeg`, (e) => console.log(e));
    console.log(sudoku_array);
    let solved_puzzle = sudoku(sudoku_array)
    console.log(solved_puzzle);
    create_image(solved_puzzle);
    app.use(express.static('public'));
    
    const messageBody = NumMedia === '0' ?
    'Send us a sudoku puzzle!' :
    'The puzzle has been recieved and analyzed! Sending over the result now...';

    // const response = new MessagingResponse();
    // response.message({
    //   from: config.twilioPhoneNumber,
    //   to: SenderNumber,
    // }, );

    let response = ''

    client.messages
      .create({
         body: 'The puzzle has been recieved and solved!',
         from: config.twilioPhoneNumber,
         mediaUrl: ['http://d608-128-119-202-122.ngrok.io/image.jpeg'],
         to: SenderNumber
       })
      .then(message => response = message.sid);
    
    return res.send(response.toString()).status(200);
});

http.createServer(app).listen(1339, () => {
    console.log('Express server listening on port 1339');
});

function possible(puzzle,y,x,n) {
    for (let i = 0; i < 9; i++) {
        if (puzzle[y][i] == n) return false;
    }
    for (let j = 0; j < 9; j++) {
        if (puzzle[j][x] == n) return false;
    }
    let y0 = Math.floor(y/3)*3;
    let x0 = Math.floor(x/3)*3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (puzzle[y0 + i][x0 + j] == n) return false;
        }
    }
    return true;
}

function sudoku(puzzle) {
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            if (puzzle[y][x] == 0) {
                for (let n = 1; n < 10; n++) {
                    if (possible(puzzle,y,x,n)) {
                        puzzle[y][x] = n;
                        if (sudoku(puzzle) == puzzle) {
                            solved = puzzle;
                            return solved;
                        }
                        else {
                            puzzle[y][x] = 0;
                        }
                    }
                }
                return;
            }
        }    
    }
    solved = puzzle;
    return solved;
}
  
function validate(puzzle) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            n = puzzle[i][j]
            if (n == 0) return false;
            puzzle[i][j] = 0
            if (!possible(puzzle,i,j,n)) {
                puzzle[i][j] = n;
                return false;
            }
            puzzle[i][j] = n;
        }   
    }
    return true
}

function create_image(sudoku) {
    const width = 900;
    const height = 900;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'black';
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
    
    const buffer = canvas.toBuffer("image/jpeg");
    fs.writeFileSync("./public/image.jpeg", buffer);
}



