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
      // 교차 중이거나 이미 뷰포트 위로 지나간 요소는 즉시 표시 (빠른 스크롤 대응)
      if (e.isIntersecting || e.boundingClientRect.top < 0) {
        e.target.classList.add('in'); io.unobserve(e.target);
      }
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

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // card spotlight follows pointer
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function(e){
      var card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, {passive:true});
  }

  // occasional shooting star
  if (c && !reduced) {
    (function shootLoop(){
      setTimeout(function(){
        var s = document.createElement('span');
        s.className = 'shoot';
        s.style.left = (15 + Math.random()*70) + '%';
        s.style.top = (5 + Math.random()*35) + '%';
        c.appendChild(s);
        setTimeout(function(){ s.remove(); }, 1400);
        shootLoop();
      }, 3500 + Math.random()*5000);
    })();
  }

  // hero parallax + fade
  var hw = document.querySelector('.hero .wrap');
  if (hw && !reduced) {
    var ticking = false;
    window.addEventListener('scroll', function(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var y = window.scrollY, vh = window.innerHeight;
        if (y < vh) {
          hw.style.transform = 'translateY(' + (y * 0.22) + 'px)';
          hw.style.opacity = Math.max(0, 1 - y / (vh * 0.85));
        }
        ticking = false;
      });
    }, {passive:true});
  }
})();
