const lowdb = require("lowdb");
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');
var rand = require("generate-key");
var passwordHash = require('password-hash');

var express = require('express');
var app = express();
const http = require('http');
const httpServer = http.Server(app);
var server = app.listen(8001);
app.use(express.static('public'));
const router = express.Router();
var cookie = require("cookie");

var io = require('socket.io')(server);

var userDB = lowdb(new FileSync("databases/users.json"));
var sessions = [];

io.on('connection', function(socket) {
    socket.on('getSession', () => {
        var cookies = cookie.parse(socket.handshake.headers.cookie);
        var session = getSession(cookies.token, cookies.userID, socket.request.connection.remoteAddress||socket.handshake.headers['x-forwarded-for']);
        if(session) {
            socket.emit("getSessionResult", {session: {session: session, pseudo: userDB.find({userID: cookies.userID}).value().pseudo}, status: 200});
        }
        else {
            socket.emit("getSessionResult", {status: 400})
        }
    });

    socket.on('createSession', data => {
        socket.emit("createSessionResult", createSession(null, socket.request.connection.remoteAddress||socket.handshake.headers['x-forwarded-for'], data.email, data.password, socket));
    });

    socket.on("createAccount", data => {
        var mediumRegex = new RegExp("^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})");

        function validMail(mail) {
            return /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(mail);
        }

        var status = 400;
        if(data.email.replace(/ /g, "") != "" && data.pseudo.replace(/ /g, "") != "" && data.password.replace(/ /g, "") != "" && mediumRegex.test(data.password) && validMail(data.email) && !userDB.find({email: data.email}).value()) {
            var userID;
            do {
                userID = rand.generateKey(10);
            }
            while(userDB.find({userID: userID}).value());
            userDB.push({userID: userID, pseudo: data.pseudo, email: data.email, password: passwordHash.generate(data.password), status: 0, createAt: new Date().getTime()}).write();
            createSession(userID, socket.request.connection.remoteAddress||socket.handshake.headers['x-forwarded-for'], data.email, data.password, socket);
            status = 200;
        }

        socket.emit("createAccountResult", status);
    });
});

function createSession(id, ip, email, password, socket) {
    var status = 400;
    var infos = {};
    if(ip && email && password) {
        var user;
        if(id) user = userDB.find({email: email, userID: id}).value();
        else user = userDB.find({email: email}).value();
        if(user) {
            id = user.userID;
            if(passwordHash.verify(password, user.password)) {
                var date = new Date();
                date.setHours(new Date().getHours()+2);
                var token;
                do {
                    token = rand.generateKey(25);
                }
                while(sessions.find(a => a.token == token));
                infos.token = token;
                infos.pseudo = user.pseudo;
                setCookieSocket("userID", id, socket, 1000*60*60*2);
                setCookieSocket("token", token, socket, 1000*60*60*2);
                if(sessions.find(a => a.userID == id)) {
                    sessions.splice(sessions.findIndex(a => a.userID == id), 1);
                }
                sessions.push({token: token, userID: id, localIP: ip, expireDate: date.getTime()});
                status = 200;
            }
            else {
                status = 403;
            }
        }
        else {
            status = 403;
        }
    }
    else {
        status = 401;
    }
    infos.status = status;
    return infos;
}

function setCookieSocket(name, value, socket, time) {
    var date = new Date();
    date.setTime(date.getTime()+(time));
    var expires = "; expires="+date.toGMTString();

    socket.emit("setCookie", name+"="+value+expires+"; path=/");
}

function getSession(token, userID, ip) {
    if(!token || !userID || !ip) {
        return undefined;
    }
    return sessions.find(a => a.token == token && a.expireDate > new Date().getTime() && a.localIP == ip && a.userID == userID);
}

router.get("*", (req, res) => {
    var orgURL = req.originalUrl.endsWith("/")?req.originalUrl:req.originalUrl+"/";

    var session = getSession(getCookie(req.headers.cookie, "token"), getCookie(req.headers.cookie, "userID"), (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    if(!session && req.path != "/login" && req.path != "/signup") {
        res.redirect("/login");
        return;
    }

    if(session && req.path != "/") {
        res.redirect("/");
        return;
    }

    let path = __dirname.replace(/\\/g, "/") + "/pages" + orgURL + "index.html";

    var content;
    if(fs.existsSync(path)) {
        content = fs.readFileSync(path).toString();
    }
    else {
        res.redirect("/");
        return;
    }

    res.send(content);
});

app.get("*", router);

const getCookie = (cookies,name)=>{
    if(!cookies || !name) return null;
    const arrOfCookies = cookies.split(' ')
    let yourCookie = null

    arrOfCookies.forEach(element => {
        if(element.includes(name)){
            yourCookie = element.replace(name+'=','')
        }
    });
    if(yourCookie) yourCookie = yourCookie.replace(/;/g, "");
    return yourCookie;
}

function update() {
    if(sessions.find(a => a.expireDate < new Date().getTime())) {
        sessions.splice(sessions.findIndex(a => a.expireDate < new Date().getTime()), 1);
    }
}

setInterval(() => {
    update();
}, 1000*60);