import React from 'react'
/////Component Routes/////
import {BrowserRouter as Router, Route, Link, NavLink} from 'react-router-dom'
import { Input, Menu, Comment, Dimmer, Loader, Button, Grid, Divider, Header, Label, Icon, Image } from 'semantic-ui-react'
import {observer} from 'mobx-react'

const tempData = [
  'madness',
  'splendor',
  'chaos',
  'drama',
  'violence',
  'silliness',
  'adolescence',
  'illegality',
  'monkeying',
  'jack-****',
  'injustice',
  'morons',
  'drinking',
  'assimilation',
  '**** ****** ***r',
  'drugs',
  'insanity'
]

var dev_mode = false
var DOMAIN_URL = 'https://yamochat.im'
if(dev_mode){
  DOMAIN_URL = 'http://127.0.0.1:9001'
}

export default class WhiteList extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      roomName: '',
      rooms: [],
      isLogged: false,
      index: 0,
      randoText: 'insanity'
    }
  }

  componentDidMount(){
    this.randT()
    this.timerID = setInterval(
      ()=> this.randT(), 750
    )
  }
  componentWillUnmount(){
    clearInterval(this.timerID)

  }

  randT = () =>{
    var index = this.state.index
    if (index == 13)
    {
      index = 0
    }
    console.log('HOME TIMER')
    this.setState({randoText: tempData[index], index: index+1})
  }

  login = () =>{
    window.location.href = DOMAIN_URL+'/login/twitter'
  }

  render(){
    return(
      <div style={{height: '100vh', width: '100vw', backgroundImage: 'url("https://media.giphy.com/media/BHNfhgU63qrks/giphy.gif")', backgroundColor: 'teal', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat'}}>
        <div style={{top: '40%', margin: '0 auto', position: 'relative', transform: 'translateY(-50%)', textShadow: '2px 2px #FF0000'}}>
          <Header as='h1' icon textAlign='center'>
            <Image src='https://images.discordapp.net/avatars/148633443083747328/a_0ebcefaf512ef2e876dafd9322942c41.gif?size=1024' shape='circular' size='medium'/>
            <Header.Content>
              <span style={{color: 'white'}}>Login with Twitter to enjoy the <span style={{color: 'red', fontWeight: 'bold'}}>{this.state.randoText}</span>!</span>
            </Header.Content>
        </Header>
        <div style={{textAlign: 'center'}}>
          <Label as='a' size='massive' color='blue' onClick={event => window.location.replace(DOMAIN_URL+'/login/twitter')}>
            <Label.Detail>
              Login
            </Label.Detail>
            <Icon name='twitter' />
          </Label>
        </div>
        </div>
      </div>
    )
  }
}
