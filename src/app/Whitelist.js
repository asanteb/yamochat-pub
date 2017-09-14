import React from 'react'
/////Component Routes/////
import {BrowserRouter as Router, Route, Link, NavLink} from 'react-router-dom'
//import Chat from './chat.js'
//import Chat1 from './chat.js'
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


  render(){
    return(
      <div style={{height: '100vh', width: '100vw', backgroundImage: 'url("https://media.giphy.com/media/BHNfhgU63qrks/giphy.gif")', backgroundColor: 'teal', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat'}}>
        <div style={{top: '40%', margin: '0 auto', position: 'relative', transform: 'translateY(-50%)', textShadow: '2px 2px #FF0000'}}>
          <Header as='h1' icon textAlign='center'>
            <Image src='https://images.discordapp.net/avatars/148633443083747328/a_0ebcefaf512ef2e876dafd9322942c41.gif?size=1024' shape='circular' size='medium'/>
            <Header.Content>
              <p><span style={{color: 'white'}}>Website is curently in Pre-Alpha. Only whitelisted users are allowed.</span></p>
            </Header.Content>
            <Header.Content>
              <p><span style={{color: 'white'}}>You have been added to the request queue instead.</span></p>
            </Header.Content>
            <Header.Content>
              <p><span style={{color: 'white'}}>If you think you should be whitelisted contact me email me: asante@geekenforcer.com</span></p>
            </Header.Content>
            <Header.Content>
              <p><span style={{color: 'white'}}>You can also join my Discord server as well</span></p>
              <a href="https://discord.gg/zXVua4q"> <h2>discord.gg/zXVua4q</h2></a>
            </Header.Content>
        </Header>
        </div>
      </div>
    )
  }
}
