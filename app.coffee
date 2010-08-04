mongoDbPath: './lib/node-mongodb-native/lib/mongodb'

express: require 'express'
connect: require 'connect'
io: require 'socket.io'
mongodb: require mongoDbPath

MessageProvider: require('./messages-mongodb').MessageProvider
messageProvider: new MessageProvider 'localhost', 27017

json: JSON.stringify

pub: __dirname + '/public'
app: express.createServer(
  connect.logger(),
  connect.methodOverride(),
  connect.bodyDecoder(),
  connect.cookieDecoder(),
  connect.session(), 
  connect.compiler({ src: pub, enable: ['sass'] }),
  connect.staticProvider(pub)
  )
socket: io.listen(app)
  
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

  res.render 'chat', {
    locals: {
      title: 'Chat.local',
      name: req.session.name
    }
  }

app.get '/chat/messages', (req, res)-> 
  req.session.lat: req.param('lat')
  req.session.lng: req.param('lng')
  req.session.distance: req.param('distance')

  messageProvider.findLocal req.session.lat, req.session.lng, req.session.distance, (error, messages) -> 
    res.contentType 'json'
    json_messages: messages.map (m) ->
      {message: {name: m.name, message: m.body, id: m.sessionId }}
    res.send json(json_messages), 200

app.get '/error', (req, res) -> 
  throw new Error 'agrhhh!'

# socket.io configuration
socket.on 'connection', (client) -> 
  client.on 'message', (message) -> 
    try
      request: JSON.parse(message)
    catch SyntaxError
      console.log "Invalid JSON: $message"
      return false
    
    request.id: client.sessionId
    if request['action'] is 'chat'
      messageProvider.save request, -> 
        client.broadcast json(request)
        
    if request['action'] in ['update position', 'report in']
      client.broadcast json(request)

  client.on 'disconnect', -> 
    client.broadcast json({'id': client.sessionId, 'action': 'close'})

app.listen 3000