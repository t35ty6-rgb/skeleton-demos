(function($) {

	"use strict";

	var fullHeight = function() {
		var h = function(){ return Math.max($(window).height(), 640); };
		$('.js-fullheight').css('height', h());
		$(window).resize(function(){
			$('.js-fullheight').css('height', h());
		});
	};
	fullHeight();

	// loader
	if($('#ftco-loader').length > 0) { $('#ftco-loader').removeClass('show'); }

	var carousel = function() {
		$('.home-slider').owlCarousel({
	    loop:true,
	    autoplay: true,
	    autoplayTimeout: 6000,
	    margin:0,
	    animateOut: 'fadeOut',
	    animateIn: 'fadeIn',
	    nav:true,
	    dots: true,
	    autoplayHoverPause: false,
	    items: 1,
	    navText : ["<span class='fas fa-chevron-left'></span>","<span class='fas fa-chevron-right'></span>"]
		});
	};
	carousel();

	// scroll
	var scrollWindow = function() {
		$(window).scroll(function(){
			var $w = $(this),
					st = $w.scrollTop(),
					navbar = $('.ftco_navbar');

			if (st > 150) {
				if ( !navbar.hasClass('scrolled') ) { navbar.addClass('scrolled'); }
			}
			if (st < 150) {
				if ( navbar.hasClass('scrolled') ) { navbar.removeClass('scrolled sleep'); }
			}
			if ( st > 350 ) {
				if ( !navbar.hasClass('awake') ) { navbar.addClass('awake'); }
			}
			if ( st < 350 ) {
				if ( navbar.hasClass('awake') ) {
					navbar.removeClass('awake');
					navbar.addClass('sleep');
				}
			}
		});
	};
	scrollWindow();

	// counter (replacement for jquery.animateNumber)
	var counter = function() {
		var done = false;
		$('#section-counter').waypoint( function( direction ) {
			if (done) return;
			done = true;
			$('.number').each(function(){
				var $this = $(this), num = parseInt($this.data('number'), 10), start = null;
				var step = function(ts){
					if (!start) start = ts;
					var p = Math.min((ts - start) / 1800, 1);
					$this.text(Math.round(num * (1 - Math.pow(1 - p, 3))).toLocaleString());
					if (p < 1) window.requestAnimationFrame(step);
				};
				window.requestAnimationFrame(step);
			});
		} , { offset: '95%' } );
	};
	counter();

	var contentWayPoint = function() {
		$('.ftco-animate').waypoint( function( direction ) {
			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {
				$(this.element).addClass('item-animate');
				setTimeout(function(){
					$('body .ftco-animate.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							el.addClass('fadeInUp ftco-animated');
							el.removeClass('item-animate');
						},  k * 50 );
					});
				}, 100);
			}
		} , { offset: '95%' } );
	};
	contentWayPoint();

	// navigation
	$(".smoothscroll[href^='#'], #ftco-nav ul li a[href^='#']").on('click', function(e) {
		var hash = this.hash;
		if (!hash || !$(hash).length) return;
		e.preventDefault();
		var navToggler = $('.navbar-toggler');
		$('html, body').animate({ scrollTop: $(hash).offset().top - 60 }, 700);
		if ( navToggler.is(':visible') && $('#ftco-nav').hasClass('show') ) { navToggler.click(); }
	});

})(jQuery);
