var express = require('express')
var app = require('express')()
var app2 = require('express')()
var http = require('http')
var https = require('https')
var server = http.createServer(app)
var mongoose = require('mongoose')
var jwtDecode = require('jwt-decode')
var jwt = require('jwt-simple')
var Room = require('./db/rooms.js')
var User = require('./db/users.js')
var Request = require('./db/request.js')
var Whitelist = require('./db/whitelist.js')
var cors = require('cors')
var favicon = require('serve-favicon')
var fs = require('fs')

mongoose.connect('mongodb://localhost/yam-vidchat')

//  TWITTER //
var passport = require('passport')
var Strategy = require('passport-twitter').Strategy
var Twitter = require('twitter')

var optionsH = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem'),
  requestCert: false,
  rejectUnauthorized: false,
  ca: fs.readFileSync('fullchain.pem')
}
var port1 = 443;
var port2 = 80;

var dev_mode = false

if(dev_mode){
  var port1 = 9001;
}


passport.use(new Strategy({
    consumerKey: '',
    consumerSecret: '',
    callbackURL: 'https://yamochat.im/login/twitter/return' //CHANGEd//
  },
  function(token, tokenSecret, profile, cb) {
    //////I TOOK SOME OF THE DATA FROM PROFILE, YOU CAN TAKE MORE//////////
    var obj = profile._json

    console.log('TOKEN ', token, 'TOKENSECRET ', tokenSecret)
    Whitelist.findOne({username: obj.screen_name}, (err, doc)=>{
      if(err){console.log(err)}
      console.log(doc)
      if(doc){
        User.findOne({twitter_access_token: token}, (err,newbie)=>{
          if(!newbie){
            var new_user = new User
            new_user.username = obj.screen_name
            new_user.avatar = obj.profile_image_url_https
            new_user.name = obj.name
            new_user.verified = obj.verified
            new_user.description = obj.description
            new_user.twitter_access_secret = tokenSecret
            new_user.twitter_access_token = token
            new_user.join_date = new Date()
            new_user.rooms = []

            new_user.save((err)=>{
              if (err){console.log(err)}
            })
          }
        })

      }
      else{
        Request.findOne({twitter_access_token: token}, (err,newbie)=>{
          if(!newbie){
            var request = new Request
            request.username = obj.screen_name
            request.avatar = obj.profile_image_url_https
            request.name = obj.name
            request.verified = obj.verified
            request.description = obj.description
            request.twitter_access_secret = tokenSecret
            request.twitter_access_token = token
            request.join_date = new Date()
            request.rooms = []

            request.save((err)=>{
              if (err){console.log(err)}
            })
          }
        })
      }
    })
    var new_obj = new Request
    new_obj.username = obj.screen_name
    new_obj.avatar = obj.profile_image_url_https
    new_obj.name = obj.name
    new_obj.verified = obj.verified
    new_obj.description = obj.description
    new_obj.twitter_access_secret = tokenSecret
    new_obj.twitter_access_token = token
    new_obj.join_date = new Date()
    new_obj.rooms = []


    return cb(null, new_obj)
  }))

passport.serializeUser(function(user, cb) {
  cb(null, user)
})

passport.deserializeUser(function(obj, cb) {
  cb(null, obj)
})

app.use(cors())


app.use(favicon(__dirname + '/build/favicon.ico'))
app.use(express.static('build'))
app.use(require('cookie-parser')())
app.use(require('express-session')({ secret: 'yammy yam yam cat', resave: true, saveUninitialized: true }))
app.use(passport.initialize())
app.use(passport.session())
//TWITTER ROUTES
app.get('/login-failed', (req, res) => {
    res.json({authenticated: false, body: 'TWITTER DIDNT WORK MANG'})
})
app.get('/login/twitter', cors(), passport.authenticate('twitter'))  //USE THIS FOR LOGIN BUTTONS
app.get('/login/twitter/return', passport.authenticate('twitter', { failureRedirect: '/login-failed' }), (req, res) => {
  //SENDS A CUSTOM JWT TOKEN IN A COOKIE FOR THE CLIENT TO ACCESS THEIR TWITTER TOKENS
  //console.log('THIS IS THE CLIENTS IP: ', req.ip, ' || ', req.connection.remoteAddress, ' || ',  req.headers['x-forwarded-for'])
  Whitelist.findOne({username: req.user.username}, (err,doc)=>{
    if(doc){
      User.findOne({twitter_access_token: req.user.twitter_access_token}, (err,exists)=>{
        if(exists){
          exists.ip_address = req.headers['x-forwarded-for']
          exists.save()
          var new_user = {
            avatar: req.user.avatar,
            description: req.user.description,
            name: req.user.name,
            twitter_access_token: req.user.twitter_access_token,
            twitter_access_secret: req.user.twitter_access_secret,
            username: req.user.username,
          }
          var token = jwt.encode(new_user, '')
          res.cookie('token', token) //USES COOKIE PARSER TO WRITE TO HEADER
          res.redirect(302,"/") //REDIRECTS TO MAIN ROUTE. CHANGE IF YOU HAVE MULTIPLE ROUTES FOR AUTHENTICATING
        }
        else{
          var new_user = {
            avatar: req.user.avatar,
            description: req.user.description,
            name: req.user.name,
            twitter_access_token: req.user.twitter_access_token,
            twitter_access_secret: req.user.twitter_access_secret,
            username: req.user.username,
          }
          var token = jwt.encode(new_user, '')
          res.cookie('token', token) //USES COOKIE PARSER TO WRITE TO HEADER
          res.redirect(302,"/") //REDIRECTS TO MAIN ROUTE. CHANGE IF YOU HAVE MULTIPLE ROUTES FOR AUTHENTICATING
        }
      })
    }
    else{
      res.redirect(302,"/whitelist")
    }
  })




})
//----------------------------------------//
app.all('/', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "X-Requested-With")
  next()
 })

