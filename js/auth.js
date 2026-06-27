window.travelApp = window.travelApp || {};
window.travelApp.auth = {
  init: function () {
    console.log('Auth module ready');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (window.travelApp.auth) {
    window.travelApp.auth.init();
  }
});
