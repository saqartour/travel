window.travelApp = window.travelApp || {};
window.travelApp.chat = {
  init: function () {
    console.log('Chat module ready');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (window.travelApp.chat) {
    window.travelApp.chat.init();
  }
});
