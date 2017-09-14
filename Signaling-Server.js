
module.exports = exports = function(app, socketCallback, User, Room) {
    // stores all sockets, user-ids, extra-data and connected sockets
    // you can check presence as following:
    // var isRoomExist = listOfUsers['room-id'] != null;
    var listOfUsers = {};
    var Callers = {}
    var theHost = {}
    var shiftedModerationControls = {};
    var Room
    // for scalable-broadcast demos
    var ScalableBroadcast;

    var io = require('socket.io');
    try {
        // use latest socket.io
        io = io(app);
        //console.log('LOG: ', onConnection)

        io.on('connection', onConnection);
    } catch (e) {
        // otherwise fallback
        io = io.listen(app, {
            log: false,
            origins: '*:*'
        });

        io.set('transports', [
            'websocket',
            'xhr-polling',
            'jsonp-polling'
        ]);
        io.sockets.on('connection', onConnection);
    }

    // to secure your socket.io usage: (via: docs/tips-tricks.md)
    // io.set('origins', 'https://domain.com');

    function appendUser(socket) {
        var alreadyExist = listOfUsers[socket.userid];
        var extra = {};

        if (alreadyExist && alreadyExist.extra) {
            extra = alreadyExist.extra;
        }

        var params = socket.handshake.query;

        if (params.extra) {
            try {
                if (typeof params.extra === 'string') {
                    params.extra = JSON.parse(params.extra);
                }
                extra = params.extra;
            } catch (e) {
                extra = params.extra;
            }
        }

        listOfUsers[socket.userid] = {
            socket: socket,
            connectedWith: {},
            isPublic: false, // means: isPublicModerator
            extra: extra || {},
            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
        };
    }

    function onConnection(socket) {
        var params = socket.handshake.query;
        var socketMessageEvent = params.msgEvent || 'RTCMultiConnection-Message';
        console.log('User joined from onConnection: ', socket.id)
        var sessionid = params.sessionid;
        var autoCloseEntireSession = params.autoCloseEntireSession;
        if (params.enableScalableBroadcast) {
            if (!ScalableBroadcast) {
                ScalableBroadcast = require('./Scalable-Broadcast.js');
            }
            ScalableBroadcast(socket, params.maxRelayLimitPerUser);
        }

        // temporarily disabled
        if (!!listOfUsers[params.userid]) {
            params.dontUpdateUserId = true;

            var useridAlreadyTaken = params.userid;
            params.userid = (Math.random() * 1000).toString().replace('.', '');
            socket.emit('userid-already-taken', useridAlreadyTaken, params.userid);
        }

        socket.userid = params.userid;
        appendUser(socket);
        console.log('sessionid: ', sessionid, ' socketid: ', socket.userid)
        if (autoCloseEntireSession == false && sessionid == socket.userid) {
            console.log('looking FOR SHIFT')
            socket.shiftModerationControlBeforeLeaving = true;
        }

        socket.on('shift-moderator-control-on-disconnect', function() {
          console.log('looking FOR SHIFT 11W1W1W1W')

            socket.shiftModerationControlBeforeLeaving = true;
            console.log('mod has been shifted')
        });

        socket.on('extra-data-updated', function(extra) {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].extra = extra;

                for (var user in listOfUsers[socket.userid].connectedWith) {
                    listOfUsers[user].socket.emit('extra-data-updated', socket.userid, extra);
                }
            } catch (e) {
                pushLogs('extra-data-updated', e);
            }
        });

        socket.on('get-remote-user-extra-data', function(remoteUserId, callback) {
            callback = callback || function() {};
            if (!remoteUserId || !listOfUsers[remoteUserId]) {
                callback('remoteUserId (' + remoteUserId + ') does NOT exist.');
                return;
            }
            callback(listOfUsers[remoteUserId].extra);
        });

        socket.on('become-a-public-moderator', function(token) {
          console.log(token)
            try {
                User.findOne({twitter_access_token: token.twitter_access_token}, (err, usr)=>{
                  socket['username'] = usr.username
                  socket['avatar'] = token.avatar
                  if (usr){
                    console.log(token.username, ' is Authenticated!')
                    Room.findOne({roomID: token.roomID}, (err, doc)=>{
                      if(doc){
                        if (doc.owner == token.username){
                          console.log('You are the owner!')
                          socket['avatar'] = token.avatar
                          socket.join(token.roomID)
                          socket.join(token.roomID+'-mod')
                          socket['roomHost'] = token.roomID

                          var check = false
                          for (var i = 0; i < doc.viewers.length; i++){
                            if(doc.viewers[i].username == token.username){
                              check = true
                              break
                            }
                          }
                          if(!check){
                            console.log('ADDED NEW VIEWER')
                            doc.viewers.push({username: socket.username, avatar: socket.avatar, userid: socket.userid, id: socket.id})
                          }

                          io.sockets.in(token.roomID).emit('viewers', {viewers: doc.viewers, total: doc.viewers.length})
                          doc.save()
                          if (!listOfUsers[socket.userid]) return;
                          listOfUsers[socket.userid].isPublic = true;
                        }
                        else{
                          console.log('You are not the owner!')
                        }
                      }
                      else{
                        console.log(err)
                      }
                    })

                  }
                  else{
                    console.log("user doesn't exist")
                  }
                })
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = true;
            } catch (e) {
                pushLogs('become-a-public-moderator', e);
            }
            //console.log('BECOMES PUBLIC MOD: ', listOfUsers[socket.userid])
        });

        var dontDuplicateListeners = {};
        socket.on('set-custom-socket-event-listener', function(customEvent) {
            if (dontDuplicateListeners[customEvent]) return;
            dontDuplicateListeners[customEvent] = customEvent;
            console.log('Event Listener: ', customEvent)
            socket.on(customEvent, function(message) {
                try {
                    socket.broadcast.emit(customEvent, message);
                } catch (e) {}
            });
        });
        /////////MY CUSOM SOCKETS///////////////
        socket.on('message', (data)=>{
          var token = data
          User.findOne({twitter_access_token: token.twitter_access_token}, (err, doc)=>{
            if (doc){
              io.sockets.in(token.roomID).emit('chat', data.msg)
              console.log('Dat data ',data)
            }
            else{
              console.log('not authenticated')
            }
          })
        })

        socket.on('calling', (token)=>{
          io.sockets.in(token.roomID+'-mod').emit('callers', {username: token.username, id: socket.id, avatar: token.avatar})
        })

        socket.on('update-calling', (token, msg)=>{
          io.sockets.in(token.roomID+'-mod').emit('updated-callers', msg)
          console.log('I got a decline here ', msg)
        })

        socket.on('host-incoming', ()=>{})

        socket.on('accept-call', (token, caller)=>{
          User.findOne({twitter_access_token: token.twitter_access_token}, (err, doc)=>{
            if(doc){
              Room.findOne({roomID: token.roomID}, (err, doc)=>{
                if (doc){
                  //FOR LATER AFTER I ADD AUTHENTICATIONSS
                  // if (!doc.callers[token.username]){
                  //   doc.callers[caller.username] = caller.username
                  // }
                  // else{
                  //   console.log('Call already accepted')
                  // }
                  // doc.save()
                  io.sockets.in(token.roomID+'-mod').emit('updated-callers',  {init: token.username, username: caller.username})
                  io.sockets.in(token.roomID).emit('global', (token.username + ' accepted ' + caller.username + "'s call"))
                  io.to(caller.id).emit('answered', 'answered')
                }
              })
            }
          })
        })

        socket.on('hangup', (token, caller)=>{
          User.findOne({twitter_access_token: token.twitter_access_token}, (err, doc)=>{
            if(doc){
              Room.findOne({roomID: token.roomID}, (err, rm)=>{
                if (rm){
                  for (var i = 0; i < rm.mods.length; i++){
                    if(rm.mods[i].username == token.username){
                      var new_socket = listOfUsers[caller.id]
                      console.log('get hung' , new_socket)
                      try{
                        io.to(new_socket.socket.id).emit('hungup-on', 'hungup')
                        io.sockets.in(token.roomID).emit('global', (token.username + ' kicked ' + caller.username + ' from the call'))

                      }catch(err){
                        console.log(err)
                      }
                    }
                  }
                }
              })
            }
          })
        })
        socket.on('give-mod', (token, usr)=>{
          User.findOne({twitter_access_token: token.twitter_access_token}, (err,doc)=>{
            if(doc){
              Room.findOne({roomID: token.roomID}, (err, room)=>{
                if(room){
                  room.mods.push({username: usr})
                  for(var i = 0; i < room.viewers.length; i++){
                    if (room.viewers[i].username == usr){
                      let st = room.viewers[i].userid
                      let s2 = listOfUsers[st].socket
                      s2.join(token.roomID+'-mod')

                      io.to(s2.id).emit('modded', true)
                      io.sockets.in(token.roomID).emit('global', (token.username + ' granted ' + usr + ' Mod'))
                      room.save()
                    }
                  }
                }
              })
            }
          })
        })
        socket.on('remove-mod', (token, usr)=>{
          User.findOne({twitter_access_token: token.twitter_access_token}, (err,doc)=>{
            if(doc){
              Room.findOne({roomID: token.roomID}, (err, room)=>{
                if(room){
                  for(var i = 0; i < room.mods.length; i++){
                    if(room.mods.username == usr){
                      room.mods.splice(i, 1)
                      break
                    }
                  }
                  for(var i = 0; i < room.viewers.length; i++){
                    if (room.viewers[i].username == usr){
                      let st = room.viewers[i].userid
                      let s2 = listOfUsers[st].socket
                      s2.leave(token.roomID+'-mod')

                      io.to(s2.id).emit('demodded', true)
                      io.sockets.in(token.roomID).emit('global', (token.username + ' removed ' + usr + ' from moderators'))
                      room.save()
                    }
                  }
                }
              })
            }
          })
        })
        socket.on('reload', (token)=>{
          io.sockets.in(token.roomID).emit('reconfigure-host', socket.id)
        })

        socket.on('get-user-info', (data)=>{
          let sock = listOfUsers[data.id].socket
          var obj = {
              vid: data.vid,
              username: sock.username,
              avatar: sock.avatar
            }
          io.to(socket.id).emit('user-info', obj)
        })

        socket.on('dont-make-me-moderator', function() {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = false;
            } catch (e) {
                pushLogs('dont-make-me-moderator', e);
            }
        });

        socket.on('get-public-moderators', function(userIdStartsWith, callback) {
            try {
                userIdStartsWith = userIdStartsWith || '';
                var allPublicModerators = [];
                for (var moderatorId in listOfUsers) {
                    if (listOfUsers[moderatorId].isPublic && moderatorId.indexOf(userIdStartsWith) === 0 && moderatorId !== socket.userid) {
                        var moderator = listOfUsers[moderatorId];
                        allPublicModerators.push({
                            userid: moderatorId,
                            extra: moderator.extra
                        });
                    }
                }

                callback(allPublicModerators);
            } catch (e) {
                pushLogs('get-public-moderators', e);
            }
        });

        socket.on('changed-uuid', function(newUserId, callback) {
            callback = callback || function() {};

            if (params.dontUpdateUserId) {
                delete params.dontUpdateUserId;
                return;
            }

            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].socket.userid == socket.userid) {
                    if (newUserId === socket.userid) return;

                    var oldUserId = socket.userid;
                    listOfUsers[newUserId] = listOfUsers[oldUserId];
                    listOfUsers[newUserId].socket.userid = socket.userid = newUserId;
                    delete listOfUsers[oldUserId];

                    callback();
                    return;
                }

                socket.userid = newUserId;
                appendUser(socket);

                callback();
            } catch (e) {
                pushLogs('changed-uuid', e);
            }
        });

        socket.on('set-password', function(password) {
            try {
                if (listOfUsers[socket.userid]) {
                    listOfUsers[socket.userid].password = password;
                }
            } catch (e) {
                pushLogs('set-password', e);
            }
        });

        socket.on('disconnect-with', function(remoteUserId, callback) {
            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].connectedWith[remoteUserId]) {
                    delete listOfUsers[socket.userid].connectedWith[remoteUserId];
                    socket.emit('user-disconnected', remoteUserId);
                }

                if (!listOfUsers[remoteUserId]) return callback();

                if (listOfUsers[remoteUserId].connectedWith[socket.userid]) {
                    delete listOfUsers[remoteUserId].connectedWith[socket.userid];
                    listOfUsers[remoteUserId].socket.emit('user-disconnected', socket.userid);
                }
                callback();
            } catch (e) {
                pushLogs('disconnect-with', e);
            }
        });

        socket.on('close-entire-session', function(callback) {
            try {
                var connectedWith = listOfUsers[socket.userid].connectedWith;
                Object.keys(connectedWith).forEach(function(key) {
                    if (connectedWith[key] && connectedWith[key].emit) {
                        try {
                            connectedWith[key].emit('closed-entire-session', socket.userid, listOfUsers[socket.userid].extra);
                        } catch (e) {}
                    }
                });

                delete shiftedModerationControls[socket.userid];
                callback();
            } catch (e) {
                pushLogs('close-entire-session', e);
            }
        });

        socket.on('check-presence', function(userid, callback) {
            if (!listOfUsers[userid]) {
                callback(false, userid, {});
            } else {
                callback(userid !== socket.userid, userid, listOfUsers[userid].extra);
            }
        });
        //CONNECTED USERS WHEN THEY JOIN
        function onMessageCallback(message) {
            try {
                if (!listOfUsers[message.sender]) {
                    socket.emit('user-not-found', message.sender);
                    return;
                }

                if (!message.message.userLeft && !listOfUsers[message.sender].connectedWith[message.remoteUserId] && !!listOfUsers[message.remoteUserId]) {
                    listOfUsers[message.sender].connectedWith[message.remoteUserId] = listOfUsers[message.remoteUserId].socket;
                    //console.log('User CONECTED 1', listOfUsers[message.remoteUserId])
                    listOfUsers[message.sender].socket.emit('user-connected', message.remoteUserId);

                    if (!listOfUsers[message.remoteUserId]) {
                        listOfUsers[message.remoteUserId] = {
                            socket: null,
                            connectedWith: {},
                            isPublic: false,
                            extra: {},
                            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                        };
                    }

                    listOfUsers[message.remoteUserId].connectedWith[message.sender] = socket;

                    if (listOfUsers[message.remoteUserId].socket) {
                      //console.log('User CONECTED 2', listOfUsers[message.remoteUserId])
                        listOfUsers[message.remoteUserId].socket.emit('user-connected', message.sender);
                    }
                }

                if (listOfUsers[message.sender].connectedWith[message.remoteUserId] && listOfUsers[socket.userid]) {
                    message.extra = listOfUsers[socket.userid].extra;
                    listOfUsers[message.sender].connectedWith[message.remoteUserId].emit(socketMessageEvent, message);
                }
            } catch (e) {
                pushLogs('onMessageCallback', e);
            }
        }

        //all of the "MESSAGES" from connection.join gets sent here. this is the best way to broker a Database connection
        function joinARoom(message) {
          try{
          var token = message.token
          User.findOne({twitter_access_token: token.twitter_access_token}, (err, rec)=>{
            if (rec){
              socket['avatar'] = token.avatar
              socket['username'] = rec.username
              socket['roomID'] = token.roomID
              console.log('THIS IS THE ID YOU BETER FIND IT ', token.roomID)
              Room.findOne({roomID: token.roomID}, (err, doc)=>{
                if (doc){
                //console.log('ME', token.roomID)
                socket.join(token.roomID)
                var users = doc.users
                for(var i = 0; i < users.length; i++){
                  if (users[i] == token.username){
                    break
                  }
                  else if (users[users.length-1] != token.username){
                    users.push(token.username)
                  }
                }
                doc.users = users
                  var new_obj = doc.viewers
                  var check = false
                  for (var i = 0; i < doc.viewers.length; i++){
                    if(doc.viewers[i].username == token.username){
                      check = true
                      break
                    }
                  }
                  if(!check){
                    new_obj.push({username: socket.username, avatar: socket.avatar, userid: socket.userid, id: socket.id})
                  }
                  doc.viewers = new_obj
                  io.sockets.in(token.roomID).emit('viewers', {viewers: new_obj, total: new_obj.length})


                message.message.localPeerSdpConstraints.OfferToReceiveAudio = true
                message.message.localPeerSdpConstraints.OfferToReceiveVideo = true
                message.message.remotePeerSdpConstraints.OfferToReceiveAudio = true
                message.message.remotePeerSdpConstraints.OfferToReceiveVideo = true

                // if (doc.callers[token.username] || doc.mods[token.username] || doc.owner == token.username){
                //   message.message.localPeerSdpConstraints.OfferToReceiveAudio = true
                //   message.message.localPeerSdpConstraints.OfferToReceiveVideo = true
                //   message.message.remotePeerSdpConstraints.OfferToReceiveAudio = true
                //   message.message.remotePeerSdpConstraints.OfferToReceiveVideo = true
                // }
                // else{
                //   message.message.localPeerSdpConstraints.OfferToReceiveAudio = true
                //   message.message.localPeerSdpConstraints.OfferToReceiveVideo = true
                //   message.message.remotePeerSdpConstraints.OfferToReceiveAudio = true
                //   message.message.remotePeerSdpConstraints.OfferToReceiveVideo = true
                //
                // }
                if(token.caller){
                  doc.callers.push({username: token.username, id: socket.id})
                }

                var roomInitiator = listOfUsers[message.remoteUserId];


                if (!roomInitiator) {
                    return;
                }
                var usersInARoom = roomInitiator.connectedWith;
                var maxParticipantsAllowed = roomInitiator.maxParticipantsAllowed;

                if (Object.keys(usersInARoom).length >= maxParticipantsAllowed) {
                    socket.emit('room-full', message.remoteUserId);

                    if (roomInitiator.connectedWith[socket.userid]) {
                        delete roomInitiator.connectedWith[socket.userid];
                    }
                    return;
                }

                var inviteTheseUsers = [roomInitiator.socket];
                Object.keys(usersInARoom).forEach(function(key) {
                    inviteTheseUsers.push(usersInARoom[key]);
                });

                var keepUnique = [];
                inviteTheseUsers.forEach(function(userSocket) {
                    if (userSocket.userid == socket.userid) return;
                    if (keepUnique.indexOf(userSocket.userid) != -1) {
                        return;
                    }
                    keepUnique.push(userSocket.userid);

                    message.remoteUserId = userSocket.userid;
                    userSocket.emit(socketMessageEvent, message);
                });
                doc.save()
                }
                else{
                  console.log('ROOM DOESNT EXIST')
                }
              })

            }
            else{
              socket.emit('errors', 'not authenticated bish')
            }
          })}
          catch(err){
            console.log(err)
          }

        }

        var numberOfPasswordTries = 0;
        socket.on(socketMessageEvent, function(message, callback) {
            if (message.remoteUserId && message.remoteUserId === socket.userid) {
                // remoteUserId MUST be unique
                return;
            }

            try {
                if (message.remoteUserId && message.remoteUserId != 'system' && message.message.newParticipationRequest) {
                    if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].password) {
                        if (numberOfPasswordTries > 3) {
                            socket.emit('password-max-tries-over', message.remoteUserId);
                            return;
                        }

                        if (!message.password) {
                            numberOfPasswordTries++;
                            socket.emit('join-with-password', message.remoteUserId);
                            return;
                        }

                        if (message.password != listOfUsers[message.remoteUserId].password) {
                            numberOfPasswordTries++;
                            socket.emit('invalid-password', message.remoteUserId, message.password);
                            return;
                        }
                    }

                    if (listOfUsers[message.remoteUserId]) {
                        joinARoom(message);
                        return;
                    }
                }

                if (message.message.shiftedModerationControl) {
                    if (!message.message.firedOnLeave) {
                        onMessageCallback(message);
                        return;
                    }
                    shiftedModerationControls[message.sender] = message;
                    return;
                }

                // for v3 backward compatibility; >v3.3.3 no more uses below block
                if (message.remoteUserId == 'system') {
                    if (message.message.detectPresence) {
                        if (message.message.userid === socket.userid) {
                            callback(false, socket.userid);
                            return;
                        }

                        callback(!!listOfUsers[message.message.userid], message.message.userid);
                        return;
                    }
                }

                if (!listOfUsers[message.sender]) {
                    listOfUsers[message.sender] = {
                        socket: socket,
                        connectedWith: {},
                        isPublic: false,
                        extra: {},
                        maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                    };
                }

                // if someone tries to join a person who is absent
                if (message.message.newParticipationRequest) {
                    var waitFor = 60 * 10; // 10 minutes
                    var invokedTimes = 0;
                    (function repeater() {
                        if (typeof socket == 'undefined' || !listOfUsers[socket.userid]) {
                            return;
                        }

                        invokedTimes++;
                        if (invokedTimes > waitFor) {
                            socket.emit('user-not-found', message.remoteUserId);
                            return;
                        }

                        if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].socket) {
                            joinARoom(message);
                            return;
                        }

                        setTimeout(repeater, 1000);
                    })();

                    return;
                }

                onMessageCallback(message);
            } catch (e) {
                pushLogs('on-socketMessageEvent', e);
            }
        });

        socket.on('disconnect', function() {
            try {
              if(socket.roomHost){
              Room.findOne({roomID: socket.roomHost}, (err, doc)=>{
                if(doc){
                  let tempDoc = doc.viewers

                  for (var i = 0; i < doc.viewers.length; i++){
                    if (doc.viewers[i].username == socket.username){
                      tempDoc.splice(i, 1)
                      console.log('DELETED VIEWER')
                      break
                    }
                  }
                  doc.viewers = tempDoc
                  var new_obj = doc.viewers
                  //var checker = false
                  for(var i = 0; i < new_obj.length; i++){
                    if(new_obj[i].username == socket.username){
                      new_obj.splice(i, 1)
                      break
                    }
                  }
                  io.sockets.in(socket.roomID).emit('viewers', {viewers: new_obj, total: new_obj.length})
                  doc.viewers = new_obj
                  Room.findOneAndUpdate({roomID: socket.roomHost}, {$pull: {'callers':{'username': socket.username}}}, (err, data)=>{
                    if(err){
                      console.log(err)
                    }
                    else {
                      console.log(data)
                    }
                  })
                  doc.hostPresent = false
                  doc.save()
                }
                else{
                  console.log(err)
                }
              })
            }
                if (socket.roomHost){
                  setTimeout(()=>{
                    Room.findOne({roomID: socket.roomHost}, (err, doc)=>{
                      if(doc){
                        if(doc.hostPresent){
                          console.log('HOST RETURNED')
                          io.sockets.in(socket.roomHost).emit('recon', 'yodayoda')
                          doc.save()
                        }
                        else{
                          if(!doc.callers[0]){
                            console.log('ROOM DELETED')
                            doc.remove()
                          }
                          else{
                            io.to(doc.callers[0].id).emit('re-host', true)
                            io.sockets.in(socket.roomHost).emit('recon', 'yodayoda')
                            doc.hostPresent = true
                            doc.save()
                          }
                        }

                      }else{
                        console.log(err)
                      }
                    })
                  }, 5000)
                  //io.sockets.in(socket.roomHost).emit('recon', 'yodayoda')
                }
                if(!socket.roomhost){
                  Room.findOne({roomID: socket.roomID}, (err, doc)=>{
                    if(doc){
                      for (var i = 0; i < doc.viewers.length; i++){
                        if (doc.viewers[i] == socket.username){
                          doc.viewers.splice(i, 1)
                          break
                          //io.sockets.in(socket.roomID).emit('viewers', {users: doc.users, total: doc.users.length, avatar: socket.avatar})
                        }
                      }
                      var new_obj = doc.viewers
                      //var checker = false
                      for(var i = 0; i < new_obj.length; i++){
                        if(new_obj[i].username == socket.username){
                          new_obj.splice(i, 1)
                          break
                        }
                      }
                      io.sockets.in(socket.roomID).emit('viewers', {viewers: new_obj, total: new_obj.length})
                      doc.viewers = new_obj
                      doc.save()
                    }
                  })
                }
                if (socket && socket.namespace && socket.namespace.sockets) {
                    delete socket.namespace.sockets[this.id];

                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {

                var message = shiftedModerationControls[socket.userid];

                if (message) {
                    delete shiftedModerationControls[message.userid];
                    onMessageCallback(message);
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                // inform all connected users

                if (listOfUsers[socket.userid]) {
                    var firstUserSocket;
                    //console.log(listOfUsers)

                    for (var s in listOfUsers[socket.userid].connectedWith) {

                        if (!firstUserSocket) {
                            firstUserSocket = listOfUsers[socket.userid].connectedWith[s];
                        }

                        listOfUsers[socket.userid].connectedWith[s].emit('user-disconnected', socket.userid);

                        if (listOfUsers[s] && listOfUsers[s].connectedWith[socket.userid]) {
                            delete listOfUsers[s].connectedWith[socket.userid];
                            listOfUsers[s].socket.emit('user-disconnected', socket.userid);
                        }
                    }
                    if (socket.shiftModerationControlBeforeLeaving && firstUserSocket) { // error in code shiftedModerationControlBeforeLeaving Control instead of controlls
                        firstUserSocket.emit('become-next-modrator', sessionid);
                    }
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            delete listOfUsers[socket.userid];
        });

        if (socketCallback) {
            socketCallback(socket);
        }
    }
};

var enableLogs = false;

try {
    var _enableLogs = require('./config.json').enableLogs;

    if (_enableLogs) {
        enableLogs = true;
    }
} catch (e) {
    enableLogs = false;
}

var fs = require('fs');

function pushLogs() {
    if (!enableLogs) return;

    var logsFile = process.cwd() + '/logs.json';

    var utcDateString = (new Date).toUTCString().replace(/ |-|,|:|\./g, '');

    // uncache to fetch recent (up-to-dated)
    uncache(logsFile);

    var logs = {};

    try {
        logs = require(logsFile);
    } catch (e) {}

    if (arguments[1] && arguments[1].stack) {
        arguments[1] = arguments[1].stack;
    }

    try {
        logs[utcDateString] = JSON.stringify(arguments, null, '\t');
        fs.writeFileSync(logsFile, JSON.stringify(logs, null, '\t'));
    } catch (e) {
        logs[utcDateString] = arguments.toString();
    }
}

// removing JSON from cache
function uncache(jsonFile) {
    searchCache(jsonFile, function(mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(jsonFile) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
}

function searchCache(jsonFile, callback) {
    var mod = require.resolve(jsonFile);

    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function(child) {
                run(child);
            });

            callback(mod);
        })(mod);
    }
}
