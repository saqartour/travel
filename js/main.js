window.travelApp = window.travelApp || {};
window.travelApp.config = {
  adminPassword: 'admin123'
};

window.travelApp.init = function () {
  console.log('Travel app initialized');
};

document.addEventListener('DOMContentLoaded', window.travelApp.init);
