/*
github.com/mlenz/dropbox-auth
Simple node example of Dropbox OAuth protocol.
Visit http://localhost:8888/; if cookied, displays a welcome message with
your Dropbox username; otherwise, invokes a login flow:
 1. Obtain a temporary request token
 2. Direct the user to dropbox.com to authorize your app
 3. Acquire a permanent access token
Uses MongoDB to persist the access tokens and a (non-secure)
cookie to store the current Dropbox uid.
*/

var dboxlib = require("dbox");
var mongo = require("mongodb");
var express = require("express");
var http = require("http");
var url = require("url");

var dbox = dboxlib.app({
    "app_key" : process.env.DROPBOX_APP_KEY,
    "app_secret" : process.env.DROPBOX_APP_SECRET,
    "root" : "dropbox"
});

var host = process.env.SERVER_HOST || "";
var port = process.env.PORT || 8888;
var callbackHost = process.env.CALLBACK_HOST || "http://localhost:8888";
var mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/test";

function start() {
    var app = setup();

    mongo.connect(mongoUri, {auto_reconnect : true}, function(err, dbConn) {
        db = dbConn;
        if (err) {
            console.log(err);
        }
    });
    
    // Callback from Dropbox authorization step
    app.get(/\/authorized/, function(req, res) {
        accessToken(req, res);
    });
    
    // If cookied, calls dbox.account with the access token from Mongo
    // to display a welcome message. Otherwise, starts the login process.
    app.get(/\//, function(req, res) {
    	if (req.cookies.uid) {
			dboxClient(req.cookies.uid, function(client) {
				client.account(function(status, reply) {
					if (status == 200) {
						res.write("Welcome " + reply.display_name);
						res.end();
					}
				});
			});
		} else {
			requestToken(res);
		}
	});
    
    // Ask dropbox API for a req token, then forward user to dropbox.com to authorize it
    function requestToken(res) {
        dbox.requesttoken(function(status, req_token) {
            res.writeHead(200, {
                "Set-Cookie" : ["oat=" + req_token.oauth_token, "oats=" + req_token.oauth_token_secret]
            });
            res.write("<script>window.location='https://www.dropbox.com/1/oauth/authorize" +
                    "?oauth_token=" + req_token.oauth_token +
                    "&oauth_callback=" + callbackHost + "/authorized" + "';</script>");
            res.end();
        });
    }
    
    // Dropbox callback after user has authorized app; get access token, persist in a cookie, redirect to home
    function accessToken(req, res) {
        var req_token = {oauth_token : req.cookies.oat, oauth_token_secret : req.cookies.oats};
        dbox.accesstoken(req_token, function(status, access_token) {
            if (status == 401) {
                res.write("Sorry, Dropbox reported an error: ");
                res.write(JSON.stringify(access_token));
            }
            else {
                var expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 365 days
                res.writeHead(302, {
                    "Set-Cookie" : "uid=" + access_token.uid + "; Expires=" + expiry.toUTCString(),
                    "Location" : "/"
                });
                db.collection("user", function(err, collection) {
                    var entry = {};
                    entry.uid = access_token.uid;
                    entry.oauth_token = access_token.oauth_token;
                    entry.oauth_token_secret = access_token.oauth_token_secret;
                    collection.update({"uid": access_token.uid}, {$set: entry}, {upsert:true});
                });
            }
            res.end();
        });
    }
    
    // Wrapper for dbox.client function. Reads auth token and secret from mongo,
    // then invokes the callback with a dbox client object.
    function dboxClient(uid, callback) {
        db.collection("user", function(err, collection) {
            collection.findOne({uid : uid},
            	{fields : {oauth_token : 1, oauth_token_secret : 1, uid : 1}},
            	function(err, item) {
					var token = {};
					token.oauth_token = item ? item.oauth_token : "";
					token.oauth_token_secret = item ? item.oauth_token_secret : "";
					callback(dbox.client(token));
				});
        });
    }
    
    function setup() {
        var app = express();
        
        app.use(express.cookieParser());
        app.use(app.router);
    
        app.listen(port);
        console.log("Server started on port " + port);
        return app;
    }
}

start();
