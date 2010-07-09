kiwi: require 'kiwi'
kiwi.require 'express'
require 'express/plugins'
utils: require 'express/utils'
http: require 'express/http'
kiwi.seed 'mongodb-native'

MessageProvider: require('./messages-mongodb').MessageProvider
messageProvider: new MessageProvider 'localhost', 27017

configure( -> 
  use Logger
  use MethodOverride
  use ContentLength
  use Cookie
  use Cache, { lifetime: (5).minutes, reapInterval: (1).minute }
  use Session, { lifetime: (15).minutes, reapInterval: (1).minute }
  use Static
  set 'root', __dirname
)

get '/', ->
  @redirect '/chat'

get '/chat', -> 
  @session.id: or Math.random()
  @session.name: or 'Guest'
  @session.lat: or 37.790234970864
  @session.lng: or -122.39031314844
  @session.distance: or 50

  messageProvider.findLocal @session.lat, @session.lng, @session.distance, (err, messages) => 
    @render 'chat.html.haml', {
      locals: {
        title: 'Chat.local',
        messages: messages
        name: @session.name
      }
    }

post '/updateLocation', -> 
  @session.lat = @param 'lat'
  @session.lng = @param 'lng'
  @session.distance = @param 'distance'
  @respond 200
  
post '/chat', ->     
  @session.name = utils.escape(@param('name'))
  messageProvider.save {
    name: @session.name
    body: utils.escape(@param('message'))
      .replace /(http:\/\/[^\s]+)/g, '<a href="$1" target="express-chat">$1</a>'
      .replace /:\)/g, '<img src="/public/images/face-smile.png">'
    time: new Date()
    location: {
      lat: @param('lat')
      lng: @param('lng')
    }
  }, (error, messages) =>
    @respond 200
  
get '/chat/messages', -> 
  messageProvider.getCount (error, count) =>
      previousLength: count   
      updateOnTimer: => 
        messageProvider.getCount (err, cnt) =>           
          if cnt > previousLength
            messageProvider.findLocal @session.lat, @session.lng, @session.distance, (error, messages) => 
              @contentType 'json'
              previousLength: cnt
              json_messages: messages.map (m) ->
                {message: {name: m.name, body: m.body }}
              @respond 200, JSON.stringify(json_messages)
            clearInterval timer
      timer: setInterval updateOnTimer, 100 

get '/*.css', (file) -> 
  @render( file + '.css.sass', { layout: false })

get '/error/view', -> 
  @render 'does.not.exist'

get '/error', -> 
  throw new Error 'holy crap!'

get '/favicon.ico', -> 
  @notFound()

run()