app.get('/', (req,res)=>{
  res.sendFile(__dirname + '/build/index.html');
})
app.get('/login', (req,res)=>{
  res.sendFile(__dirname + '/build/index.html')
})
 app.get('/favicon.ico', (req, res) =>{
   //res.sendFile(__dirname + '/build/index.html');
 })

 app.get('/room/*', (req,res)=>{
   res.sendFile(__dirname + '/build/index.html');
 })

 app.get('/rooms', (req, res) => {
   Room.find().limit(10).exec((err, doc)=>{
     if (err) {console.log(err)}
     res.json(doc)
   })
 })

 app.get('/whitelist', (req, res) => {
   res.sendFile(__dirname + '/build/index.html');
 })

 app.get('/check-presence/:room', (req,res)=>{
   Room.findOne({name: req.params.room}, (err,doc)=>{
     if(doc){
       res.json({exists: true})
     }
     else{
       res.json({exists: false})
     }
   })
 })

 app.post('/create-room/:token', (req, res) => {
   var token = jwtDecode(req.params.token)
   //var token = req.params.token
   console.log('TOKEN: ', token)
   User.findOne({twitter_access_token: token.twitter_access_token}, (err, doc)=>{
     if (doc){
       Room.findOne({name: token.roomName}, (err, doc)=>{
         if (!doc){
           var new_room = new Room
           new_room.name = token.roomName //change name
           new_room.owner = token.username
           new_room.users.push(token.username)
           new_room.hostPresent = true
           new_room.callers.push({username: token.username})
           new_room.mods.push({username: token.username})
           //new_room.mods[token.username] = token.username
           new_room.viewers.push({username: token.username, avatar: token.avatar})
          //  new_room.users[token.username] = {
          //    userid: socket.userid
          //  }
           new_room.date_created = new Date()
           new_room.save()
           res.json({success: true, error_code: 0, message: 'SUCCESS'})
         }
         else if(doc){
           console.log('Room is already created')
           res.json({success: false, error_code: 5, message: 'ROOM ALREADY EXISTS'})
         }
       })
     }
     else{
       res.json({success: false, error_code: 3, message: 'USER NOT AUTHENTICATED'})
     }
   })
 })

 //ERRORS//
app.get('/404', function(req, res, next){
  next();
});
app.get('/403', function(req, res, next){
  // trigger a 403 error
  var err = new Error('not allowed!');
  err.status = 403;
  next(err);
});

app.get('/500', function(req, res, next){
  // trigger a generic (500) error
  next(new Error('keyboard cat!'));
});

app.use(function(req, res, next){
  res.status(404);

  res.format({
    html: function () {
      res.sendFile(__dirname + '/build/404.html')
    },
    json: function () {
      res.json({ error: 'Not found' })
    },
    default: function () {
      res.type('txt').send('Not found')
    }
  })
})

app.use(function(err, req, res, next){
  res.status(err.status || 500).json(err.status)
  //res.json('500', { error: err });
})

var server = https.createServer(optionsH, app)
var server2 = http.createServer(app2)


//SOCKET//
require('./Signaling-Server.js')(server, (socket) => {
    try {
        var params = socket.handshake.query;
        // connection.socketCustomEvent = 'custom-message';  // var socket = connection.getSocket();
         // socket.emit(connection.socketCustomEvent, { test: true });
        if (!params.socketCustomEvent) {
            params.socketCustomEvent = 'custom-message';
        }
        socket.on(params.socketCustomEvent, function(message) {
            try {
                socket.broadcast.emit(params.socketCustomEvent, message);
            } catch (e) {}
        });
    } catch (e) {}
}, User, Room);


server.listen(port1, function(){
  console.log('listening on *:',port1);
});
server2.listen(port2, function(){
  console.log('listening on *:',port2);
});
