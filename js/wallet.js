window.travelApp = window.travelApp || {};
window.travelApp.wallet = {
  init: function () {
    console.log('Wallet module ready');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (window.travelApp.wallet) {
    window.travelApp.wallet.init();
  }
});
