/**
 * A client widget that will display a marker for people in the area and animation for chat actions
 *
 * @param {Object} opt_options Options such as map, position etc.
 *
 * @constructor
 */
 
function ClientWidget(opt_options) {
  var options = opt_options || {};
  
  this.setValues(options);
  
  var image = new google.maps.MarkerImage('/images/markers/image.png', 
      new google.maps.Size(32, 32), 
      new google.maps.Point(0, 0), 
      new google.maps.Point(16, 32));

  var shadow = new google.maps.MarkerImage('/images/markers/shadow.png', 
      new google.maps.Size(48, 32), 
      new google.maps.Point(0, 0), 
      new google.maps.Point(16, 32));

  var shape = {
      coord: [21,2,23,3,25,4,26,5,27,6,28,7,28,8,29,9,29,10,29,11,29,12,29,13,29,14,29,15,29,16,29,17,29,18,28,19,27,20,26,21,25,22,24,23,22,24,21,25,22,26,23,27,23,28,22,29,18,29,16,28,15,27,14,26,12,25,9,24,7,23,6,22,5,21,4,20,3,19,2,18,2,17,2,16,2,15,2,14,2,13,2,12,2,11,2,10,2,9,3,8,3,7,4,6,5,5,6,4,8,3,10,2],
      type: 'poly'
  };
  
  var marker = new google.maps.Marker({
    draggable: false,
    title: 'Client!',
    icon: image, 
    shadow: shadow, 
    shape: shape
  });
  
  marker.bindTo('map', this);
  marker.bindTo('zIndex', this);
  marker.bindTo('position', this);
  
  this.set('marker', marker);

  me = this;  
  var infoWindow = new google.maps.InfoWindow({
    content: me.get('userName')
  });
  
  infoWindow.bindTo('zIndex', this);
  
  google.maps.event.addListener(marker, 'click', function() {
    infoWindow.open(me.get('map'), marker);
  });
}

ClientWidget.prototype = new google.maps.MVCObject();

ClientWidget.prototype.destroy = function() {
  this.get('marker').setMap(null);
}