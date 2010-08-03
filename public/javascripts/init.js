var distanceWidget;
var map;
var geocodeTimer;
var profileMarkers = [];

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
  
function changeLocation(location) {
  //TODO: add handler for changing location
}

// add message to the messages list
function addMessage(message) {
  $('#messages')
    .append('<li>' + message['name'] + ': ' + message['message'] + '</li>')
    .get(0).scrollTop = $('#messages').get(0).scrollHeight
}

// where the client library is
io.setPath('/javascripts/Socket.IO/');
var socket = new io.Socket('localhost', {port: 3000});

if (socket.connect()) {
  socket.addEvent('message', function(data) {
    data = JSON.parse(data);
    if(data['action'] == 'close'){
      //TODO: add close handler
    } 
    else if (data['action'] == 'chat') { 
      // check that sender is in our bounds
      if (distanceWidget.get('bounds').contains(new google.maps.LatLng(data['lat'], data['lng'])))
        addMessage(data) 
    } 
    else if (data['action'] == 'update position') { changeLocatoin(data) };
  })
}
