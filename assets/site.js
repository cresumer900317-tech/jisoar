/* jisoar. — shared site behavior */
(function(){
  // stars (hero backdrop)
  var c = document.getElementById('stars');
  if (c) {
    var h = '';
    for (var i = 0; i < 60; i++) {
      var x = Math.random()*100, y = Math.random()*80,
          d = (Math.random()*4).toFixed(2), s = (Math.random()*1.4+0.8).toFixed(1);
      h += '<span class="star" style="left:'+x+'%;top:'+y+'%;width:'+s+'px;height:'+s+'px;animation-delay:'+d+'s"></span>';
    }
    c.innerHTML = h;
  }

  // nav: scrolled state + mobile menu
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function(){
      nav.classList.toggle('scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
    var burger = nav.querySelector('.burger');
    if (burger) burger.addEventListener('click', function(){
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('.links a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('open'); });
    });
  }

  // reveal on scroll
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold: .12, rootMargin: '0px 0px -6% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  // stat counters (data-count="12")
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, target = parseInt(el.getAttribute('data-count'), 10),
          t0 = null, dur = 1200;
      function tick(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
        el.firstChild.nodeValue = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, {threshold: .5});
  document.querySelectorAll('[data-count]').forEach(function(el){ cio.observe(el); });
})();
