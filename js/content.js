/* content.js: fills the page from the active portfolio object. */
function renderContent(){
document.title=(P.settings&&P.settings.title)||P.name+' | '+P.role;
var displayName=P.displayName||P.name;
$('#logoName').textContent=$('#logoName2').textContent=displayName;$('#ini').alt=P.name+' logo';(function(){var h=$('#heroName'),n=0;h.setAttribute('aria-label',displayName);h.innerHTML=displayName.split(/\s+/).map(function(w){return '<span class="w" aria-hidden="true">'+w.split('').map(function(c){return '<span class="c" style="--i:'+(n++)+'">'+esc(c)+'</span>'}).join('')+'</span>'}).join(' ')})();
$('#avail').textContent=P.available?'Available to work':'Not taking new work right now';
$('#roleSr').textContent=(P.settings&&P.settings.heroIntro)||P.role+'. I build '+P.phrases.join(', ')+'.';
var intro=$('#heroIntro');
intro.textContent=P.settings&&P.settings.heroIntro||'';
intro.hidden=!intro.textContent;
$('#find').innerHTML='<span>Find me on</span>'+P.socials.map(function(s){var u=s[0].toLowerCase()==='email'?'mailto:'+s[1]:safeUrl(s[1]);return '<a href="'+esc(u)+'"'+(u.indexOf('http')===0?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(s[0])+'</a>'}).join('');
$('#aboutText').innerHTML=P.about.map(function(p){return '<p>'+esc(p)+'</p>'}).join('');
$('#facts').innerHTML=P.facts.map(function(f){return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>'}).join('');
$('#tl').innerHTML=P.journey.map(function(j){return '<li><time>'+esc(j.w)+'</time><h3>'+esc(j.t)+'</h3><div class="org">'+esc(j.o)+'</div><p>'+esc(j.d)+'</p></li>'}).join('');
$('#edu').innerHTML=P.education.map(function(e){return '<div class="row2"><div><h3>'+esc(e.t)+'</h3><p>'+esc(e.o)+'. '+esc(e.d)+'</p></div><time>'+esc(e.w)+'</time></div>'}).join('');
$('#certs').innerHTML=P.certs.map(function(c){return '<div class="row2"><div><h3>'+esc(c.t)+'</h3><p>'+esc(c.o)+'</p></div><time>'+esc(c.w)+'</time></div>'}).join('');
$('#copy').textContent=(P.settings&&P.settings.footer)||('\u00A9 '+new Date().getFullYear()+' '+P.name+'. All rights reserved.');$('#city').textContent=P.city;
$('#direct').innerHTML='<a class="btn line" href="'+esc(safeUrl('mailto:'+P.email))+'">'+esc(P.email)+'</a><a class="btn line" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(P.whatsapp.replace(/\D/g,''))+'">WhatsApp</a>';
var resume=$('#resumeDownload');
resume.hidden=!P.resumeUrl;
if(P.resumeUrl){resume.href=safeUrl(P.resumeUrl);resume.target='_blank';resume.rel='noopener noreferrer'}
var notice=$('#maintenanceNotice');
if(notice){notice.textContent=P.settings&&P.settings.maintenanceNotice||'';notice.hidden=!notice.textContent}
var labels=P.settings&&P.settings.navLabels||{};
$$('#links a').forEach(function(a){var key=a.getAttribute('href').slice(1);if(labels[key])a.textContent=labels[key]});

/* skills filter */
var sk='All';
function drawSkills(){
  var groups=['All'].concat(Object.keys(P.skills));
  $('#skillChips').innerHTML=groups.map(function(g){return '<button type="button" class="chip" data-g="'+esc(g)+'" aria-pressed="'+(g===sk)+'">'+esc(g)+'</button>'}).join('');
  var items=[];Object.keys(P.skills).forEach(function(g){if(sk==='All'||sk===g)P.skills[g].forEach(function(s){items.push({n:s[0],l:s[1],g:g})})});
  var lv=['','Just started','Learning','Comfortable','Strong','Daily driver'];
  var sl=$('#skillList');sl.innerHTML=items.length?items.map(function(i){return '<div class="skill pop" style="--d:'+(items.indexOf(i)%12)+';--k:'+(items.indexOf(i)%8)+'"><b>'+esc(i.n)+'</b><span class="meter" role="img" aria-label="'+lv[i.l]+'">'+[1,2,3,4,5].map(function(k){return '<i class="'+(k<=i.l?'f':'')+'" style="--k:'+k+'"></i>'}).join('')+'</span><small>'+lv[i.l]+(sk==='All'?' in '+esc(i.g):'')+'</small></div>'}).join(''):'<p class="content-empty">No skills have been added yet.</p>';
  $$('#skillChips .chip').forEach(function(b){b.onclick=function(){sk=b.getAttribute('data-g');drawSkills()}});
}
/* projects filter */
var pf='All';
function drawProjects(){
  var cats=['All'];P.projects.forEach(function(p){if(cats.indexOf(p.cat)<0)cats.push(p.cat)});
  $('#projChips').innerHTML=cats.map(function(c){return '<button type="button" class="chip" data-c="'+esc(c)+'" aria-pressed="'+(c===pf)+'">'+esc(c)+'</button>'}).join('');
  var visible=P.projects.filter(function(p){return pf==='All'||p.cat===pf});
  $('#projList').innerHTML=visible.length?visible.map(function(p){
    var image=p.image?safeUrl(p.image):'';
    return '<article class="proj pop'+(p.big&&pf==='All'?' big':'')+'">'+(image&&image!=='#'?'<img class="project-image" loading="lazy" src="'+esc(image)+'" alt="'+esc(p.t)+' project preview">':'')+'<h3>'+esc(p.t)+'</h3><p>'+esc(p.d)+'</p><div class="tags">'+p.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>'}).join('')+'</div><div class="links2"><a class="l" href="'+esc(safeUrl(p.live))+'">Live demo</a><a class="l" href="'+esc(safeUrl(p.code))+'">Source code</a></div></article>'}).join(''):'<p class="content-empty">No projects in this category yet.</p>';
  $$('#projChips .chip').forEach(function(b){b.onclick=function(){pf=b.getAttribute('data-c');drawProjects()}});
}
drawSkills();drawProjects();

/* resume */
(function(){
  var sk2=Object.keys(P.skills).map(function(g){return '<div class="it"><b>'+esc(g)+'</b><span>'+P.skills[g].map(function(s){return esc(s[0])}).join(', ')+'</span></div>'}).join('');
  var ex=P.journey.map(function(j){return '<div class="it"><b>'+esc(j.t)+', '+esc(j.o)+'</b><span>'+esc(j.w)+'</span><p style="margin:4px 0 0">'+esc(j.d)+'</p></div>'}).join('');
  var ed=P.education.map(function(e){return '<div class="it"><b>'+esc(e.t)+'</b><span>'+esc(e.o)+', '+esc(e.w)+'</span></div>'}).join('');
  var pr=P.projects.filter(function(p){return p.big}).concat(P.projects.filter(function(p){return !p.big}).slice(0,1)).map(function(p){return '<div class="it"><b>'+esc(p.t)+'</b><span>'+esc(p.tags.join(', '))+'</span><p style="margin:4px 0 0">'+esc(p.d)+'</p></div>'}).join('');
  $('#paper').innerHTML='<h3>'+esc(P.name)+'</h3><div class="meta">'+esc(P.role)+'. '+esc(P.city)+'. '+esc(P.email)+'</div><p>'+esc(P.summary)+'</p>'+
   '<h4>Experience</h4>'+ex+'<h4>Projects</h4>'+pr+'<div class="two"><div><h4>Skills</h4>'+sk2+'</div><div><h4>Education</h4>'+ed+'<h4>Certifications</h4>'+P.certs.map(function(c){return '<div class="it"><b>'+esc(c.t)+'</b><span>'+esc(c.o)+', '+esc(c.w)+'</span></div>'}).join('')+'</div></div>';
})();
$('#printBtn').onclick=function(){
  try{window.print();$('#printMsg').textContent=''}catch(e){$('#printMsg').textContent='Use your browser print command (Ctrl+P or Cmd+P) and choose Save as PDF.'}
};

/* contact: no server, so it opens the visitor's email app with the message filled in */
$('#form').onsubmit=function(e){
  e.preventDefault();var ok=true,n=$('#fName'),m=$('#fEmail'),g=$('#fMsg');
  function chk(el,err,bad,msg){var b=bad;el.setAttribute('aria-invalid',b);$(err).textContent=b?msg:'';if(b)ok=false;return !b}
  chk(n,'#eName',!n.value.trim(),'Enter your name.');
  chk(m,'#eEmail',!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(m.value.trim()),'Enter a valid email address, like name@example.com.');
  chk(g,'#eMsg',g.value.trim().length<10,'Write at least a sentence so I know how to help.');
  if(!ok){var f=$('[aria-invalid="true"]');if(f)f.focus();return}
  var a=document.createElement('a');a.href='mailto:'+P.email+'?subject='+encodeURIComponent('Project enquiry from '+n.value.trim())+'&body='+encodeURIComponent(g.value.trim()+'\n\nFrom: '+n.value.trim()+' ('+m.value.trim()+')');
  document.body.appendChild(a);a.click();a.remove();
  $('#sent').textContent='Your email app should open with the message ready. If it does not, write to '+P.email+'.';
};
}
window.renderContent=renderContent;
renderContent();
