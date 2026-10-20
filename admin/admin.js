(function(){
  var base=(window.PORTFOLIO_API_BASE||"").replace(/\/+$/,"");
  var loginView=document.getElementById("loginView");
  var loadingView=document.getElementById("loadingView");
  var appView=document.getElementById("appView");
  var loginMessage=document.getElementById("loginMessage");
  var globalMessage=document.getElementById("globalMessage");
  var fields=document.getElementById("editorFields");
  var current={};
  var section="overview";
  var csrfToken="";
  var sections={
    profile:{title:"Profile",intro:"Your name, portrait, role, contact details and resume.",keys:["name","displayName","role","city","tz","photo","photoAlt","photoPos","email","whatsapp","available","phrases","resumeUrl","summary"]},
    about:{title:"About & facts",intro:"The paragraphs and personal facts shown in your About section.",keys:["about","facts"]},
    skills:{title:"Skills",intro:"Organize skill categories, proficiency levels and display order.",keys:["skills"]},
    projects:{title:"Projects",intro:"Manage project details, images, links, visibility and display order.",keys:["projects"]},
    socials:{title:"Social links",intro:"Add profile links. External URLs must use HTTPS or HTTP.",keys:["socials"]},
    journey:{title:"Experience",intro:"Manage experience, internships, achievements and timeline order.",keys:["journey"]},
    education:{title:"Education",intro:"Manage education records and their display order.",keys:["education"]},
    certs:{title:"Certifications",intro:"Manage credentials and certification dates.",keys:["certs"]},
    settings:{title:"Website settings",intro:"Set SEO text, hero intro, footer, navigation labels and a notice.",keys:["settings"]}
  };
  var templates={
    projects:{t:"New project",cat:"Web",tags:[],big:false,published:true,d:"",live:"",code:"",image:""},
    journey:{w:"",t:"",o:"",d:""},
    education:{t:"",o:"",w:"",d:""},
    certs:{t:"",o:"",w:""},
    socials:["",""],
    facts:["",""],
    about:"",
    phrases:"",
    tags:"",
    skills:["",3]
  };
  var fieldLabels={
    name:"Full name",displayName:"Display name",tz:"Time zone",photo:"Profile photo URL",photoAlt:"Profile photo alt text",
    photoPos:"Profile photo position",whatsapp:"WhatsApp number",phrases:"Hero phrases",resumeUrl:"Resume / CV URL",
    t:"Title",cat:"Category",tags:"Technology tags",big:"Featured project",published:"Published on portfolio",
    d:"Description",live:"Live demo URL",code:"Source code URL",image:"Project image URL",w:"Date or period",
    o:"Organization / issuer",heroIntro:"Hero introduction",maintenanceNotice:"Availability or maintenance notice"
  };

  function api(path,options,timeoutMs){
    options=options||{};
    options.credentials="include";
    options.headers=options.headers||{};
    var controller=new AbortController(),timeout=setTimeout(function(){controller.abort()},timeoutMs||10000);
    options.signal=controller.signal;
    return fetch(base+"/api"+path,options).then(function(response){
      return response.text().then(function(text){
        var data={};
        try{data=text?JSON.parse(text):{}}catch(e){data={detail:"The API origin returned a non-JSON response. Check js/config.js and backend availability."}}
        if(!response.ok)throw new Error(data.detail||("Request failed ("+response.status+")"));
        return data;
      });
    }).catch(function(error){
      if(error.name==="AbortError")throw new Error("The request timed out. The server may be busy; please try again.");
      throw error;
    }).finally(function(){clearTimeout(timeout)});
  }
  function csrfHeaders(){
    if(!csrfToken)throw new Error("Your session has expired. Sign in again.");
    return {"X-CSRF-Token":csrfToken};
  }
  function showMessage(target,message,error){
    target.textContent=message||"";
    target.classList.toggle("error",!!error&&!!message);
    target.classList.toggle("success",!error&&!!message);
  }
  function html(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
  function pathAttr(path){return html(JSON.stringify(path))}
  function label(key){return String(key).replace(/([A-Z])/g," $1").replace(/^./,function(c){return c.toUpperCase()})}
  function getPath(object,path){return path.reduce(function(value,key){return value==null?undefined:value[key]},object)}
  function setPath(object,path,value){
    var parent=path.slice(0,-1).reduce(function(item,key){return item[key]},object);
    parent[path[path.length-1]]=value;
  }
  function clone(value){return JSON.parse(JSON.stringify(value))}
  function templateFor(path,value){
    var key=path[path.length-1];
    if(path[0]==="skills"&&path.length===2)return clone(templates.skills);
    if(Object.prototype.hasOwnProperty.call(templates,key))return clone(templates[key]);
    if(value.length&&typeof value[0]==="object")return clone(value[0]);
    return typeof value[0]==="number"?0:"";
  }
  function scalarField(name,value,path){
    var key=String(path[path.length-1]);
    var display=fieldLabels[name]||fieldLabels[key]||label(name);
    if(path[0]==="skills"&&path.length===3)display=path[2]===0?"Skill name":"Proficiency (1-5)";
    if(path[0]==="socials"&&path.length===2)display=path[1]===0?"Social network":"Profile URL or email";
    if(path[0]==="facts"&&path.length===2)display=path[1]===0?"Fact label":"Fact value";
    if(path[0]==="about"&&path.length===2)display="About paragraph";
    if(path[0]==="phrases"&&path.length===2)display="Hero phrase";
    if(path[path.length-2]==="tags")display="Technology tag";
    if(typeof value==="boolean"){
      return '<label class="field check-field"><input type="checkbox" data-path="'+pathAttr(path)+'" '+(value?"checked":"")+'><span>'+html(display)+'</span></label>';
    }
    var isLong=["d","summary","description","heroIntro","footer","maintenanceNotice"].indexOf(key)>=0||
      (typeof value==="string"&&value.length>100);
    var input=isLong?'<textarea data-path="'+pathAttr(path)+'">'+html(value)+'</textarea>':
      '<input type="'+(typeof value==="number"?"number":"text")+'" '+(typeof value==="number"?'min="1" max="5" step="1"':'')+' data-path="'+pathAttr(path)+'" value="'+html(value)+'">';
    var uploadable=["photo","resumeUrl","image"].indexOf(key)>=0;
    return '<div class="field"><span>'+html(display)+'</span>'+input+(uploadable?'<span class="file-tools"><button class="secondary" type="button" data-pick="'+pathAttr(path)+'">Upload file</button><input type="file" data-upload="'+pathAttr(path)+'" accept="'+(key==="resumeUrl"?".pdf,application/pdf":"image/jpeg,image/png,image/webp,image/avif")+'"><small class="muted">Stored in persistent Supabase Storage.</small></span>':'')+'</div>';
  }
  function renderNode(name,value,path){
    if(Array.isArray(value)){
      var items=value.map(function(item,index){
        var itemPath=path.concat(index);
        var title=item&&typeof item==="object"&&!Array.isArray(item)?(item.t||item.title||item[0]||("Entry "+(index+1))):"Entry "+(index+1);
        return '<div class="array-item"><div class="item-tools"><span>'+html(title)+'</span><span class="tool-group"><button class="tool-btn" type="button" data-action="up" data-path="'+pathAttr(itemPath)+'" aria-label="Move up">↑</button><button class="tool-btn" type="button" data-action="down" data-path="'+pathAttr(itemPath)+'" aria-label="Move down">↓</button><button class="tool-btn danger" type="button" data-action="remove" data-path="'+pathAttr(itemPath)+'">Remove</button></span></div>'+renderNode("Entry",item,itemPath)+'</div>';
      }).join("");
      return '<div class="array-editor"><div class="array-head"><strong>'+html(label(name))+' <span class="muted">('+value.length+')</span></strong><button class="secondary" type="button" data-action="add" data-path="'+pathAttr(path)+'">＋ Add</button></div><div class="array-items">'+items+'</div></div>';
    }
    if(value&&typeof value==="object"){
      var skills=path.length===1&&path[0]==="skills";
      var entries=Object.keys(value).map(function(key){
        var childPath=path.concat(key);
        if(skills){
          return '<div class="object-block"><div class="object-header"><label class="field">Category name<input data-rename="'+html(key)+'" data-path="'+pathAttr(path)+'" value="'+html(key)+'"></label><button class="tool-btn danger" type="button" data-action="remove-category" data-path="'+pathAttr(path)+'" data-key="'+html(key)+'">Delete category</button></div>'+renderNode(key,value[key],childPath)+'</div>';
        }
        var remove=path.length===2&&path[0]==="settings"&&path[1]==="navLabels"?'<button class="tool-btn danger" type="button" data-action="remove-label" data-path="'+pathAttr(path)+'" data-key="'+html(key)+'">Remove</button>':'';
        return '<div class="object-block"><div class="object-header"><h3 class="object-title">'+html(label(key))+'</h3>'+remove+'</div>'+renderNode(key,value[key],childPath)+'</div>';
      }).join("");
      var addKey=path.length===2&&path[0]==="settings"&&path[1]==="navLabels";
      return (addKey?'<div class="array-head"><strong>Navigation labels</strong><button class="secondary" type="button" data-action="add-key" data-path="'+pathAttr(path)+'">＋ Add label</button></div>':'')+'<div class="object-grid">'+entries+'</div>';
    }
    return scalarField(name,value,path);
  }
  function collect(){
    var result=clone(current);
    fields.querySelectorAll("input[data-path]:not([data-rename]),textarea[data-path]:not([data-rename]),select[data-path]:not([data-rename])").forEach(function(input){
      var path=JSON.parse(input.getAttribute("data-path"));
      if(input.matches("[data-upload]"))return;
      var value=input.type==="checkbox"?input.checked:input.type==="number"?Number(input.value):input.value;
      setPath(result,path,value);
    });
    fields.querySelectorAll("[data-rename]").forEach(function(input){
      var object=getPath(result,JSON.parse(input.getAttribute("data-path")));
      var oldKey=input.getAttribute("data-rename"),newKey=input.value.trim();
      if(newKey&&newKey!==oldKey&&!Object.prototype.hasOwnProperty.call(object,newKey)){
        object[newKey]=object[oldKey];
        delete object[oldKey];
      }
    });
    return result;
  }
  function renderEditor(){
    if(section==="overview")return;
    var config=sections[section];
    fields.innerHTML=config.keys.map(function(key){return renderNode(key,current[key],[key])}).join("");
    document.getElementById("pageTitle").textContent=config.title;
    document.getElementById("sectionIntro").textContent=config.intro;
    document.getElementById("addCategoryBtn").hidden=section!=="skills";
  }
  function updateSection(name){
    if(section!=="overview"&&!document.getElementById("editorView").hidden)current=collect();
    section=name;
    document.querySelectorAll(".nav-item[data-section]").forEach(function(button){button.classList.toggle("active",button.dataset.section===name)});
    var overview=name==="overview";
    document.getElementById("overviewView").hidden=!overview;
    document.getElementById("editorView").hidden=overview;
    document.getElementById("saveBtn").hidden=overview;
    document.getElementById("pageTitle").textContent=overview?"Overview":sections[name].title;
    if(!overview)renderEditor();
  }
  function fetchStats(){
    return api("/admin/stats").then(function(data){
      var items=[
        ["Published projects",data.publishedProjects,"Visible on your portfolio"],
        ["Skills",data.skills,"Across all categories"],
        ["Profile completion",data.profileCompletion+"%","Based on key public fields"],
        ["Last content update",data.updatedAt?new Date(data.updatedAt).toLocaleString():"Not yet saved","Database timestamp"]
      ];
      document.getElementById("stats").innerHTML=items.map(function(item){
        return '<article class="stat glass"><div class="stat-label">'+html(item[0])+'</div><div class="stat-value">'+html(item[1])+'</div><div class="stat-note">'+html(item[2])+'</div></article>';
      }).join("");
    }).catch(function(error){showMessage(globalMessage,error.message,true)});
  }
  function enterDashboard(data){
    current=data;
    loadingView.hidden=true;
    loginView.hidden=true;
    appView.hidden=false;
    document.getElementById("welcomeName").textContent="Welcome, "+(current.displayName||current.name);
    updateSection("overview");
    fetchStats();
  }
  function moveItem(path,direction){
    var result=collect(),index=path.pop(),list=getPath(result,path),target=index+direction;
    if(target<0||target>=list.length)return;
    var temp=list[index];list[index]=list[target];list[target]=temp;
    current=result;renderEditor();
  }
  function addItem(path){
    var result=collect(),list=getPath(result,path);
    list.push(templateFor(path,list));
    current=result;renderEditor();
  }
  function handleEditorClick(event){
    var button=event.target.closest("[data-action]");
    if(!button)return;
    var result=collect(),path=JSON.parse(button.dataset.path),action=button.dataset.action;
    if(action==="add"){
      var list=getPath(result,path);list.push(templateFor(path,list));
    }else if(action==="up"||action==="down"){
      var index=path.pop(),items=getPath(result,path),target=index+(action==="up"?-1:1);
      if(target<0||target>=items.length)return;
      var temp=items[index];items[index]=items[target];items[target]=temp;
    }else if(action==="remove"){
      if(!window.confirm("Remove this item? This takes effect when you save."))return;
      getPath(result,path.slice(0,-1)).splice(path[path.length-1],1);
    }else if(action==="remove-category"){
      var category=button.dataset.key;
      if(!window.confirm('Delete the "'+category+'" category and its skills?'))return;
      delete getPath(result,path)[category];
    }else if(action==="add-key"){
      var key=window.prompt("Navigation target (for example: about, projects, contact):");
      if(!key||!key.trim())return;
      key=key.trim();
      if(Object.prototype.hasOwnProperty.call(getPath(result,path),key)){showMessage(globalMessage,"That navigation target already exists.",true);return}
      getPath(result,path)[key]=label(key);
    }else if(action==="remove-label"){
      if(!window.confirm("Remove this navigation label?"))return;
      delete getPath(result,path)[button.dataset.key];
    }
    current=result;renderEditor();
  }
  function save(){
    var button=document.getElementById("saveBtn");
    button.disabled=true;document.getElementById("saveBottomBtn").disabled=true;
    document.getElementById("saveState").textContent="Saving…";
    Promise.resolve().then(function(){
      var data=collect();
      return api("/admin/portfolio",{method:"PUT",headers:Object.assign({"Content-Type":"application/json"},csrfHeaders()),body:JSON.stringify(data)},45000);
    })
      .then(function(result){
        current=result.portfolio;
        document.getElementById("welcomeName").textContent="Welcome, "+(current.displayName||current.name);
        renderEditor();
        document.getElementById("saveState").textContent="Saved and published";
        showMessage(globalMessage,"Your changes are saved. The public site will refresh within 15 seconds.",false);
        fetchStats();
        setTimeout(function(){document.getElementById("saveState").textContent=""},5000);
      })
      .catch(function(error){showMessage(globalMessage,error.message,true);document.getElementById("saveState").textContent=""})
      .finally(function(){button.disabled=false;document.getElementById("saveBottomBtn").disabled=false});
  }
  function uploadFile(input){
    var file=input.files&&input.files[0];
    if(!file)return;
    if(file.size>5*1024*1024){showMessage(globalMessage,"File must be smaller than 5 MB.",true);input.value="";return}
    current=collect();
    var form=new FormData();form.append("file",file);
    showMessage(globalMessage,"Uploading to persistent storage…",false);
    api("/admin/upload",{method:"POST",headers:csrfHeaders(),body:form}).then(function(data){
      setPath(current,JSON.parse(input.dataset.upload),data.url);
      renderEditor();showMessage(globalMessage,"Upload complete. Save changes to publish the new file.",false);
    }).catch(function(error){showMessage(globalMessage,error.message,true)}).finally(function(){input.value=""});
  }

  document.getElementById("loginForm").addEventListener("submit",function(event){
    event.preventDefault();
    var form=new FormData(event.currentTarget);
    loginMessage.textContent="Signing in…";
    api("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:form.get("pin")})})
      .then(function(data){csrfToken=data.csrfToken;return api("/admin/portfolio")})
      .then(enterDashboard)
      .catch(function(error){loginMessage.textContent=error.message});
  });
  document.getElementById("navigation").addEventListener("click",function(event){
    var button=event.target.closest("[data-section]");
    if(button)updateSection(button.dataset.section);
  });
  document.querySelectorAll(".quick-links [data-section]").forEach(function(button){
    button.addEventListener("click",function(){updateSection(button.dataset.section)});
  });
  fields.addEventListener("click",handleEditorClick);
  fields.addEventListener("click",function(event){
    var button=event.target.closest("[data-pick]");
    if(!button)return;
    var fileInput=Array.prototype.find.call(fields.querySelectorAll("[data-upload]"),function(input){return input.dataset.upload===button.dataset.pick});
    if(fileInput)fileInput.click();
  });
  fields.addEventListener("change",function(event){
    if(event.target.matches("[data-upload]"))uploadFile(event.target);
    if(event.target.matches("[data-rename]")){
      var input=event.target,next=input.value.trim();
      var duplicate=Array.prototype.some.call(fields.querySelectorAll("[data-rename]"),function(other){return other!==input&&other.value.trim()===next});
      if(!next||duplicate){
        input.value=input.dataset.rename;
        showMessage(globalMessage,duplicate?"A category with that name already exists.":"Category names cannot be blank.",true);
      }else showMessage(globalMessage,"",false);
    }
  });
  document.getElementById("addCategoryBtn").addEventListener("click",function(){
    current=collect();
    var name=window.prompt("New skill category name:");
    if(!name||!name.trim())return;
    name=name.trim();
    if(Object.prototype.hasOwnProperty.call(current.skills,name)){showMessage(globalMessage,"That category already exists.",true);return}
    current.skills[name]=[];renderEditor();
  });
  document.getElementById("saveBtn").addEventListener("click",save);
  document.getElementById("saveBottomBtn").addEventListener("click",save);
  document.getElementById("logoutBtn").addEventListener("click",function(){
    Promise.resolve().then(function(){return api("/admin/logout",{method:"POST",headers:csrfHeaders()})})
      .then(function(){csrfToken="";appView.hidden=true;loginView.hidden=false;document.getElementById("loginForm").reset()})
      .catch(function(error){showMessage(globalMessage,error.message,true)});
  });
  api("/admin/me").then(function(){return api("/admin/csrf")})
    .then(function(data){csrfToken=data.csrfToken;return api("/admin/portfolio")})
    .then(enterDashboard).catch(function(error){
      loadingView.hidden=true;loginView.hidden=false;
      if(error.message!=="Sign in required"&&error.message!=="Session expired")loginMessage.textContent=error.message;
    });
})();
