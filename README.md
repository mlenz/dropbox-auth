Dropbox Authentication
----------------------

A node.js example of a Dropbox API app that requests a user
to authorize access to the user's Dropbox.

This uses the OAuth 1.0 protocol as documented in the
[Dropbox API](https://www.dropbox.com/developers/core/docs).

It also illustrates the use of MongoDB to persist the user's access token.

### Installation

1. Get a Dropbox API key.
2. Set up and run a MongoDB instance.
3. Edit environment variables as below.
4. `npm install` to download dependencies (dbox, mongodb, express).
5. `node server.js` to launch the web app.
6. Browse to [http://localhost:8888/](http://localhost:8888/)

### Environment Variables

    DROPBOX_APP_KEY =
    DROPBOX_APP_SECRET =
    MONGO_URI = mongodb://localhost:27017/test
    CALLBACK_HOST = http://localhost:8888

### Operation

* Visit http://localhost:8888/
* If cookied, displays a welcome message with your Dropbox username
* Otherwise, invokes the authorization flow:
 1. Obtain a temporary request token
 2. Direct the user to dropbox.com to authorize your app
 3. Acquire a permanent access token
