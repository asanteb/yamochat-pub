import React from 'react'

/////Component Routes/////
import {BrowserRouter as Router, Route, Link} from 'react-router-dom'

//////UI//////

import {observer} from "mobx-react"
import {Scrollbars} from 'react-custom-scrollbars'

import jwt from 'jwt-simple'
import JWT from 'jwt-decode'
import Cookies from 'universal-cookie';
const cookie = new Cookies()

///TOOLS///
import MDSpinner from "react-md-spinner"
import Halogen from 'halogen'
import axios from 'axios'
const arrayUniq = require('array-uniq')

/////SEMANTIC////
import { Input, Menu, Comment, Dimmer, Button, Grid, Icon, Label, Popup, Image, Modal, Divider, Header, Loader } from 'semantic-ui-react'

import EmojiPicker from 'emojione-picker'
import {emojify} from 'react-emojione';
import Infinite from 'react-infinite'
import Video from 'react-h5-video'
import ReactChatView from 'react-chatview'

import {Howl} from 'howler'
import shortid from 'shortid'

var connection = new RTCMultiConnection('yamchat');
// by default, socket.io server is assumed to be deployed on your own URL
var remoteDev = true

if(remoteDev){
  connection.socketURL = 'https://yamochat.im/';
}

var dev_mode = false
var DOMAIN_URL = 'https://yamochat.im'
if(dev_mode){
  DOMAIN_URL = 'http://127.0.0.1:9001'
}

var socket

//SOUNDS//
const callSound = () =>{
  let sound = new Howl({
    volume: 0.7,
  src: ['/sounds/getting-call.mp3']
});
sound.play();
}
const joinedSound = () =>{
  let sound = new Howl({
    volume: 0.7,
  src: ['/sounds/joined-call.mp3']
});
sound.play();
}
const callingSound = () =>{
  let sound = new Howl({
    volume: 0.7,
  src: ['/sounds/calling-in.mp3']
});
sound.play();
}
const becomeModSound = () =>{
  let sound = new Howl({
    volume: 0.7,
  src: ['/sounds/become-mod.mp3']
});
sound.play();
}
//------//

var categories = {
  people: {
    title: 'People',
    emoji: 'smile'
  },
  nature: {
    title: 'Nature',
    emoji: 'mouse'
  },
  food: {
    title: 'Food & Drink',
    emoji: 'burger'
  }
}

