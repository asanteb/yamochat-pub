import React from 'react'

import {BrowserRouter as Router, Route, Link, NavLink, Redirect} from 'react-router-dom'

import { Input, Menu, Comment, Dimmer, Loader, Button, Grid, Divider, Header, Label, Icon, Image, Popup, Card, Statistic, Modal, Form, Message } from 'semantic-ui-react'
import {observer} from 'mobx-react'
import isURI from 'validate.io-uri'
import axios from 'axios'
import EmojiPicker from 'emojione-picker'
import emojis from 'emojis-list'
import emojiKey from 'emojis-keywords'
import isEmoji from 'is-standard-emoji'

//import cookie from 'react-cookie'
import Cookies from 'universal-cookie';
const cookie = new Cookies()
import jwt from 'jwt-simple'
import JWT from 'jwt-decode'
import shortid from 'shortid'

import Dropzone from 'react-dropzone'
import superagent from 'superagent'

var dev_mode = false
var DOMAIN_URL = 'https://yamochat.im'
if(dev_mode){
  DOMAIN_URL = 'http://127.0.0.1:9001'
}

@observer
export default class Home extends React.Component {

  constructor(props) {
    super(props)

    this.state = {

      roomName: '',
      roomLink: '',
      ready: false,
      featured: ["Jerry's Fun House", "Spooky Haunted Bums", "Autistic Mafia"],
      rooms: [],
      isLogged: false,
      index: 0,
      randoText: 'insanity',
      openM: false,
      invalid: false,
      userRoomName: '',
      userDescription: '',
      roomReady: false,
      roomImage: []
    }
  }


  componentWillMount(){

    if(localStorage.token){
      this.setState({isLogged: true})
      this.props.store.token = JWT(localStorage.token)

      var img = this.props.store.token.avatar

      if(this.props.store.token.avatar.includes('_normal')){img = this.props.store.token.avatar.replace('_normal', '')}
      if(this.props.store.token.avatar.includes('_bigger')){img = this.props.store.token.avatar.replace('_bigger', '')}
      if(this.props.store.token.avatar.includes('_mini')){img = this.props.store.token.avatar.replace('_mini', '')}

      this.props.store.token.avatar = img

      this.updateRooms()
      this.timerID = setInterval(
        ()=> this.updateRooms(), 5000
      )
    }
    else if(cookie.get('token')){
      localStorage.token = cookie.get('token')
      this.props.store.token = JWT(cookie.get('token'))

      var img = this.props.store.token.avatar

      if(this.props.store.token.avatar.includes('_normal')){img = this.props.store.token.avatar.replace('_normal', '')}
      if(this.props.store.token.avatar.includes('_bigger')){img = this.props.store.token.avatar.replace('_bigger', '')}
      if(this.props.store.token.avatar.includes('_mini')){img = this.props.store.token.avatar.replace('_mini', '')}

      this.props.store.token.avatar = img

      this.setState({isLogged: true})
      this.updateRooms()
      this.timerID = setInterval(
        ()=> this.updateRooms(), 5000
      )
    }
    else{
      this.setState({isLogged: false})
    }
  }

  componentWillUnmount(){
    clearInterval(this.timerID)
  }

  roomTitleHandler = (e) =>{
    var text = e.target.value
    this.setState({roomName: text})
  }

