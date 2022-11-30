

import * as PIXI from 'pixi.js'
import Application from './Application';
// import TitleScreen from './screens/TitleScreen'

var loader = new PIXI.loaders.Loader();
// loader.add('logo', 'images/logo.png')
// loader.add('background', 'images/background.jpg')
// loader.add('colyseus', 'images/colyseus.png')

// loader.add('clock-icon', 'images/clock-icon.png')
// loader.add('board', 'images/board.png')

loader.on('complete', () => {
//   var loading = document.querySelector('.loading');
//   document.body.removeChild(loading);

  const app = new Application()
  
  document.body.appendChild(app.view);
  (window as any).app = app;

  app.create ()
//   app.update()
})

loader.load();

