const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const GITHUB_REDIRECT_URI =
    "https://bhhpegeenjalkhlajmhekhngmcgjgaki.chromiumapp.org/";

app.use(cors());

app.use(express.json());


// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "PushHub server is running!"
    });

});


// --------------------------------------------------
// Exchange GitHub authorization code for access token
// --------------------------------------------------

app.post("/auth/github/token", async (req, res) => {

    try {

        const { code, codeVerifier } = req.body;

        if (!code || !codeVerifier) {

            return res.status(400).json({
                success: false,
                message: "Missing authorization code or PKCE verifier."
            });

        }


        const githubResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    client_id: GITHUB_CLIENT_ID,

                    client_secret: GITHUB_CLIENT_SECRET,

                    code: code,

                    redirect_uri: GITHUB_REDIRECT_URI,

                    code_verifier: codeVerifier

                })

            }
        );


        const data = await githubResponse.json();


        if (!githubResponse.ok || data.error) {

            console.error(
                "GitHub OAuth error:",
                data
            );

            return res.status(400).json({

                success: false,

                message:
                    data.error_description ||
                    "GitHub authentication failed."

            });

        }


        res.json({

            success: true,

            accessToken:
                data.access_token,

            refreshToken:
                data.refresh_token || null,

            expiresIn:
                data.expires_in || null,

            refreshTokenExpiresIn:
                data.refresh_token_expires_in || null,

            scope:
                data.scope || null

        });

    } catch (error) {

        console.error(
            "OAuth server error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Internal server error."

        });

    }

});


// --------------------------------------------------
// Refresh an expiring GitHub OAuth access token
// --------------------------------------------------

app.post("/auth/github/refresh", async (req, res) => {

    try {

        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Missing GitHub refresh token."
            });
        }

        const githubResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    grant_type: "refresh_token",
                    refresh_token: refreshToken
                })
            }
        );

        const data = await githubResponse.json();

        if (!githubResponse.ok || data.error || !data.access_token) {

            console.error(
                "GitHub OAuth refresh error:",
                data
            );

            return res.status(400).json({
                success: false,
                message:
                    data.error_description ||
                    "GitHub token refresh failed. Please reconnect GitHub."
            });
        }

        return res.json({
            success: true,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || null,
            expiresIn: data.expires_in || null,
            refreshTokenExpiresIn:
                data.refresh_token_expires_in || null,
            scope: data.scope || null
        });

    } catch (error) {

        console.error(
            "GitHub refresh server error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error during GitHub token refresh."
        });
    }

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `PushHub server running on port ${PORT}`
    );

});