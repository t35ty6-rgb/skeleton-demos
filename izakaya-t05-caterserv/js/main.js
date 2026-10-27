(function ($) {
    "use strict";

    // Spinner (removed in markup; kept harmless)
    $('#spinner').removeClass('show');

    // Initiate the wowjs
    new WOW().init();

    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });

    // Close mobile menu after tapping a link
    $('.navbar-nav .nav-link').on('click', function () {
        var c = document.getElementById('navbarCollapse');
        if (c && c.classList.contains('show')) { bootstrap.Collapse.getOrCreateInstance(c).hide(); }
    });

    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });

})(jQuery);
