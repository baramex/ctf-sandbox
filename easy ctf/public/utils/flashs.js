function createFlash(type, message) {
    var flash = document.createElement("div");
    flash.style.marginTop = "20px";
    flash.style.boxShadow = "0 0 15px #444444"
    flash.className = type + " " + "flash";
    flash.innerHTML = "<p style='display: inline-block;vertical-align: middle;margin: 0;margin-left: 3px;'><img style='vertical-align: middle;' src='/utils/images/flashs/" + type + ".png' width='40px'></p> <p class='mes' style='display: inline-block; padding: 5px;line-height: 40px; margin: 0'>" + message + "</p>";
    document.getElementById("flashDiv").appendChild(flash)
    
    setTimeout(function() {
        $(flash).fadeOut(500, function() {
            flash.remove();
        });
    }, 2500)
}