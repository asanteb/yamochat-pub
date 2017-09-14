import React from 'react'
import { render } from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'

import store from './mobx/store.js'
// import Main from './Main.js'

import Main from './Main.js'


injectTapEventPlugin()

render(<Main store={store}/>, document.getElementById('root'))
