
$(function(){
  // Send message
  $('form').submit(function(){
    var message = $('input[name=message]'),
        name = $('input[name=name]'), 
        lat = $('input[name=lat]'), 
        lng = $('input[name=lng]')
    if (message.val()) 
      $.post('/chat', { 
          name: name.val(), 
          message: message.val(),
          lat: lat.val(),
          lng: lng.val() }, 
          function(){message.val('')})
    else
      message.css('border', '1px solid red')
    return false
  })
  
  // Longpoll
  ;(function poll(){
    $.getJSON('/chat/messages', function(messages){
      $('#messages').empty()
      $.each(messages, function(i, msg){
        $('#messages')
          .append('<li>' + msg.message.name + ': ' + msg.message.body + '</li>')
          .get(0).scrollTop = $('#messages').get(0).scrollHeight
      })
      poll()
    })
  })()
})