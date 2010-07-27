mongoDbPath: '../../js/node-mongodb-native/lib/mongodb'

express: require 'express'
connect: require 'connect'
mongodb: require mongoDbPath

MessageProvider: require('./messages-mongodb').MessageProvider
messageProvider: new MessageProvider 'localhost', 27017

pub: __dirname + '/public'
app: express.createServer(
  connect.logger(),
  connect.methodOverride(),
  connect.bodyDecoder(),
  connect.cookieDecoder(),
  # connect.cache { lifetime: (5).minutes, reapInterval: (1).minute }
  connect.session(), 
  connect.compiler({ src: pub, enable: ['sass'] }),
  connect.staticProvider(pub)
  )

app.configure ->
  app.use connect.errorHandler({ showStack: true, dumpExceptions: true })
  app.set 'view engine', 'haml'
  app.set 'views', __dirname + '/views' 

app.configure 'development', ->
  app.set 'reload views', 200

app.get '/', (req, res) ->
  res.redirect '/chat'

app.get '/chat', (req, res) -> 
  req.session.name: or 'Guest'
  req.session.lat: or 37.790234970864
  req.session.lng: or -122.39031314844
  req.session.distance: or 50
  req.session.updated: false
  messageProvider.findLocal req.session.lat, req.session.lng, req.session.distance, (err, messages) => 
    res.render 'chat', {
      locals: {
        title: 'Chat.local',
        messages: messages
        name: req.session.name
      }
    }

app.post '/updateLocation', (req, res) -> 
  req.session.lat: req.param 'lat'
  req.session.lng: req.param 'lng'
  req.session.distance: req.param 'distance'
  req.session.updated: true
  res.send 200
  
app.post '/chat', (req, res) ->     
  console.log ">>> post /chat: " + req.session.updated
  req.session.name = escape(req.param('name'))
  messageProvider.save {
    name: req.session.name
    body: req.param('message')
      .replace /(http:\/\/[^\s]+)/g, '<a href="$1" target="express-chat">$1</a>'
      .replace /:\)/g, '<img src="/images/face-smile.png">'
    time: new Date()
    location: {
      lat: parseFloat(req.param('lat'))
      lng: parseFloat(req.param('lng'))
    }
  }, (error, messages) =>
    res.send 200
  
app.get '/chat/messages', (req, res) -> 
  console.log ">>> get /chat/messages: " + req.session.updated
  messageProvider.getCount (error, count) =>
      console.log ">>> get /chat/messages -> getCount: " + req.session.updated
      previousLength: count   
      updateOnTimer: => 
        messageProvider.getCount (err, cnt) =>    
          if (cnt > previousLength) or req.session.updated
            messageProvider.findLocal req.session.lat, req.session.lng, req.session.distance, (error, messages) => 
              req.session.updated: false
              previousLength: cnt
              json_messages: messages.map (m) ->
                {message: {name: m.name, body: m.body }}
              res.contentType 'json'
              res.send JSON.stringify(json_messages), 200
            clearInterval timer
      timer: setInterval updateOnTimer, 100 

app.get '/error', (req, res) -> 
  throw new Error 'holy crap!'

app.get '/favicon.ico', (req, res) -> 
  throw new Error 'nonono'

app.listen 3000
