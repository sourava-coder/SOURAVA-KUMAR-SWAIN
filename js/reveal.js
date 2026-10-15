/* reveal.js: scroll-in animations. Runs last because it needs the rendered content. */
/* scroll reveals */
(function(){
  var sel='.sec>header,#aboutText,#facts,#skillChips,#skillList,#projChips,#projList,#tl,#edu,#certs,.rbar,#paper,#form,#direct,h3.sub';
  var els=$$(sel);els.forEach(function(e){e.classList.add('rv')});
  $$('#facts div,#aboutText p').forEach(function(e,i){e.classList.add('pop');e.style.setProperty('--d',i)});
  $$('#tl li').forEach(function(e,i){e.classList.add('pop');e.style.setProperty('--d',i*3+2)});
  $$('#edu .row2,#certs .row2').forEach(function(e,i){e.classList.add('pop');e.style.setProperty('--d',i)});
  if(reduce||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  els.forEach(function(e){io.observe(e)});
})();
