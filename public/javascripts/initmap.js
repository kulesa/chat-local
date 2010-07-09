var distanceWidget;
var map;
var geocodeTimer;
var profileMarkers = [];

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
    sizerIcon: new google.maps.MarkerImage('/public/images/resize-off.png'),
    activeSizerIcon: new google.maps.MarkerImage('/public/images/resize.png')
  });

  google.maps.event.addListener(distanceWidget, 'distance_changed',
      updatePosition);

  google.maps.event.addListener(distanceWidget, 'position_changed',
      updatePosition);

  map.fitBounds(distanceWidget.get('bounds'));

  updatePosition();
  addActions();
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
    $.post('/updateLocation', { lat: p.lat(), lng: p.lng(), distance: d }, function(){});
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
      }
    }

    $('#where').html('around somewhere');
  });
}

$(google.maps.event.addDomListener(window, 'load', init));