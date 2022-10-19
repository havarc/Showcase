/// settings manager
/// draws and stores to localStorage
/// can keep track of things to store on unload
/// can also use custom serializer function

var settings = JSON.parse(localStorage.getItem(page_name)) || {};
// allow to set a default if there's nothing in the config
settings.set_default = function(name, obj){
	this[name] = this[name] || obj;
}

(()=>{
  let settings_cache = [];
  // tracks an object for storage on close
	settings.track = function(obj){

	}
})()


// load current setting
// TODO: set this for onload
function load_settings(){
  window.settings = JSON.parse(localStorage.getItem(page_name));
  // sets.forEach(set=>{settings[set.name] = set});
  console.log(window.settings);
}
