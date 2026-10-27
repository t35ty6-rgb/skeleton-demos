(function ($) {
  "use strict";
  // menu fixed js code (from template)
  $(window).scroll(function () {
    var window_top = $(window).scrollTop() + 1;
    if (window_top > 50) {
      $('.main_menu').addClass('menu_fixed animated fadeInDown');
    } else {
      $('.main_menu').removeClass('menu_fixed animated fadeInDown');
    }
  });
  // close mobile menu after tapping a link
  $('.main-menu-item .nav-link').on('click', function () {
    $('#navbarSupportedContent').collapse('hide');
  });
}(jQuery));
