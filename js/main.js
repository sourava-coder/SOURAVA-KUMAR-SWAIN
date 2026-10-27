/* Load the latest public content before starting the existing page behaviors. */
(function(){
  var base=(window.PORTFOLIO_API_BASE||"").replace(/\/+$/,"");
  var scriptSource=document.currentScript&&document.currentScript.src;
  var assetRoot=scriptSource?new URL("../",scriptSource).href:new URL("../",location.href).href;
  var status=document.getElementById("apiState");
  var lastSnapshot="";
  function setStatus(message){
    status.textContent=message;
    status.hidden=!message;
  }
  function loadScript(src){
    return new Promise(function(resolve,reject){
      var script=document.createElement("script");
      script.src=assetRoot+src;
      script.onload=resolve;
      script.onerror=function(){reject(new Error("Could not load "+src))};
      document.body.appendChild(script);
    });
  }
  function refresh(){
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort()},8000);
    return fetch(base+"/api/portfolio",{cache:"no-store",credentials:"include",signal:controller.signal})
      .then(function(response){
        if(!response.ok)throw new Error("Portfolio API returned "+response.status);
        return response.json();
      })
      .then(function(data){
        var snapshot=JSON.stringify(data);
        setStatus("");
        if(snapshot===lastSnapshot)return true;
        lastSnapshot=snapshot;
        Object.assign(P,data);
        if(window.renderContent)window.renderContent();
        if(window.renderHero)window.renderHero();
        document.title=(P.settings&&P.settings.title)||P.name+" | "+P.role;
        var description=document.querySelector('meta[name="description"]');
        if(description&&P.settings&&P.settings.description)description.content=P.settings.description;
        return true;
      }).finally(function(){clearTimeout(timeout)});
  }
  refresh().catch(function(error){
    console.warn("Live portfolio content is unavailable; showing the bundled preview.",error);
  }).then(function(){
    return ["js/content.js","js/ui.js","js/hero.js?v=clay-mouse-2","js/reveal.js"].reduce(function(chain,src){
      return chain.then(function(){return loadScript(src)});
    },Promise.resolve());
  }).then(function(){
    setInterval(function(){
      refresh().catch(function(error){
        console.warn("Portfolio refresh failed.",error);
        setStatus("Could not refresh live content. Retrying automatically.");
      });
    },15000);
  }).catch(function(error){
    console.error(error);
    setStatus("The portfolio could not finish loading. Please reload the page.");
  });
})();