  createRoom = () =>{
    let roomID = shortid.generate()
    let room_name = this.state.userRoomName
    let room_link = '/room/'+roomID+'/'+room_name
    var token_obj = this.props.store.token
    this.setState({roomLink:room_link})
    token_obj['roomID'] = roomID
    token_obj['roomName'] = room_name

    var secret = 'not so secret'
    this.props.store.roomName = room_name
    this.props.store.roomID = roomID
    this.props.store.initiated_session = true

    superagent.post(DOMAIN_URL+'/upload-room-image')
    .attach('theseNamesMustMatch', this.state.roomImage[0])
    .end((err, res)=>{
      if(err) console.log(err)
      console.log(res)
      var data = JSON.parse(res.text)
      if (JSON.parse(data.success)){
        token_obj['room_image'] = data.image_url
        var token = jwt.encode(token_obj, secret)

        axios.post(DOMAIN_URL+'/create-room/'+ token)
        .then((res)=>{
          if(res.data.message == 'SUCCESS'){
            this.setState({roomLink: room_link, roomReady: true})
          }
          else{
            console.log('FAILED TO CREATE ROOM')
          }
        })
        .catch((err)=>{
          console.log(err)
        })
      }
      //console.log('File Uploaded')
    })


  }

  updateRooms = () =>{
    axios.get(DOMAIN_URL+'/rooms')
    .then((res)=>{
      this.setState({rooms: res.data})
      //console.log(res.data)
    })
    .catch((err)=>{
      console.log(err)
    })
  }

  roomNameHandler = (e) =>{
      if(isURI('https://yamochat.im/room/'+e.target.value.charAt(e.target.value.length-1))){
        this.setState({invalid: false, userRoomName: e.target.value})
      }
      else{
        this.setState({invalid: true})
      }
  }

  descriptionHandler = e =>{this.setState({userDescription: e.target.value})}

  handleEnter = (e) =>{
    if(e.key == 'Enter'){
      this.createRoom()
    }
  }

  open = () =>{
    this.setState({openM: true})
  }

  roomPhoto = () =>{
    //console.log(e.target.value)
      var selected = document.getElementById('room-photo').files
      console.log(selected)
  }

  onDrop = (files) =>{
    this.setState({roomImage: files})
  }

  emoji = (e) =>{
    for (var i = 0; i < emojiKey.length; i++){
      if(e.shortname == emojiKey[i]){
        var msg = this.state.userRoomName+emojis[i]
        this.setState({userRoomName: msg})
        break
      }
    }
    //console.log('this is emoji ', e)
  }

