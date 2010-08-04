var distanceWidget;
var map;
var timer;
var profileMarkers = [];
var clientWidgets = [];

// Init map and widgets
function init() {
  var mapDiv = document.getElementById('map-canvas');
  map = new google.maps.Map(mapDiv, {
    center: new google.maps.LatLng(37.790234970864, -122.39031314844),
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  distanceWidget = new DistanceWidget({
    map: map,
    distance: 50, // Starting distance in km.
    minDistance: 1,
    maxDistance: 300,
    activeColor: '#59b',
    sizerIcon: new google.maps.MarkerImage('/images/resize-off.png'),
    activeSizerIcon: new google.maps.MarkerImage('/images/resize.png')
  });

  google.maps.event.addListener(distanceWidget, 'distance_changed', positionChanged);
  google.maps.event.addListener(distanceWidget, 'position_changed', positionChanged);
  map.fitBounds(distanceWidget.get('bounds'));

  positionChanged();
}

function positionChanged() {
  // send location update
  reportPosition();
  
  if (timer) {
    window.clearTimeout(timer);
  }
  
  // Throttle the geo query so we don't hit the limit
  timer = window.setTimeout(function() {
    var p = distanceWidget.get('position');
    var d = distanceWidget.get('distance');
    $('input[name=distance]').val(d.toFixed(2));
    $('input[name=lat]').val(p.lat());
    $('input[name=lng]').val(p.lng());
    // reload messages for the changed location
    $.getJSON('/chat/messages',
        {lat: p.lat(), lng: p.lng(), distance: d }, 
        function(messages){
           $('#messages').empty();
           $.each(messages, function(i, msg){
              addMessage(msg['message']);
           })});
        
    // update address information
    reverseGeocodePosition();
  }, 200);
}

// report current position to server
function reportPosition() {
  var p = distanceWidget.get('position'),
      d = distanceWidget.get('distance'),
      name = $('input[name=name]');
      
  socket.send(JSON.stringify({
    'action': 'update position',
    'lat': p.lat(), 
    'lng': p.lng(), 
    'distance': d, 
    'name': name.val() 
  }));
}

function reverseGeocodePosition() {
  var pos = distanceWidget.get('position');
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({'latLng': pos}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (results[1]) {
        $('#where').html('around ' + results[1].formatted_address);
        return;
      }}
    $('#where').html('around somewhere');
  });
}

$(google.maps.event.addDomListener(window, 'load', init));

// Send message
$(function(){
  $('form').submit(function(){
  var message = $('input[name=message]'),
      name = $('input[name=name]'), 
      lat = $('input[name=lat]'), 
      lng = $('input[name=lng]')
  if (message.val()) {
    msg = {
        'action': 'chat',
        'name': name.val(), 
        'message': message.val(),
        'lat': lat.val(),
        'lng': lng.val() 
    };
    socket.send(JSON.stringify(msg));
    addMessage(msg);
    message.val('');}
  else
    message.css('border', '1px solid red')
  return false
  });
});

$(function() {
  $('#messages li').hover(
    function(){
      alert("FUUUCK");
    },
    function(){}
  )
});

// add message to the messages list
function addMessage(message) {
  var sessionId = message['id'] || socket.transport.sessionid
  $('#messages')
    .append('<li class="' + sessionId + '">' + message['name'] + ': ' + message['message'] + '</li>')
    .get(0).scrollTop = $('#messages').get(0).scrollHeight
}

// Handle client markers
function changeLocation(request) {
  var position = new google.maps.LatLng(request['lat'], request['lng']),
    id = request['id'], 
    name = request['name']; 
    
  // if this client is in bounds
  if (distanceWidget.contains(request['lat'], request['lng'])) {
    if (clientWidgets[id])
      // if we know him - just change position of the marker
      clientWidgets[id].set('position', position)
    else
      clientWidgets[id] = new ClientWidget({
        map: map,
        position: position, 
        zIndex: 90, 
        sessionId: id, 
        userName: name
      });
  } else {
    // event out of the bounds, remove client from the map
    removeClient(id);
  }
}

// remove marker for disconnected client
function removeClient(id) {
  if (clientWidgets[id])
    clientWidgets[id].destroy();
  delete clientWidgets[id];
}

// Socket.IO
io.setPath('/javascripts/Socket.IO/');
var socket = new io.Socket('localhost', {port: 3000});

if (socket.connect()) {
  // ask other clients in the area to report
  socket.send(JSON.stringify({'action': 'report in'}));
  
  socket.addEvent('message', function(data) {
    data = JSON.parse(data);
    
    switch (data['action']) {
      case 'chat':
        // check that sender is in our bounds
        if (distanceWidget.contains(data['lat'], data['lng']))
          addMessage(data);
        break;
      
      case 'update position':
        changeLocation(data); 
        break;
        
      case 'report in': 
        reportPosition();
        break;
        
      case 'close':
        removeClient(data['id']);
    }
  })
}
