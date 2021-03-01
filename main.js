const {app, BrowserWindow, ipcMain} = require('electron');
const twitterAPI = require("node-twitter-api");
const path = require('path')
const config = require("./config");

let window

function createWindow() {
    // Create the main window.
    window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: false
        }
    })

    window.loadFile('index.html')

    // Emitted when the window is closed.
    window.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        window = null
    })
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (window === null) {
        createWindow()
    }
})

//twitter login event
ipcMain.on("do-twitter-login", (event, arg) => {

    //initialize twitter api using credentials
    const twitter = new twitterAPI({
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callback: config.twitter.callback,
    });

    let authWindow = new BrowserWindow({
        width: 650,
        height: 800,
        show: false,
        parent: window
    });

    authWindow.center();

    authWindow.webContents.on("did-finish-load", function () {
        authWindow.show();
    });

    let closedByUser = true,
        isVerified = false;
    let auth_verifier,
        requestTokenSecret,
        requestToken,
        accessToken,
        accessTokenSecret

    /* obtaining requestToken and secret.
    using requestToken, we can redirect to authorized url */

    twitter.getRequestToken((auth_error, token, tokenSecret) => {
        if (auth_error) {
            console.log("Error getting OAuth request token : ", JSON.stringify(auth_error));
        } else {
            requestToken = token;
            requestTokenSecret = tokenSecret;
            authWindow.loadURL(config.twitter.authUrl + token);
        }
    });

    const handleUrl = function (url) {
        //getting verifier from authorized url
        let raw_auth_verifier = /oauth_verifier=([^&]*)/.exec(url) || null;
        auth_verifier =
            raw_auth_verifier && raw_auth_verifier.length > 1
                ? raw_auth_verifier[1]
                : null;

        let auth_denied = /denied=([^&]*)/.exec(url) || null;

        if (auth_verifier) {
            closedByUser = false;

            /*From verifier and requestToken, getting oAuthToken and oAuthSecret,
            using this token and secret, we can sign in to twitter */
            twitter.getAccessToken(
                requestToken,
                requestTokenSecret,
                auth_verifier,
                (auth_error, token, secret) => {
                    if (auth_error) {
                        console.log(auth_error)
                    } else {
                        accessToken = token;
                        accessTokenSecret = secret;
                        event.sender.send("twitter-login", {
                            accessToken,
                            accessTokenSecret, auth_error
                        });
                    }
                }
            );
            isVerified = true;
        }

        if (auth_denied || isVerified) {
            authWindow.close();
        }
    };

    authWindow.webContents.on("will-navigate", (event, url) => {
        handleUrl(url);
    });

    authWindow.on("close", () => {
        if (closedByUser) {
            event.sender.send("twitter-login", {
                error: "Twitter Window Closed By User",
            });
        }
    });
})