@observer
export default class Room extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      initScrolling: true,
      roomName: '',
      roomID: '',
      value: 1,
      slots: [
        {available: true, name: 'vid1', stream: '', loading: false},
        {available: true, name: 'vid2', stream: '', loading: false},
        {available: true, name: 'vid3', stream: '', loading: false},
        {available: true, name: 'vid4', stream: '', loading: false}
      ],
      viewer: true,
      callers: [],
      source: '',
      videos:{
        vid1:{source: null, username: '', avatar: '', isLocal: false, yams: 0, muted: false, perms: 'C'},
        vid2:{source: null, username: '', avatar: '', isLocal: false, yams: 0, muted: false, perms: 'C'},
        vid3:{source: null, username: '', avatar: '', isLocal: false, yams: 0, muted: false, perms: 'C'},
        vid4:{source: null, username: '', avatar: '', isLocal: false, yams: 0, muted: false, perms: 'C'}
      },
      testID: '',
      messages:[],
      scrolling: false,
      scrollvalues: {top: false},
      messageText: '',
      callers: [],
      numCallers: 0,
      isMod: false,
      viewers: {viewers:[], total: 1},
      isLogged: false,
      token: '',
      isHost: false,
      loading_room: true,
      exists: true
    }
  }

  componentWillMount(){
    if(localStorage.token){
      this.setState({isLogged: true})
      this.props.store.token = JWT(localStorage.token)
      this.setState({token: this.props.store.token})
      var url = window.location.pathname.replace('/room/', '')
      var roomID
      var roomName
      for(var i = 0; i < url.length; i++){
        if(url.charAt(i)=='/'){
          roomID = url.substring(0, i)
          //roomName = url.substring(i+1)
        }
      }
      // if(this.props.store.initiated_session){
      //   this.setState({
      //     loading_room: false,
      //     roomName: roomName,
      //     roomID: roomID
      //   })
      // }
      //if (!this.props.store.initiated_session){
        axios.get(DOMAIN_URL+'/get-room-info/'+roomID)
        .then((res)=>{
          if(res.data){
            this.props.store.token.roomName = res.data.name
            this.props.store.token.roomID = roomID
            console.log('I GOT THIS ROOM ID', roomID)
            this.setState({loading_room: false, roomName: res.data.name, roomID: res.data.roomID})
            this.onConnection()
          }
          else{
            this.setState({exists: false, loading_room: false})
          }
        }).catch(err=>console.log(err))
      //}

    }
    else{
      window.location.href = '/login'
    }
  }

  componentDidMount(){
    //this.setState({loading_room: false})
    if(!this.state.loading_room){
      this.onConnection()
    }

  }

  componentWillUnmount(){

    if(connection.attachStreams[0]){
      var localStream = connection.attachStreams[0];
      if (localStream){
        localStream.stop()
        // vid.pause()
        // vid.src = ''
      }
    }
    connection.getAllParticipants().forEach(function(participantId) {
       connection.disconnectWith(participantId);
    })

  }

  onConnection = () =>{
    if(!this.props.store.initiated_session){
      //this.props.match.params.id
      connection.socketMessageEvent = 'yamochat.im';
      connection.dontCaptureUserMedia = true//this.state.viewer
      this.props.store.token.roomName = this.state.roomName
      this.props.store.token.roomID = this.state.roomID
      //var new_token = this.props.store.token
      this.props.store.perms.letter = 'C'
      console.log('BEFORE I JOIN: ', this.props.store.token.roomID)
      connection.join(this.props.store.token.roomID, null, this.props.store.token)
    }
    if(this.props.store.initiated_session){
      this.setState({isHost: true})
      this.props.store.perms.letter = 'H'
      //let url = window.location.pathname
      //let room = url.replace('/room/', '')
      this.setState({isMod: true})
      this.props.store.token.roomName = this.state.roomName
      this.props.store.token.roomID = this.state.roomID
      this.props.store.initiated_session = false
      connection.socketMessageEvent = 'yamochat.im';
      connection.dontCaptureUserMedia = false
      //var new_token = this.props.store.token
      console.log('BEFORE I Host: ', this.props.store.token.roomID)

      connection.open(this.props.store.token.roomID, true, this.props.store.token)
    }
    socket = connection.getSocket()
    this.setState({id: socket.id})
    socket.on('events-on-me', ((msg)=>{console.log(msg)}))
    socket.on('recon', ((msg)=>{console.log(msg)}))
    socket.on('re-host', ((msg)=>{console.log(msg)}))

    socket.on('answered', ((msg)=>{this.join()}))


    // ......................................................
    // ..................RTCMultiConnection Code.............
    // ......................................................

    connection.session = {
        audio: true,
        video: true
    };
    // connection.mediaConstraints = {
    //   audio: true,
    //   video: {
    //   mandatory: {
    //     //echoCancellation: false, // disabling audio processing
    //     //googAutoGainControl: true,
    //     //googNoiseSuppression: true,
    //     //googHighpassFilter: true,
    //     //googTypingNoiseDetection: true,
    //     minWidth: 1280,
    //     maxWidth: 1280,
    //     minHeight: 720,
    //     maxHeight: 720,
    //     minAspectRatio: 1.77,
    //     minFrameRate: 3,
    //     maxFrameRate: 60
    //   },
    //   optional: []
    // }
    // }
    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
    };

    connection.onstream = (event) => {


      var vidSrc
      var connectNum
        for (var i = 0; i < this.state.slots.length; i++){
          if (this.state.slots[i].available != false){
            connectNum = i
            let video_s = this.state.videos
            video_s['vid'+(i+1)].source = 'http://i.imgur.com/igsVdgT.gif'
            var slot = this.state.slots[i]
            var tempSlots = this.state.slots
            //slot.available = false
            slot.stream = event.streamid
            slot.loading = true
            //slots[i] = slot
            tempSlots[i] = slot
            this.setState({
              slots: tempSlots,
              videos: video_s
            })
            connection.videosContainer = document.getElementById(slot.name);
            break
          }
        }

        //var width = parseInt(connection.videosContainer.clientWidth);
        //var height = parseInt(connection.videosContainer.clientHeight)
        var mediaElement = getMediaElement(event.mediaElement, {
            title: event.userid,
            showOnMouseEnter: false,
        });
        var vidHtml = document.createElement('video')
        var newHtml = mediaElement.getElementsByClassName('media-box')[0]
        //console.log(event)
        var tempVideos = this.state.videos
        //srcSlots.source = event.blobURL
        if(event.type === 'local'){
          tempVideos['vid'+(connectNum+1)].avatar = this.props.store.token.avatar
          tempVideos['vid'+(connectNum+1)].username = this.props.store.token.username
          tempVideos['vid'+(connectNum+1)].isLocal = true
        }
        else if(event.type === 'remote'){
          socket.emit('get-user-info', {vid: ('vid'+(connectNum+1)) ,id: event.userid}, this.props.store.token)
        }
        tempVideos['vid'+(connectNum+1)].source = event.blobURL
        tempVideos['vid'+(connectNum+1)].id = event.userid
        this.setState({videos: tempVideos})
        //connection.videosContainer.appendChild(newHtml);

        //console.log(mediaElement.getElementsByTagName("video").item(0).src)
        //var mySrc = [mediaElement.getElementsByTagName("video").item(0).src.replace('blob:', '')]
        var tempSlot = this.state.slots
        tempSlot[connectNum].available = false
        tempSlot[connectNum].loading = false
        this.setState({slots: tempSlots})
        setTimeout(function() {
            mediaElement.media.play();
        }, 5000);
        mediaElement.id = event.streamid;
    };
    connection.onstreamended = (event) => {

      var slots = this.state.slots
      var vid = connection.videosContainer
      for(var i = 0; i < slots.length; i++){
        if (slots[i].stream == event.streamid){
          slots[i].available = true
          var tempSrc = this.state.videos
          tempSrc['vid'+(i+1)].source = ''
          tempSrc['vid'+(i+1)].yams = 0
          tempSrc['vid'+(i+1)].perms = ''
          tempSrc['vid'+(i+1)].username = ''
          this.setState({slots: slots, videos: tempSrc})
          break
        }
      }
    }
    // ............................. //
    // ...........SOCKETS........... //

    socket.on('call-answered', ()=>{
      connection.getAllParticipants().forEach(function(participantId) {
	       connection.disconnectWith(participantId);
      })
      this.setState({viewer: false})
      connection.dontCaptureUserMedia = false
      setTimeout(() =>{
        let toke = this.props.store.token
        toke['caller'] = true
        connection.join(this.state.roomID, null, toke) //hmm seems to work
      }, 2000);
    })
    socket.on('re-host', (msg)=>{
      connection.dontCaptureUserMedia = false
      setTimeout(() =>{
        let toke = this.props.store.token
        toke['caller'] = true
        connection.open(this.state.roomID, true, this.props.store.token)
      }, 2000);
    })

    socket.on('chat', (msg)=>{
      var dust = this.state.messages
      var new_text = emojify(msg.text, {style:{height: '20px', width: '20px'}})
      var bgColor = 'white'
      if(msg.text.includes('@'+this.props.store.token.username)){
        bgColor = '#f2f2ac'
      }
      dust.push(
        <Comment key={this.state.messages.length + 1} style={{paddingTop: '5px', paddingBottom: '5px',paddingLeft: '20px', paddingRight: '20px', backgroundColor: bgColor}}>
          <Comment.Avatar as='a' src={msg.avatar} onClick={() => this.modalHandler(msg.username)} />
        <Comment.Content>
          <Comment.Author value={msg.username} onClick={() => this.modalHandler(msg.username)} as='a'>{msg.username}</Comment.Author>
          <Comment.Text>
            {new_text}
          </Comment.Text>
          <Comment.Actions>
            <Comment.Action onClick={() => this.setState({messageText: this.state.messageText+'@'+msg.username})}>Reply</Comment.Action>
          </Comment.Actions>
        </Comment.Content>
        </Comment>
      )

      this.setState({messages: dust})
    })
    socket.on('updated-callers', cl=>{
      var callers = this.state.callers
      if(cl.init != this.props.store.token.username){
        var tempUser
        tempUser = cl.username
        for(var i = 0; i < callers.length; i++){
          if(callers[i].username == tempUser){
            callers.splice(i, 1)
          }
        }
        this.setState({numCallers: callers.length, callers: callers})
      }
    })
    socket.on('callers', (usr)=>{
      var callers = this.state.callers
        var checker = false
        callSound()

        for(var i = 0; i < callers.length; i++){
          if(callers[i].username == usr.username){
            checker = true
          }
        }
        if(!checker){
          callers.push(usr)
        }

      this.setState({numCallers: callers.length, callers: callers})
    })
    socket.on('hungup-on', ()=>{
      this.onKick()
    })
    socket.on('user-info', (info)=>{
      var vid
      //for(var i = 0; i < 4;)
      var srcs = this.state.videos
      srcs[info.vid].username = info.username
      srcs[info.vid].avatar = info.avatar
      srcs[info.vid].yams = info.yams
      srcs[info.vid].perms = 'C'
      if(info.mod){
        srcs[info.vid].perms = 'M'
      }
      if(info.host){
        srcs[info.vid].perms = 'H'
      }

      this.setState({videos: srcs})
    })

    socket.on('viewers', obj=>{
      let users = []
      let avatars = []
      for(var i = 0; i < obj.viewers.length; i++){
        users[i] = obj.viewers[i].username
        avatars[i] = obj.viewers[i].avatar
      }
      users = arrayUniq(users)
      avatars = arrayUniq(avatars)
      let views = []
      for(var i = 0; i < users.length; i++){
        views[i] = {
          username: users[i],
          avatar: avatars[i]
        }
      }
      obj.viewers = views
      //var views = arrayUniq(obj.viewers)

      this.setState({viewers: obj})
    })

    socket.on('modded', ()=>{
      this.setState({isMod: true})
    })

    socket.on('demodded', ()=>{
      this.setState({isMod: false})
    })

    socket.on('global', (msg)=>{
      let msgs = this.state.messages

      msgs.push(
        <span style={{padding: '10px', textAlign: 'center',color: 'gray'}}><p><em>{msg}</em></p></span>
      )
      this.setState({messages: msgs})
    })
    socket.on('get-yams', (y)=>{
      console.log('yam RECIEVED')
      for(var i = 0; i < 4; i++){
        if(this.state.videos['vid'+(i+1)].username == y.username && this.state.videos['vid'+(i+1)].source){
          var tempVids = this.state.videos
          tempVids['vid'+(i+1)].yams = y.yams
          this.addYam('vid'+(i+1))
          this.setState({videos: tempVids})
          console.log(y.username, ' has ', y.yams, ' yams')
          break
        }
      }
    })

    socket.on('reconfigure-host', (id)=>{
      if(id != this.state.id){
        connection.getAllParticipants().forEach(function(participantId) {
           connection.disconnectWith(participantId);
        })
        this.setState({viewer: true})
        connection.dontCaptureUserMedia = true
        setTimeout(() =>{
          connection.join(this.state.roomID, null, this.props.store.token) //hmm seems to work
        }, 1100);
      }
    })

  }


  camDown = () =>{

    var localStream = connection.attachStreams[0];
    localStream.stop()
  }
  joinCall = () =>{
    connection.dontCaptureUserMedia = false
    //this.setState({viewer: false})
    setTimeout(() =>{
        //mediaElement.media.play();
        connection.open(this.state.roomID, true, this.props.store.token) //hmm seems to work

    }, 2000);
    connection.getUserMedia
    //this.onConnection()
  }

  call = () =>{

    if(this.state.isHost){
      connection.dontCaptureUserMedia = false
      connection.open(this.state.roomID, true, this.props.store.token)
      socket.emit('reload', this.props.store.token)
    }
    else if(this.state.isMod){
      this.join()
    }
    else{
      socket.emit('calling', this.props.store.token)
      callingSound()
    }
  }

  join = () =>{
    connection.getAllParticipants().forEach(function(participantId) {
       connection.disconnectWith(participantId);
    })
    this.setState({viewer: false})
    connection.dontCaptureUserMedia = false
    setTimeout(() =>{
      let toke = this.props.store.token
      toke['caller'] = true
        connection.join(this.state.roomID, null, toke) //hmm seems to work
        //setTimeout(joinedSound(), 1000)
    }, 1100);
  }

  callSocket = () =>{
    socket.emit('calling', this.props.store.token)
  }


  scrollHandler = () =>{
    if ((!this.state.scrolling && this.state.scrollvalues.top == 1) || this.state.initScrolling){
      this.refs.scrollbars.scrollToBottom()
      //console.log('SCROLLING, ', this.state.scrolling, 'valuess: ', this.state.scrollvalues)
      this.setState({initScrolling: false, scrolling: false, scrollvalues: {top: 1}})
    }
  }

  scrollStart = (e) =>{
    this.setState({scrolling: true})
  }

  scrollStop = (e) =>{
    this.setState({scrolling: false})

  }
  scrollFrame = (value) =>{
    //console.log(value)
    this.setState({scrollvalues: value})
  }

  messageHandler = (e) =>{
    this.setState({messageText: e.target.value})
  }
  enterKey = (e) =>{
    if(e.key == 'Enter'){
      this.submitMessage()
    }
  }
  submitMessage = () =>{
    var token = this.props.store.token
    var msg = {}
    msg['text'] = this.state.messageText
    msg['avatar'] = token.avatar
    msg['username'] = token.username
    //msg['avatar'] = token.avatar
    token['msg'] = msg
    this.setState({messageText: ''})
    if (token.msg.text != ''){
      socket.emit('message', token)
    }
  }

  accept = (index) =>{
    //console.log('You accepted: ', this.state.callers[index].username)
    socket.emit('accept-call', this.props.store.token, this.state.callers[index])
    var tempArr = this.state.callers
    var num = tempArr.length
    tempArr.splice(index, 1)

    for (var i = 0; i < this.state.slots.length; i++){
      if (this.state.slots[i].available != false){
        let video_s = this.state.videos
        video_s['vid'+(i+1)].source = 'http://i.imgur.com/CHoA2za.gif'
        this.setState({
          videos: video_s
        })
        break
      }
    }
    //socket.emit('update-calling', this.props.store.token,{init: this.props.store.token.username, username: ('del+'+this.state.callers[index].username)})
    this.setState({callers: tempArr, numCallers: tempArr.length})
  }

  decline = (index) =>{
    var tempArr = this.state.callers
    var num = tempArr.length
    socket.emit('update-calling', this.props.store.token, {init: this.props.store.token.username, username: this.state.callers[index].username})
    tempArr.splice(index, 1)
    this.setState({callers: tempArr, numCallers: num-1})
  }

  onKick = () =>{
    if(!this.state.isHost){
      var localStream = connection.attachStreams[0];
      localStream.stop()
    }

  }

  kick = (vid) =>{
    var srcs = this.state.videos
    socket.emit('hangup', this.props.store.token, {id: srcs[vid].id, username: srcs[vid].username})
  }

  stepDown = () =>{
    this.onKick()
  }

  emoji = (e) =>{
    var msg = this.state.messageText+e.shortname
    this.setState({messageText: msg})
    //console.log('this is emoji ', e)
  }

  modalHandler = (usr) =>{
    this.props.store.modal.loading = true
    this.props.store.modal.open = true

    axios.get(DOMAIN_URL+'/get-user/'+usr)
    .then((res)=>{
      this.props.store.modal.username = res.data.username
       var img = res.data.avatar

      if(res.data.avatar.includes('_normal')){img = res.data.avatar.replace('_normal', '')}
      if(res.data.avatar.includes('_bigger')){img = res.data.avatar.replace('_bigger', '')}
      if(res.data.avatar.includes('_mini')){img = res.data.avatar.replace('_mini', '')}

      this.props.store.modal.avatar = img

      this.props.store.modal.description = res.data.description
      this.props.store.modal.name = res.data.name
      axios.get(DOMAIN_URL+'/get-room-info/'+this.state.roomID)
      .then((des)=>{
        for (var i = 0; i < des.data.mods.length; i++){
          if(des.data.mods[i].username == usr){
            this.props.store.modal.loading = false
            this.props.store.perms.icon = 'minus'
            this.props.store.perms.letter = 'M'
            this.props.store.perms.status = 'Mod'
            this.props.store.perms.color = 'red'
          }
          else{
            this.props.store.modal.loading = false
            this.props.store.perms.icon = 'plus'
            this.props.store.perms.letter = 'C'
            this.props.store.perms.status = 'Viewer'
            this.props.store.perms.color = 'green'
          }
        }

      })
      .catch(err=>{console.log(err)})

    })
    .catch(err=>{console.log(err)})
  }
  closeModal = () =>{
    this.props.store.modal.open = false
  }

  giveMod = () =>{
    if (this.state.isMod){
      if(this.props.store.perms.icon == 'plus'){
        this.props.store.perms.icon = 'minus'
        this.props.store.perms.color = 'red'
        socket.emit('give-mod', this.props.store.token, this.props.store.modal.username)
      }
      else{
        this.props.store.perms.icon = 'plus'
        this.props.store.perms.color = 'green'
        socket.emit('remove-mod', this.props.store.token, this.props.store.modal.username)
      }
    }
  }

  addYam = (vid) =>{

      var b = Math.floor((Math.random() * 100) + 1)
      var d = ["flowOne", "flowTwo", "flowThree"]
      var a = ["colOne", "colTwo", "colThree", "colFour", "colFive", "colSix"]
      var c = (Math.random() * (1.6 - 1.2) + 1.2).toFixed(1)
      $('<div class="yam part-' + b + " " + a[Math.floor((Math.random() * 6))] + '" style="font-size:' + Math.floor(Math.random() * (20 - 11) + 11) + 'px;">🍠</div>').appendTo('.'+vid).css({
          animation: "" + d[Math.floor((Math.random() * 3))] + " " + c + "s linear"
      })
      $(".part-" + b).show()
      setTimeout(function() {
          $(".part-" + b).remove()
      }, c * 900)
  }

  giveYam = (vid) =>{
    if(this.state.videos[vid].source && !this.state.videos[vid].isLocal){
      console.log('IM GETTING CLICKED HERE')
      socket.emit('give-yam', this.props.store.token, {username: this.state.videos[vid].username})
    }
  }
  mute = (vid) =>{
    if(this.state.videos[vid].muted){
      var tempVideo = this.state.videos
      tempVideo[vid].muted = false
    }
    else{
      var tempVideo = this.state.videos
      tempVideo[vid].muted = true
    }

  }
  render(){
    //const isLoading = this.props.store.profileLoading

    return(
        (!this.state.isLogged) ? (null):
        (
          <div className='RoomContainer'>
            <Modal
              open={this.state.loading_room}
              basic
              >
              <Modal.Content>
                <div style={{margin: '0 auto', width: '100px', top: '50%', transform:'translateY(-50%)', position:'relative'}}>
                  <MDSpinner size={150} />
                </div>
              </Modal.Content>
            </Modal>
            <Modal
              open={!this.state.exists}
              basic
              size='small'
              >
              <Header icon='warning sign' color='yellow' content='Room Alert' />
              <Modal.Content>
                <h3>The room doesn't exist or the Host recently closed the room!</h3>
                <h3>Click here to go back <Icon link name='home' size='big' onClick={()=>window.location.replace('/')}/></h3>
              </Modal.Content>
            </Modal>
            <Modal size='small' open={this.props.store.modal.open}
              onClose={this.closeModal}
              >
              {
                this.props.store.modal.loading ? (
                  <Modal.Content>
                    <div style={{margin: '0 auto', textAlign:'center'}}>
                      <Halogen.ScaleLoader color='#4DAF7C'/>
                    </div>
                  </Modal.Content>
                ):
                (
                  <Modal.Content image>
                  <Image wrapped size='medium' src={this.props.store.modal.avatar} />
                  <Modal.Description>
                    <Header>{this.props.store.modal.name+' '}<Icon link name='twitter' onClick={event => window.loaction.replace('https://twitter.com/'+this.props.store.modal.username)} /></Header>
                    <p>{this.props.store.modal.description}</p>
                     <Divider horizontal/>

                     {
                       this.state.isMod ? (
                         <Button
                          onClick={this.giveMod}
                          basic
                          color={this.props.store.perms.color}
                          content='Mod'
                          icon={this.props.store.perms.icon}
                          label={{ as: 'a', basic: true, color: this.props.store.perms.color, pointing: 'left', content: 'M' }}
                        />
                       ):
                       (
                         <Label
                           basic
                           color='blue'
                           content={this.props.store.perms.status}
                          />
                       )
                     }
                  </Modal.Description>
                </Modal.Content>
              )
            }
            </Modal>
            <div id='appbar' className='RoomRow'>
              <div className='RoomSingle'>
              <Menu style={{backgroundColor: 'white'}} secondary attached='top'>
                <Menu.Item onClick={event => window.location.replace('/')}>
                  <Icon name='home' size='big'/>
                </Menu.Item>
                <Menu.Item header>
                  <h1>{this.state.roomName}</h1>
                </Menu.Item>
                <Menu.Menu position = 'right'>
                  <Menu.Item>
                    <div>
                    <Label as='a' color='blue' image>
                      <img src={this.props.store.token.avatar} />
                        {this.props.store.token.username}
                        <Label.Detail>Alpha Tester 💉</Label.Detail>
                    </Label>
                    </div>
                  </Menu.Item>
                  <Menu.Item>
                    <Popup
                      trigger={<Button
                        style={{maxHeight: '30%', overflowY: 'auto'}}
                        icon='eye'
                        label={{ as: 'a', basic: true, content: this.state.viewers.total }}
                        labelPosition='left'
                      />}
                      on='click'
                      inverted
                    >
                    <Scrollbars style={{ width: "25vh", height: "30vh" }}>
                      <Grid padded={false} columns={1}>
                      {
                        this.state.viewers.viewers.map((obj,i) =>

                        <Grid.Row key={i}>
                          <Grid.Column onClick={() => this.modalHandler(obj.username)}>
                            <Image src={obj.avatar} avatar /> <a href='#'><span style={{color: 'white'}}>{' '+obj.username}</span></a>
                          </Grid.Column>
                        </Grid.Row>
                        )
                      }
                    </Grid>
                  </Scrollbars>
                    </Popup>

                  </Menu.Item>
                </Menu.Menu>
              </Menu>
              </div>
            </div>
            <div id='RoomMainContainer' className='RoomRow'>
              <div className='RoomSingle'>
                <div className='RoomFlexContainer'>
                <div className='VideoContainer'>
                  <div className='VideoTopContainer'>
                    <div className='VidSplit'>
                      <div className='vid1' onClick={() => this.giveYam('vid1')}>
                        {
                          this.state.videos.vid1.source ?
                          ( <div style={{height: '100%', width: '100%'}}>
                            <div className='vid_inner_top_controls'>
                              <div className='vid_left_inner'>
                              <Label as='a' color='blue' image>
                                <img src={this.state.videos.vid1.avatar} />
                                  {this.state.videos.vid1.username}
                                  <Label.Detail>{this.state.videos.vid1.perms}</Label.Detail>
                              </Label>
                            </div>
                            {
                              this.state.videos.vid1.isLocal ? (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.stepDown()}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>

                              ): (this.state.isMod && !this.state.videos.vid1.isLocal) ?
                              (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.kick('vid1')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (null)
                            }
                            </div>
                            <div className='vid_inner_bottom'>
                              <div style={{width: '100%'}}>
                                <div style={{float: 'left'}}>
                                  <span style={{fontSize: 25}}>🍠<span style={{color: 'white'}}>{this.state.videos.vid1.yams}</span></span>
                                </div>
                                <div style={{float:'right'}}>
                                  {
                                    this.state.videos.vid1.muted ? (
                                      <Icon inverted color='teal' size='large' link name='microphone slash' onClick={()=>this.mute('vid1')}/>
                                    ):
                                    (
                                      <Icon inverted color='teal' size='large' link name='microphone' onClick={()=>this.mute('vid1')}/>
                                    )
                                  }
                                </div>
                              </div>

                            </div>
                          </div>
                          ):
                          (
                            <div className='vid_center_inner'>
                              <Button primary onClick={this.call}>Call</Button>
                            </div>
                          )
                        }
                          <video
                            poster={this.state.videos.vid1.source}
                            onCanPlay={this.joinedSound}
                            muted
                            autoPlay
                            src={this.state.videos.vid1.source}
                          />
                      </div>
                      </div>
                    <div className='VidSplit'>
                      <div className='vid2' onClick={() => this.giveYam('vid2')}>
                        {
                          this.state.videos.vid2.source ?
                          ( <div style={{height: '100%', width: '100%'}}>
                            <div className='vid_inner_top_controls'>
                              <div className='vid_left_inner'>
                              <Label as='a' color='blue' image>
                                <img src={this.state.videos.vid2.avatar} />
                                  {this.state.videos.vid2.username}
                                  <Label.Detail>{this.state.videos.vid2.perms}</Label.Detail>
                              </Label>
                            </div>
                            {
                              this.state.videos.vid2.isLocal ? (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.stepDown('vid2')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (this.state.isMod && !this.state.videos.vid2.isLocal) ?
                              (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.kick('vid2')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (null)
                            }
                            </div>
                            <div className='vid_inner_bottom'>
                              <div style={{width: '100%'}}>
                                <div style={{float: 'left'}}>
                                  <span style={{fontSize: 25}}>🍠<span style={{color: 'white'}}>{this.state.videos.vid2.yams}</span></span>
                                </div>
                                <div style={{float:'right'}}>
                                  {
                                    this.state.videos.vid2.muted ? (
                                      <Icon inverted color='teal' size='large' link name='microphone slash' onClick={()=>this.mute('vid2')}/>
                                    ):
                                    (
                                      <Icon inverted color='teal' size='large' link name='microphone' onClick={()=>this.mute('vid2')}/>
                                    )
                                  }
                                </div>
                              </div>
                            </div>

                            </div>
                          ):
                          (
                            <div className='vid_center_inner'>
                              <Button primary onClick={this.call}>Call</Button>
                            </div>
                          )
                        }
                          <video
                            poster={this.state.videos.vid2.source}
                            onCanPlay={event => joinedSound()}
                            muted
                            autoPlay
                            src={this.state.videos.vid2.source}
                          />
                      </div>
                      </div>
                    </div>
                  <div className='VideoBotContainer'>
                    <div className='VidSplit'>
                      <div className='vid3' onClick={() => this.giveYam('vid3')}>
                        {
                          this.state.videos.vid3.source ?
                          ( <div style={{height: '100%', width: '100%'}}>
                            <div className='vid_inner_top_controls'>
                              <div className='vid_left_inner'>
                              <Label as='a' color='blue' image>
                                <img src={this.state.videos.vid3.avatar} />
                                  {this.state.videos.vid3.username}
                                  <Label.Detail>{this.state.videos.vid3.perms}</Label.Detail>
                              </Label>
                            </div>
                            {
                              this.state.videos.vid3.isLocal ? (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.stepDown('vid3')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (this.state.isMod && !this.state.videos.vid3.isLocal) ?
                              (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.kick('vid3')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (null)
                            }
                            </div>
                            <div className='vid_inner_bottom'>
                              <div style={{width: '100%'}}>
                                <div style={{float: 'left'}}>
                                  <span style={{fontSize: 25}}>🍠<span style={{color: 'white'}}>{this.state.videos.vid3.yams}</span></span>
                                </div>
                                <div style={{float:'right'}}>
                                  {
                                    this.state.videos.vid3.muted ? (
                                      <Icon inverted color='teal' size='large' link name='microphone slash' onClick={()=>this.mute('vid3')}/>
                                    ):
                                    (
                                      <Icon inverted color='teal' size='large' link name='microphone' onClick={()=>this.mute('vid3')}/>
                                    )
                                  }
                                </div>
                              </div>
                            </div>
                            </div>
                          ):
                          (
                            <div className='vid_center_inner'>
                              <Button primary onClick={this.call}>Call</Button>
                            </div>
                          )
                        }
                          <video
                            poster={this.state.videos.vid3.source}
                            onCanPlay={event => joinedSound()}
                            muted
                            autoPlay
                            src={this.state.videos.vid3.source}
                          />
                      </div>
                      </div>
                    <div className='VidSplit'>
                      <div className='vid4' onClick={() => this.giveYam('vid4')}>
                        {
                          this.state.videos.vid4.source ?
                          ( <div style={{height: '100%', width: '100%'}}>
                            <div className='vid_inner_top_controls'>
                              <div className='vid_left_inner'>
                              <Label as='a' color='blue' image>
                                <img src={this.state.videos.vid4.avatar} />
                                  {this.state.videos.vid4.username}
                                  <Label.Detail>{this.state.videos.vid4.perms}</Label.Detail>
                              </Label>
                            </div>
                            {
                              this.state.videos.vid4.isLocal ? (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.stepDown('vid4')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (this.state.isMod && !this.state.videos.vid4.isLocal) ?
                              (
                                <div className='vid_right_inner'>
                                  <Button icon size='mini' compact color='red'
                                    onClick={event => this.kick('vid4')}
                                  >
                                    <Icon name='remove' size='large'/>
                                  </Button>
                                </div>
                              ): (null)
                            }
                            </div>
                            <div className='vid_inner_bottom'>
                              <div style={{width: '100%'}}>
                                <div style={{float: 'left'}}>
                                  <span style={{fontSize: 25}}>🍠<span style={{color: 'white'}}>{this.state.videos.vid4.yams}</span></span>
                                </div>
                                <div style={{float:'right'}}>
                                  {
                                    this.state.videos.vid4.muted ? (
                                      <Icon inverted color='teal' size='large' link name='microphone slash' onClick={()=>this.mute('vid4')}/>
                                    ):
                                    (
                                      <Icon inverted color='teal' size='large' link name='microphone' onClick={()=>this.mute('vid4')}/>
                                    )
                                  }
                                </div>
                              </div>
                            </div>
                            </div>
                          ):
                          (
                            <div className='vid_center_inner'>
                              <Button primary onClick={this.call}>Call</Button>
                            </div>
                          )
                        }
                          <video
                            poster={this.state.videos.vid4.source}
                            onCanPlay={event => joinedSound()}
                            muted
                            autoPlay
                            src={this.state.videos.vid4.source}
                          />
                      </div>
                      </div>
                    </div>
                </div>
                <div className='ChatBox'>
                  <div id='MessageContainer' className='RoomChatRow'>
                    <Scrollbars
                      style={{height: '100%'}}
                      ref='scrollbars'
                      onUpdate={this.scrollHandler}
                      onScrollStart={this.scrollStart}
                      onScrollStop={this.scrollStop}
                      onScrollFrame={this.scrollFrame}
                    >
                      <Comment.Group>
                        {this.state.messages}
                      </Comment.Group>
                    </Scrollbars>
                  </div>
                  <div id='ChatInput' className='RoomChatRow'>
                    <div style={{with: '90%', margin: '0 auto', overflow: 'auto'}}>
                      <Input
                        placeholder='Message Room...'
                        onChange={this.messageHandler}
                        size='large'
                        value={this.state.messageText}
                        onKeyPress={this.enterKey}
                        icon={
                          <Popup
                            trigger={<Icon name='smile' circular link/>}
                            on='click'
                          >
                          <EmojiPicker search={true} onChange={this.emoji} />
                          </Popup>
                        }
                      />
                    <Button icon onClick={this.submitMessage}><Icon name='send'/></Button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div id='footer' className='RoomRow'>
            <div className='RoomSingle'>
              {
                this.state.isMod ?(
                  <Menu attached>
                    <Menu.Item>
                    <Popup
                      style={{maxHeight: '40%', overflowY: 'auto'}}
                      wide
                      inverted
                      trigger = {(<div><Button
                        content='Callers'
                        icon='call'
                        label={{ as: 'a', basic: true, pointing: 'left', content: this.state.numCallers }}
                        labelPosition='right'
                      />
                    {
                      (this.state.numCallers != 0) ? (
                        <Label color='red' floating>!</Label>
                      ):(null)}
                    </div>
                    )}
                      on='click'
                    >
                    <div className='thisThingy' style={{width: '40%'}}>
                      <Grid divided columns={1}>
                        {
                          this.state.callers.map((obj,i) =>
                            <Grid.Row key={i}>
                              <Grid.Column>
                                <div style={{display:'flex'}}>
                                <h4 style={{verticalAlign: 'middle'}}>{obj.username}</h4>
                                <Button compact basic onClick={event => this.accept(i)}><Icon size='large' color='green' name='check' /></Button>
                                <Button compact basic onClick={event => this.decline(i)}><Icon size='large' color='red' name='x' /></Button>
                                </div>
                              </Grid.Column>
                            </Grid.Row>
                          )
                        }
                      </Grid>
                    </div>
                  </Popup>
                  </Menu.Item>
                </Menu>
              ): (
                  <Menu>
                    <Menu.Item>
                      <Button icon><Icon name='warning sign'/></Button>
                    </Menu.Item>
                  </Menu>
                )
              }
            </div>
          </div>
        </div>
      )
    )
  }
}
