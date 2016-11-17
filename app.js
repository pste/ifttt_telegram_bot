const util      = require('util');
const color     = require('colors');
const fs        = require('fs');
//const http      = require('http');
const express   = require('express');
const bodyParser = require('body-parser');
const url       = require('url');

const srv_ip    = "ifttt-bot.ddns.net"; // Amazon AWS address
const srv_port  = 8080;
const srv_url   = "http://" + srv_ip + ":" + srv_port;

// set debug=true
var dbg = true || (process.env.debug === 'true');
var log = function() {
  var args = new Array(arguments.length+1); // V8 optimized
  var l = console.log.bind(console);
  var ts = '[' + (new Date()).toISOString() + ']';
  args[0] = ts;
  for (i=0;i<arguments.length;i++) args[i+1] = arguments[i];
  l.apply(console, args);
}

//
const token = fs.readFileSync('token.key', 'utf8');
const telegram = require('telegram-bot-api');
var api = new telegram({
  token: token
  , updates: {
    enabled: true
  }
});

/*****************************************************************/

// costanti
// UTF-16 Hex (C Syntax) - Unified Unicode emoji (surrogate) 🍨 
// http://www.fileformat.info/info/unicode/char/search.htm (example: "pizza") => then UTF 16 decimal
var aboutMsg = "coded with " + String.fromCharCode(55356, 57173) + " by \[pirraste\]\nhttps://pirraste.wordpress.com\n\n\
IFTTT and its logo are a trademarks of IFTTT, Inc.\n\n\
Disclaimer: messages will be routed by me (the robot), so keep in mind I can also read them.\n\
Think about your privacy and write funny things 'cause I'm a bored robot :)";
var helpmsg = "Use /register to obtain your chat url. Use /about for the rest.";

/* :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

function _sendTelegram(opt) {
  api.sendMessage(opt, function(err, data) {
	if (err) log('BOT Error'.red, err);
    
    else if (dbg) log('data:\n'.yellow, util.inspect(data));
    else log('response sent to ' + opt.chat_id.toString().blue + ' .. ');
  });
}

function sendText(chatid, msg) {
  if (chatid && msg) {
    _sendTelegram({
      chat_id: chatid
      , text: msg
    });
  }
  else {
    log("nothing to send ", chatid, "|", msg);
  }
}

function sendMarkdown(chatid, msg) {
  _sendTelegram({
    chat_id: chatid
    , text: msg
    , parse_mode: 'Markdown'
  });
}

function sendKeyboard(chatid, msg, keys) {
  var keyConfig = {
    keyboard: keys
    , one_time_keyboard: true
    , selective: true
  };
  
  _sendTelegram({
    chat_id: chatid
    , text: msg
    , reply_markup: JSON.stringify(keyConfig)
  });
}

/* :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

// wake up on message:
log('*** STARTING TELEGRAM BOT ***');
api.on('message', function(message) {
  if (dbg) log('received message:\n'.yellow, message);
  else {
    var txt = message.text || '(no text)';
    log('received message ' + txt.blue + ' from ' + message.chat.id.toString());
  }
  
  // drop everything BUT the register msg
  switch (message.text) {
    case '/register':   sendText(message.chat.id, 'This is your IFTTT notification url:\n' + srv_url  + '\n\nUse a GET method with querystring:\n' + srv_url + '/?chat_id=' + message.chat.id + '&message=blah%20blah\nor a POST method with "chat_id" and "message" json body parameters.' + '\nUse it into your "then" field to trigger the chat.'); break;
    case '/about':      sendText(message.chat.id, aboutMsg); break;
    default:            sendText(message.chat.id, helpmsg);  break;
  }
});

/* :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

var app = express();

// parse application/x-www-form-urlencoded and application/json:
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  log("HTTP GET (", req.ip, "): ", req.query);
  sendText(req.query.chat_id, req.query.message);  
  res.write('get done');
  res.end();
});

app.post('/', (req, res) => {
  log("HTTP POST recvd (", req.ip, "): ", req.body);
  sendText(req.body.chat_id, req.body.message);  
  res.write('post done');
  res.end();
});

app.listen(srv_port, function () {
  log("*** STARTING HTTP SRV (" + srv_url + ") ***");
});