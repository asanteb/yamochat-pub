import { computed, autorun, observable, action } from "mobx"
import axios from 'axios'
import cookie from 'react-cookie'
import jwt from 'jwt-decode'

//var servers = [{id: '1', name: 'caca'},{id: '3', messages: myArray},{id: '2', name: 'cala'}]

var messageStore = []


class Message{
  @observable text
  @observable usr
  @observable date
}

class workstore {
  //Search
  @observable roomName = ''
  @observable search = ''
  @observable initiated_session = false
  //Profile
  @observable openProfile = false
  @observable profile = ''
  @observable profileLoading = true
  @observable linkSearch = null
  @observable token = null

  //{
  //   username: '',
  //   avatar: '',
  //   name: '',
  //   description: '',
  //   roomName: '',
  //   roomID: '',
  //   twitter_access_token: ''
  // }

  //slots
@observable slots: [
    {available: true, name: 'vid1'},
    {available: true, name: 'vid2'},
    {available: true, name: 'vid3'},
    {available: true, name: 'vid4'}
  ]

  //Comments
  @observable comments = [
    {
      avatar: '1',
      name: 'Yamoshoto',
      text: 'How are you I really love this profile. I hope the comments are working great'
    },
    {
      avatar: '1',
      Name: 'Jack',
      text: 'I just want to tell you how much I really hate you.'
    }
  ]

  //Notifications
  @observable numBadge = 0
  @observable notifications = []

  @observable worthButton = 908098

  @observable pass = ''
  @observable nick = ''
  @observable messages = [{room: null, content: null}]
  @observable toBottom = false

  @observable modal = {
    username: '',
    avatar: '',
    open: false,
    name: '',
    description: '',
    loading: false
  }

  @observable perms = {
    icon: 'plus',
    letter: '',
    color: 'green',
    status: 'Viewer'
  }

  @computed get profileData() {
    //return this.x * this.y
    var arr = []
    axios.get('http://localhost:3003/user_search/data?user='+this.profileSearch+ '&token=' + this.token + '&access_token=' + this.access_token)
    .then((res)=>{
      //this.holder = res.data
      //this.getProfile(res.data)
      arr.push(res)
      //console.log('MAIN DATA HERE: ', res.data)

    })
    .catch((err)=>{
      console.log(err)
    })
    //this.holder = arr[0]
    return arr
    //console.log('hello? ', this.holder)
  }


  @action setProfile = () =>{
    var arr = []
    axios.get('http://localhost:3003/user_search/data?user='+this.profileSearch+ '&token=' + this.token + '&access_token=' + this.access_token)
    .then((res)=>{
      arr.push(res.data)
      console.log('MAIN DATA HERE: ', res.data)
    })
    .catch((err)=>{
      console.log(err)
    })

    this.holder = arr
  }

}

var store = window.store = new workstore

export default store

autorun(() => {
  //console.log('THESE ARE SERVERS ',servers)
  //console.log(store.value1)
  //socket.on('/chat', function(message){
  //  store.messages.push(message)
//  })
})
