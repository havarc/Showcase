// js utilities

// get a reference from a string
function str2ref(str){
	str = str.split('.');
	let ref = window;
	str.forEach(elm=>{ref = ref[elm]})
	return ref;
}

// --- randomizer ---
function Randy(seed){
	// http://stackoverflow.com/questions/521295/javascript-random-seeds
	var modifier = 123456789;
	var self = {};
	self.rand = function(){
		var mz = modifier;
		var mw = seed;

		// The 16 least significant bits are multiplied by a constant
		// and then added to the 16 most significant bits. 32 bits result.
		mz = ((mz & 0xffff) * 36969 + (mz >> 16)) & 0xffffffff;
		mw = ((mw & 0xffff) * 18000 + (mw >> 16)) & 0xffffffff;

		modifier = mz;
		seed = mw;

		var x = (((mz << 16) + mw) & 0xffffffff) / 0x100000000;
		//return 0.5 + x;
		return x;
	};
	return self;
}

// --- cookies ---
// deprecated
// localStorage is used instead, see settings
const cookie_manager = function(){
	this.getCookie = function(c_name){
		var c_value = document.cookie;
		var c_start = c_value.indexOf(" " + c_name + "=");
		if (c_start == -1){
			c_start = c_value.indexOf(c_name + "=");
		}
		if (c_start == -1) {
			c_value = null;
		} else {
			c_start = c_value.indexOf("=", c_start) + 1;
			var c_end = c_value.indexOf(";", c_start);
			if (c_end == -1) {
				c_end = c_value.length;
			}
			c_value = unescape(c_value.substring(c_start,c_end));
		}
		return c_value;
	};

	// http://www.w3schools.com/js/js_cookies.asp
	this.setCookie = function(c_name, value, exdays){
		// never expire by default (3y)
		// exdays = exdays || 1000;
		var exdate=new Date();
		exdate.setDate(exdate.getDate() + exdays);
		var c_value=escape(value) + ((!exdays) ? "" : "; expires="+exdate.toUTCString());
		console.log(exdays);
		document.cookie=c_name + "=" + c_value;
	};

	this.checkCookie = function(){
		var username=getCookie("username");
		if (username !== null && username !== "")	{
			alert("Welcome again " + username);
		} else {
			username=prompt("Please enter your name:","");
			if (username !== null && username !== "") {
				setCookie("username", username, 365);
			}
		}
	};
}();

// --- ajax requests ---
async function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        // reject(alert(req.statusText));
        reject(alert([url,req.statusText].join(' ')));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}

async function getJSON(url) {
  return get(url).then(JSON.parse);
}
