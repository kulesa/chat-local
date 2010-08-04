mongoDbPath: './lib/node-mongodb-native/lib/mongodb'
Db: require(mongoDbPath + '/db').Db
ObjectID: require(mongoDbPath + '/bson/bson').ObjectID
Server: require(mongoDbPath + '/connection').Server

MessageProvider: (host, port) -> 
  @db: new Db('chat-local', new Server(host, port, {auto_reconnect: true}, {}))
  @db.open(() -> {})
  @db.collection 'messages', (error, message_collection) -> 
    message_collection.ensureIndex([[ 'location', '2d'  ]], () -> {})

MessageProvider::getCollection: (callback) -> 
  @db.collection 'messages', (error, message_collection) ->
    if error 
      callback error
    else 
      callback null, message_collection
      
MessageProvider::getCount: (callback) -> 
  @getCollection (error, message_collection) -> 
    if error
      callback error
    else
      message_collection.count (error, result) ->
        if error 
          callback error
        else 
          callback null, result

MessageProvider::findLocal: (lat, lng, distance, callback) -> 
  @getCollection (error, message_collection) -> 
    if error 
      callback error
    else 
      center: [parseFloat(lat), parseFloat(lng)]
      radius: parseFloat(distance) / 112.63
      query: {"location" : {"\$within" : {"\$center" : [center, radius]}}}
      limit: {limit: 30, sort: [["_id", -1]] }
      message_collection.find query, limit, (error, cursor) -> 
        if error 
          callback error
        else 
          cursor.toArray (error, results) -> 
            if error 
              callback error
            else 
              callback null, results.reverse()

MessageProvider::save: (message, callback) ->
  messages: {
    name: message['name']
    body: message['message']
      .replace /(http:\/\/[^\s]+)/g, '<a href="$1" target="express-chat">$1</a>'
      .replace /:\)/g, '<img src="/images/face-smile.png">'
    time: new Date()
    location: {
      lat: parseFloat(message['lat'])
      lng: parseFloat(message['lng'])
    }
    sessionId: message['id']
  }  
  @getCollection (error, message_collection) ->
    if error 
      callback error
    else 
      messages: [messages] unless messages.length?
      message_collection.insert messages, ->
        callback null, messages

exports.MessageProvider: MessageProvider