  render() {

      function color(num){
      if (num%2 == 0){
        return 'teal'
      }
      else{
        return 'blue'
      }
    }

    const Friends = (
      <a>
        <Icon name='user'/>
        0 Friends
      </a>
    )

    return (

        this.state.isLogged ? (
          <div className='Home'>
            <Modal
              open={this.state.openM}
              onClose={()=>this.setState({openM: false})}
              basic size='small'>
              <Header icon='archive' content='Archive Old Messages' />
              <Modal.Content>
                <div style={{margin: '0 auto'}}>
                  <Input placeholder='Room Name' name='roomName' value={this.state.userRoomName} onChange={this.roomNameHandler} error={this.state.invalid}/>
                    <Popup
                      trigger={<a href='#' ><span style={{fontSize: 28}}>😜</span></a>}
                      on='click'
                    >
                    <EmojiPicker search={true} onChange={this.emoji} />
                    </Popup>
                    <br/><br/>
                  <Input placeholder='Description' size='large' name='room description' value={this.state.userDescription} onChange={this.descriptionHandler} />
                  <br/><br/>
                  <Dropzone onDrop={this.onDrop} multiple={false}>
                  <div>Click or Drag to Upload image.</div>
                  <ul>
                    <div>{this.state.roomImage.map(f=><li>{f.name}</li>)}</div>
                  </ul>
                </Dropzone>
                <Message
                  hidden={!this.state.invalid}
                  error
                  header='Invalid Character in Room Name'
                  content="Use '_' instead of spaces for your room name"
                >
                </Message>
                </div>
              </Modal.Content>
              <Modal.Actions>
                <Button basic color='red' inverted onClick={()=>this.setState({openM:false})}>
                  <Icon name='remove' /> Cancel
                </Button>
                <Button color='green' inverted onClick={this.createRoom}>
                  <Icon name='checkmark' /> Submit
                </Button>
              </Modal.Actions>
            </Modal>
            <div className='HomeToolBar'>
              <Menu style={{backgroundColor: 'white'}} secondary attached='top'>
                <Menu.Item>
                  <Header as='h2' color='orange'>
                    <Image href='/' shape='circular' src='https://68.media.tumblr.com/c186caf5ca9404ab2acce4384d47edf6/tumblr_nilw4121R51t40wpbo1_500.gif'/>
                    yamochat.im
                  </Header>
                </Menu.Item>
              </Menu>
            </div>
            <div className='HomeBody'>
              <div className='HomeSideBar'>
                <Card>
                  <Image src={this.props.store.token.avatar}/>

                  <Card.Content>
                    <Card.Header>
                      {this.props.store.token.username}
                    </Card.Header>
                  </Card.Content>
                  <Card.Content extra>
                    <a>
                      <Icon name='user' />
                      0 Followers
                    </a>
                  </Card.Content>
                  <Card.Content extra>
                    <a>
                      <Icon name='eye'/>
                      0 Views
                    </a>
                  </Card.Content>
                </Card>
                <div style={{margin: '0 auto',width: '80%', textAlign: 'center'}}>
                  <Button fluid content='Create Room' color='green' icon='block layout' labelPosition='right' onClick={this.open}/>
                  <br/>
                  <Button fluid content='Broadcast' disabled color='blue' icon='video camera' labelPosition='right'/>
                </div>
                <br/>
                <div style={{textAlign: 'center'}}>
                <Statistic size='tiny'>
                  <Statistic.Label style={{fontSize: '150%', padding: '2px'}}>🍠</Statistic.Label>
                  <Statistic.Value>0</Statistic.Value>
                </Statistic>
                </div>
              </div>
              <div className='HomeMain'>
                <div className='Featured'>
                  <Header as='h1'>Featured</Header>
                  <Card.Group itemsPerRow={3}>
                    <Card link color='red'>
                      <Card.Content>
                        <Card.Header>
                          {this.state.featured[0]}
                        </Card.Header>
                      </Card.Content>
                      <Image size='small' style={{margin: '0 auto'}} src='https://s3-us-west-2.amazonaws.com/yamochat.im/avatar-e38b6b40-40b6-11e7-a8e8-dde55e933fbd.png'/>
                    </Card>
                    <Card link color='green'>
                      <Card.Content>
                        <Card.Header>
                          {this.state.featured[1]}
                        </Card.Header>
                      </Card.Content>
                      <Image src='https://placeholdit.imgix.net/~text?txtsize=33&txt=350%C3%97150&w=350&h=150'/>
                    </Card>
                    <Card link color='violet'>
                      <Card.Content>
                        <Card.Header>
                          {this.state.featured[2]}
                        </Card.Header>
                      </Card.Content>
                      <Image src='https://placeholdit.imgix.net/~text?txtsize=33&txt=350%C3%97150&w=350&h=150'/>
                    </Card>
                  </Card.Group>
                </div>
                <br/>
                <div className='AllRooms'>
                  <Header as='h2'>All Rooms</Header>
                    <Card.Group>
                      {
                        this.state.rooms.map((room, i)=>{
                          return(
                            <Card link onClick={()=>window.location.replace('/room/'+room.roomID+'/'+room.name)} key={i} color='red'>
                              <Card.Content>
                                <Card.Header>
                                  {room.name}
                                </Card.Header>
                              </Card.Content>
                              <Image color='teal' style={{height: 200, width: 350}} size='small' src={room.image} href={'/room/'+room.roomID+'/'+room.name}/>
                            </Card>
                          )
                        })
                      }
                    </Card.Group>
                </div>
              </div>
            {
              this.state.roomReady ? (
                <Redirect to={this.state.roomLink}/>
              ): (null)
            }
          </div>
        </div>
      ) :
      (
        <Redirect to="/login"/>
      )


    )
  }
}
