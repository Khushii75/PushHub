const GITHUB_CLIENT_ID =
    "0v231ip059XtZTmx0jUY";

const GITHUB_REDIRECT_URI =
    "https://bhhpegeenjalkhlajmhekhngmcgjgaki.chromiumapp.org/";

const BACKEND_URL =
    "http://localhost:3000";


// --------------------------------------------------
// Generate random PKCE verifier
// --------------------------------------------------

function generateCodeVerifier() {

    const array =
        new Uint8Array(32);

    crypto.getRandomValues(array);

    return Array
        .from(array)
        .map(byte =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");

}


// --------------------------------------------------
// Generate PKCE challenge
// --------------------------------------------------

async function generateCodeChallenge(verifier) {

    const encoder =
        new TextEncoder();

    const data =
        encoder.encode(verifier);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(digest)
        )
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

}


// --------------------------------------------------
// Generate OAuth state
// --------------------------------------------------

function generateState() {

    const array =
        new Uint8Array(32);

    crypto.getRandomValues(array);

    return Array
        .from(array)
        .map(byte =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");

}


// --------------------------------------------------
// Start GitHub authentication
// --------------------------------------------------

async function connectGitHub() {

    console.log(
        "DSA GrindHub: Starting GitHub authentication..."
    );


    const codeVerifier =
        generateCodeVerifier();

    const codeChallenge =
        await generateCodeChallenge(
            codeVerifier
        );

    const state =
        generateState();


    await chrome.storage.local.set({

        githubOAuthState: state,

        githubCodeVerifier: codeVerifier

    });


    const params =
        new URLSearchParams({

            client_id:
                GITHUB_CLIENT_ID,

            redirect_uri:
                GITHUB_REDIRECT_URI,

            scope:
                "repo",

            state:
                state,

            code_challenge:
                codeChallenge,

            code_challenge_method:
                "S256"

        });


    const authorizationURL =
        "https://github.com/login/oauth/authorize?" +
        params.toString();


    console.log(
        "DSA GrindHub: Opening GitHub authorization..."
    );


    const responseURL =
        await chrome.identity.launchWebAuthFlow({

            url: authorizationURL,

            interactive: true

        });


    if (!responseURL) {

        throw new Error(
            "GitHub authentication was cancelled."
        );

    }


    console.log(
        "DSA GrindHub: GitHub redirected back."
    );


    const callbackURL =
        new URL(responseURL);


    const returnedState =
        callbackURL.searchParams.get("state");

    const code =
        callbackURL.searchParams.get("code");

    const error =
        callbackURL.searchParams.get("error");


    if (error) {

        throw new Error(
            "GitHub authorization failed: " +
            error
        );

    }


    if (!returnedState || returnedState !== state) {

        throw new Error(
            "OAuth state validation failed."
        );

    }


    if (!code) {

        throw new Error(
            "GitHub authorization code was not received."
        );

    }


    // --------------------------------------------------
    // Send authorization code to backend
    // --------------------------------------------------

    const tokenResponse =
        await fetch(
            `${BACKEND_URL}/auth/github/token`,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    code:
                        code,

                    codeVerifier:
                        codeVerifier

                })

            }
        );


    const tokenData =
        await tokenResponse.json();


    if (!tokenResponse.ok || !tokenData.success) {

        throw new Error(
            tokenData.message ||
            "Failed to exchange GitHub authorization code."
        );

    }


    // --------------------------------------------------
    // Store authentication information
    // --------------------------------------------------

    await chrome.storage.local.set({

        githubAuthenticated: true,

        githubAccessToken:
            tokenData.accessToken,

        githubRefreshToken:
            tokenData.refreshToken || null,

        githubTokenExpiresIn:
            tokenData.expiresIn || null,

        githubRefreshTokenExpiresIn:
            tokenData.refreshTokenExpiresIn || null,

        githubTokenCreatedAt:
            Date.now()

    });


    // Clean up temporary OAuth data

    await chrome.storage.local.remove([

        "githubOAuthState",

        "githubCodeVerifier"

    ]);


    console.log(
        "DSA GrindHub: GitHub authentication successful!"
    );


    return true;

}


// --------------------------------------------------
// Get stored GitHub authentication
// --------------------------------------------------

async function getGitHubAuthStatus() {

    const result =
        await chrome.storage.local.get([

            "githubAuthenticated",

            "githubUsername",

            "githubAccessToken"

        ]);


    return {

        authenticated:
            result.githubAuthenticated || false,

        username:
            result.githubUsername || null,

        accessToken:
            result.githubAccessToken || null

    };

}


// --------------------------------------------------
// Logout
// --------------------------------------------------

async function logoutGitHub() {

    await chrome.storage.local.remove([

        "githubAuthenticated",

        "githubUsername",

        "githubAccessToken",

        "githubRefreshToken",

        "githubTokenExpiresIn",

        "githubRefreshTokenExpiresIn",

        "githubTokenCreatedAt"

    ]);


    console.log(
        "DSA GrindHub: GitHub logged out."
    );

}