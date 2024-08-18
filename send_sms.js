const client = require('twilio')(accountSid, authToken);

client.messages
  .create({
     body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
     //From twilio generated number
     from: ,
     //To user phone number
     to: 
   })
  .then(message => console.log(message.sid));