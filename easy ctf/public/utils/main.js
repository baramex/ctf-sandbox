const socket = io();

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function setCookie(name, value, time) {
  var date = new Date();
  date.setTime(date.getTime()+(time));
  var expires = "; expires="+date.toGMTString();

  document.cookie = name+"="+value+expires+"; path=/";
}

socket.on("setCookie", cookie => {
    document.cookie = cookie;
});

function rn(max) {
  return Math.floor (Math.random() * max)
}

function generateKey(len = 16) {
  var [num, alpb, alps] = ["0123456789", "ABCDEFGHIJKLMNOPQRSTUVWXTZ", "abcdefghiklmnopqrstuvwxyz"]
	var [chars, key] = [(alpb + num + alps).split(''),""];
  for(var i = 0; i < len; i++) {
    key += chars[rn(chars.length)]
  };
	return key;
}

function load() {
  if(getCookie("token")&&getCookie("userID")) {
    var newToken = generateKey(25);
    socket.emit("actSession", {userID: getCookie("userID"), key: "token", value: newToken});
    setCookie("token", newToken, 1000*60*60*2);
  }
}