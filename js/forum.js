window.travelApp = window.travelApp || {};
window.travelApp.forum = {
  init: function () {
    console.log('Forum module ready');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (window.travelApp.forum) {
    window.travelApp.forum.init();
  }
});
