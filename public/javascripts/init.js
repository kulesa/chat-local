var distanceWidget;
var map;
var geocodeTimer;
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

  google.maps.event.addListener(distanceWidget, 'distance_changed', updatePosition);
  google.maps.event.addListener(distanceWidget, 'position_changed', updatePosition);
  map.fitBounds(distanceWidget.get('bounds'));

  updatePosition();
}

function updatePosition() {
  var p = distanceWidget.get('position');
  var d = distanceWidget.get('distance');
  $('input[name=distance]').val(d.toFixed(2));
  $('input[name=lat]').val(p.lat());
  $('input[name=lng]').val(p.lng());
    
  if (geocodeTimer) {
    window.clearTimeout(geocodeTimer);
  }
  
  // Throttle the geo query so we don't hit the limit
  geocodeTimer = window.setTimeout(function() {
    // reload messages for the changed location
      $.getJSON('/chat/messages',
        {lat: p.lat(), lng: p.lng(), distance: d }, 
        function(messages){
           $('#messages').empty();
           $.each(messages, function(i, msg){
              addMessage(msg['message']);
           })});
    
    // send location update
       socket.send(JSON.stringify({
         'action': 'update position',
         'lat': p.lat(), 
         'lng': p.lng(), 
         'distance': d 
       }));
    // update address information
    reverseGeocodePosition();
  }, 200);
}

// report current position, but don't update form and messages
function reportIn() {
  var p = distanceWidget.get('position');
  var d = distanceWidget.get('distance');
  socket.send(JSON.stringify({
    'action': 'update position',
    'lat': p.lat(), 
    'lng': p.lng(), 
    'distance': d 
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
})})
  

// add message to the messages list
function addMessage(message) {
  $('#messages')
    .append('<li>' + message['name'] + ': ' + message['message'] + '</li>')
    .get(0).scrollTop = $('#messages').get(0).scrollHeight
}

// Handle client markers
function changeLocation(request) {
  var position = new google.maps.LatLng(request['lat'], request['lng']),
    id = request['id']; 
    
  // if this client is in bounds
  if (distanceWidget.contains(request['lat'], request['lng'])) {
    if (clientWidgets[id])
      // if we know him - just change position of the marker
      clientWidgets[id].set('position', position)
    else
      clientWidgets[id] = new ClientWidget({
        map: map,
        position: position, 
        zIndex: 90
      });
  } else {
    // event out of the bounds, remove it
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
  socket.send(JSON.stringify({'action': 'report in'}));
  socket.addEvent('message', function(data) {
    data = JSON.parse(data);
    
    if(data['action'] == 'close'){
      removeClient(data['id'])
    } 
    else if (data['action'] == 'chat') { 
      // check that sender is in our bounds
      if (distanceWidget.contains(data['lat'], data['lng']))
        addMessage(data) 
    } 
    else if (data['action'] == 'update position') { 
        changeLocation(data) 
    }
    else if (data['action'] == 'report in') {
      reportIn()  
    };
  })
}
