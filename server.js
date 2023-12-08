const express = require('express');
const twtSdk = require("twitter-api-sdk");
const path = require('path');
require('dotenv').config({path: __dirname + '/.env'});

const app = express();
const port = 3000;
const state = "randomStateVar"; // needed for generating auth url


// auth client
const authClient = new twtSdk.auth.OAuth2User({
    client_id: process.env.TWITTER_CONSUMER_KEY,
    client_secret: process.env.TWITTER_CONSUMER_SECRET,
    callback: process.env.CALLBACK_URL,
    scopes: ["users.read", "tweet.read"],
});

const client = new twtSdk.Client(authClient);

app.use(express.static(path.join(__dirname, 'public')));

// routes
app.get("/auth/twitter", async function (req, res) {
    const authUrl = authClient.generateAuthURL({
        state,
        code_challenge_method: "s256",
    });
    res.redirect(authUrl);
});

app.get("/auth/twitter/callback", async function (req, res) {
    try {
        const { code, resState } = req.query;

        if (code !== null || resState !== null) {
            // Both code and state are not null

            // can add extra validation here
            const accessToken = await authClient.requestAccessToken(code); // can store if needed
            res.redirect("/user");

        } else {
            return res.status(500).send("Either code or resState is null");
        }
    } catch (error) {
        console.log(error);
    }
});

app.get("/user", async function (req, res) {
  // no auth key required
    const { data } = await client.users.findMyUser({
        "user.fields": ["profile_image_url", "description", "name"],
    });
    if (!data) return res.status(500).send()
    res.send(renderProfile({ profile_image_url: data.profile_image_url, name: data.name, description: data.description }));
});

app.get("/auth/revoke", async function (req, res) {
    try {
        const response = await authClient.revokeAccessToken();
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
});

app.listen(port, () => {});


// helper func
function renderProfile({ profile_image_url, name, description }) {
    return `
<head>
  <style>
    .profile {
      width: 20%;
      margin: auto;
      text-align: center;
    }

    .profile img {
      width: 100%;
      border-radius: 50%; /* Make the image circular */
    }

    .container {
      padding: 4px 15px;
    }

    button {
      margin-top: 10px; /* Add space between the container and the button */
      padding: 10px 20px; /* Increase button size */
      font-size: 1em; /* Adjust the font size as needed */
    }
  </style>
</head>

<body>
  <div class="profile">
    <img src="${profile_image_url}" alt="profile_image_url">
    <div class="container">
      <h4><b>${name}</b></h4>
      <p>${description}</p>
    </div>
    <button onclick="revokeTwitterAuth()">Revoke access</button>

    <script>
      function revokeTwitterAuth() {
        window.location.href = 'http://localhost:3000/revoke';
      }
    </script>
  </div>
</body>
`;
}