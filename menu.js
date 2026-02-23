// menu.js
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const navWrapper = document.querySelector('.nav-wrapper');
  const body = document.body;
  const menuItems = document.querySelectorAll('.nav-wrapper .menu a');

  if (hamburger && navWrapper) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      navWrapper.classList.toggle('active');
      body.classList.toggle('no-scroll');
    });

    // Close menu when clicking on menu items
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          hamburger.classList.remove('active');
          navWrapper.classList.remove('active');
          body.classList.remove('no-scroll');
        }
      });
    });
  }
});
