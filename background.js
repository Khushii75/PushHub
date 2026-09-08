/* =========================================
   PUSHHUB - BACKGROUND SERVICE WORKER
========================================= */

console.log("PushHub: Background service worker loaded.");


/* =========================================
   CONFIGURATION
========================================= */

const GITHUB_CLIENT_ID =
    "Ov23lip059XtZTmx0juY";

const GITHUB_REDIRECT_URI =
    "https://bhhpegeenjalkhlajmhekhngmcgjgaki.chromiumapp.org/";

const BACKEND_URL =
    "https://pushhub-ol22.onrender.com";

const README_START_MARKER =
    "<!-- DSA-GRINDHUB:START -->";

const README_END_MARKER =
    "<!-- DSA-GRINDHUB:END -->";


const README_TOPIC_ORDER = [
    "Array",
    "String",
    "Linked-List",
    "Hash-Table",
    "Stack",
    "Queue",
    "Heap",
    "Tree",
    "Binary-Tree",
    "Binary-Search-Tree",
    "Graph",
    "Dynamic-Programming",
    "Greedy",
    "Backtracking",
    "Trie",
    "Mathematics",
    "Matrix",
    "Two-Pointers",
    "Sliding-Window",
    "Binary-Search",
    "Sorting",
    "Bit-Manipulation",
    "Recursion",
    "Divide-and-Conquer",
    "Prefix-Sum",
    "Monotonic-Stack",
    "Union-Find",
    "Simulation",
    "Design",
    "Brute-Force",
    "Implementation",
    "Database",
    "Other"
];


/* =========================================
   PKCE
========================================= */

function generateRandomString(length = 64) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

    const values =
        new Uint8Array(length);

    crypto.getRandomValues(values);

    return Array.from(
        values,
        value =>
            characters[
                value % characters.length
            ]
    ).join("");
}


function base64UrlEncode(buffer) {

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(buffer)
        )
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}


async function createCodeChallenge(verifier) {

    const data =
        new TextEncoder().encode(verifier);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return base64UrlEncode(digest);
}


/* =========================================
   GITHUB AUTH
========================================= */

async function connectGitHub() {

    const codeVerifier =
        generateRandomString();

    const codeChallenge =
        await createCodeChallenge(
            codeVerifier
        );

    const authUrl =
        new URL(
            "https://github.com/login/oauth/authorize"
        );

    authUrl.searchParams.set(
        "client_id",
        GITHUB_CLIENT_ID
    );

    authUrl.searchParams.set(
        "redirect_uri",
        GITHUB_REDIRECT_URI
    );

    authUrl.searchParams.set(
        "response_type",
        "code"
    );

    authUrl.searchParams.set(
        "scope",
        "repo"
    );

    authUrl.searchParams.set(
        "code_challenge",
        codeChallenge
    );

    authUrl.searchParams.set(
        "code_challenge_method",
        "S256"
    );

    const redirectUrl =
        await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true
        });

    if (!redirectUrl) {
        throw new Error(
            "GitHub authentication was cancelled."
        );
    }

    const redirect =
        new URL(redirectUrl);

    const code =
        redirect.searchParams.get("code");

    if (!code) {

        throw new Error(
            redirect.searchParams.get("error") ||
            "GitHub authorization code was not received."
        );
    }

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
                    code,
                    codeVerifier
                })
            }
        );

    const tokenData =
        await tokenResponse.json();

    if (
        !tokenResponse.ok ||
        !tokenData.success
    ) {

        throw new Error(
            tokenData.message ||
            "GitHub token exchange failed."
        );
    }

    const accessToken =
        tokenData.accessToken;

    if (!accessToken) {
        throw new Error(
            "GitHub access token was not returned."
        );
    }

    const userResponse =
        await fetch(
            "https://api.github.com/user",
            {
                method: "GET",
                headers: {
                    "Authorization":
                        `Bearer ${accessToken}`,
                    "Accept":
                        "application/vnd.github+json",
                    "X-GitHub-Api-Version":
                        "2022-11-28"
                }
            }
        );

    if (!userResponse.ok) {
        throw new Error(
            "Could not retrieve GitHub user."
        );
    }

    const user =
        await userResponse.json();

    await chrome.storage.local.set({

        githubAuthenticated:
            true,

        githubUsername:
            user.login,

        githubAccessToken:
            accessToken,

        githubToken:
            accessToken,

        githubRefreshToken:
            tokenData.refreshToken,

        githubTokenExpiresIn:
            tokenData.expiresIn,

        githubRefreshTokenExpiresIn:
            tokenData.refreshTokenExpiresIn,

        githubTokenScope:
            tokenData.scope
    });

    return {
        success: true,
        username: user.login
    };
}


/* =========================================
   REPOSITORIES
========================================= */

async function getGitHubRepositories() {

    const result =
        await chrome.storage.local.get([
            "githubAccessToken",
            "githubUsername"
        ]);

    if (!result.githubAccessToken) {
        throw new Error(
            "GitHub access token is missing. Connect GitHub first."
        );
    }

    const response =
        await fetch(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            {
                method: "GET",
                headers: {
                    "Authorization":
                        `Bearer ${result.githubAccessToken}`,
                    "Accept":
                        "application/vnd.github+json",
                    "X-GitHub-Api-Version":
                        "2022-11-28"
                }
            }
        );

    if (!response.ok) {

        throw new Error(
            `GitHub repository fetch failed (${response.status}): ${await response.text()}`
        );
    }

    const repositories =
        await response.json();

    return {

        success: true,

        repositories:
            repositories.map(repository => ({
                id:
                    repository.id,

                name:
                    repository.name,

                fullName:
                    repository.full_name,

                private:
                    repository.private,

                defaultBranch:
                    repository.default_branch,

                htmlUrl:
                    repository.html_url
            }))
    };
}


/* =========================================
   FETCH WITH TIMEOUT
========================================= */

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 20000
) {

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {

        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                `GitHub request timed out after ${timeout / 1000} seconds.`
            );
        }

        throw error;

    } finally {

        clearTimeout(timeoutId);
    }
}


/* =========================================
   BASE64
========================================= */

function base64EncodeUnicode(text) {

    const bytes =
        new TextEncoder().encode(text);

    let binary = "";

    const chunkSize = 0x8000;

    for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
    ) {

        binary +=
            String.fromCharCode(
                ...bytes.subarray(
                    i,
                    i + chunkSize
                )
            );
    }

    return btoa(binary);
}


function decodeGitHubContent(base64Content) {

    if (!base64Content) {
        return "";
    }

    const binary =
        atob(
            base64Content.replace(
                /\n/g,
                ""
            )
        );

    const bytes =
        Uint8Array.from(
            binary,
            character =>
                character.charCodeAt(0)
        );

    return new TextDecoder().decode(bytes);
}


/* =========================================
   LANGUAGE → EXTENSION
========================================= */

function getFileExtension(language) {

    const value =
        String(language || "")
            .toLowerCase()
            .trim();

    if (
        value.includes("c++") ||
        value.includes("cpp") ||
        value.includes("gnu++")
    ) {
        return ".cpp";
    }

    if (
        value.includes("python") ||
        value.includes("pypy")
    ) {
        return ".py";
    }

    if (
        value.includes("javascript") ||
        value === "js"
    ) {
        return ".js";
    }

    if (
        value.includes("typescript") ||
        value === "ts"
    ) {
        return ".ts";
    }

    if (
        value.includes("java") &&
        !value.includes("javascript")
    ) {
        return ".java";
    }

    if (value.includes("kotlin")) {
        return ".kt";
    }

    if (value.includes("rust")) {
        return ".rs";
    }

    if (
        value.includes("golang") ||
        value === "go"
    ) {
        return ".go";
    }

    if (
        value.includes("c#") ||
        value.includes("csharp")
    ) {
        return ".cs";
    }

    if (value === "c") {
        return ".c";
    }

    if (value.includes("swift")) {
        return ".swift";
    }

    if (value.includes("php")) {
        return ".php";
    }

    if (value.includes("ruby")) {
        return ".rb";
    }

    if (value.includes("scala")) {
        return ".scala";
    }

    if (value.includes("dart")) {
        return ".dart";
    }

    if (value.includes("sql")) {
        return ".sql";
    }

    if (
        value.includes("shell") ||
        value.includes("bash")
    ) {
        return ".sh";
    }

    return ".txt";
}


/* =========================================
   LANGUAGE NORMALIZATION
========================================= */

function normalizeLanguage(language) {

    const value =
        String(language || "")
            .toLowerCase()
            .trim();

    if (
        value.includes("c++") ||
        value.includes("cpp")
    ) {
        return "C++";
    }

    if (
        value.includes("python") ||
        value.includes("pypy")
    ) {
        return "Python";
    }

    if (value.includes("javascript")) {
        return "JavaScript";
    }

    if (value.includes("typescript")) {
        return "TypeScript";
    }

    if (
        value.includes("java") &&
        !value.includes("javascript")
    ) {
        return "Java";
    }

    if (value.includes("kotlin")) {
        return "Kotlin";
    }

    if (value.includes("rust")) {
        return "Rust";
    }

    if (
        value.includes("golang") ||
        value === "go"
    ) {
        return "Go";
    }

    if (
        value.includes("c#") ||
        value.includes("csharp")
    ) {
        return "CSharp";
    }

    if (value === "c") {
        return "C";
    }

    if (value.includes("swift")) {
        return "Swift";
    }

    if (value.includes("php")) {
        return "PHP";
    }

    if (value.includes("ruby")) {
        return "Ruby";
    }

    if (value.includes("scala")) {
        return "Scala";
    }

    if (value.includes("dart")) {
        return "Dart";
    }

    if (value.includes("sql")) {
        return "SQL";
    }

    if (
        value.includes("shell") ||
        value.includes("bash")
    ) {
        return "Shell";
    }

    return "Other";
}


/* =========================================
   SANITIZE
========================================= */

function sanitizeName(value) {

    return String(value || "")
        .trim()
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        );
}


function formatNumericProblemNumber(number) {

    const value =
        String(number ?? "").trim();

    if (!/^\d+$/.test(value)) {
        return null;
    }

    return value.padStart(4, "0");
}


/* =========================================
   PLATFORM
========================================= */

function normalizePlatform(platform) {

    const value =
        String(platform || "")
            .toLowerCase()
            .trim();

    const map = {

        leetcode:
            "leetcode",

        gfg:
            "gfg",

        geeksforgeeks:
            "gfg",

        hackerrank:
            "hackerrank",

        codechef:
            "codechef",

        codeforces:
            "codeforces"
    };

    return map[value] || value || "unknown";
}


/* =========================================
   PROBLEM IDENTIFIER
========================================= */

function getProblemIdentifier(submission) {

    const platform =
        normalizePlatform(
            submission.platform
        );


    if (
        platform ===
        "leetcode"
    ) {

        return (
            formatNumericProblemNumber(
                submission.problemNumber
            )

            ||

            sanitizeName(
                submission.problemNumber
            )

            ||

            sanitizeName(
                submission.problemSlug
            )

            ||

            "Unknown"
        );
    }


    if (
        platform ===
        "gfg"
    ) {

        const number =
            String(
                submission.problemNumber ||
                ""
            ).trim();

        if (/^\d+$/.test(number)) {

            return formatNumericProblemNumber(
                number
            );
        }

        const slug =
            String(
                submission.problemSlug ||
                ""
            ).trim();

        const trailingNumber =
            slug.match(/(\d+)$/);

        if (trailingNumber) {

            return formatNumericProblemNumber(
                trailingNumber[1]
            );
        }

        return (
            sanitizeName(slug) ||
            "Unknown"
        );
    }


    if (
        platform ===
        "hackerrank"
    ) {

        return (
            formatNumericProblemNumber(
                submission.problemNumber
            )

            ||

            sanitizeName(
                submission.problemNumber
            )

            ||

            sanitizeName(
                submission.problemSlug
            )

            ||

            "Unknown"
        );
    }


    if (
        platform ===
        "codechef"
    ) {

        return (
            sanitizeName(
                submission.problemNumber
            )

            ||

            sanitizeName(
                submission.problemSlug
            )

            ||

            "Unknown"
        );
    }


    if (
        platform ===
        "codeforces"
    ) {

        const existing =
            String(
                submission.problemNumber ||
                ""
            ).trim();

        if (
            /^\d+[A-Za-z][A-Za-z0-9]*$/.test(
                existing
            )
        ) {

            return sanitizeName(
                existing
            );
        }

        if (
            submission.contestId &&
            existing
        ) {

            return sanitizeName(
                `${submission.contestId}${existing}`
            );
        }

        return (
            sanitizeName(existing) ||

            sanitizeName(
                submission.problemSlug
            ) ||

            "Unknown"
        );
    }


    return (
        sanitizeName(
            submission.problemNumber
        )

        ||

        sanitizeName(
            submission.problemSlug
        )

        ||

        "Unknown"
    );
}


/* =========================================
   TOPIC CLASSIFICATION
========================================= */

function getPrimaryTopicFolder(
    topics,
    problemTitle = ""
) {

    const ignored =
        new Set([

            "prepare",
            "codechef",
            "leetcode",
            "hackerrank",
            "gfg",
            "geeksforgeeks",
            "codeforces",
            "practice",
            "problem solving",
            "competitive programming",
            "programming",
            "tutorial",
            "school",
            "basic",
            "beginner",
            "easy",
            "medium",
            "hard"
        ]);


    const map = {

        "array":
            "Array",

        "arrays":
            "Array",

        "string":
            "String",

        "strings":
            "String",

        "hash":
            "Hash-Table",

        "hash table":
            "Hash-Table",

        "hashmap":
            "Hash-Table",

        "hash map":
            "Hash-Table",

        "linked list":
            "Linked-List",

        "linked lists":
            "Linked-List",

        "stack":
            "Stack",

        "stacks":
            "Stack",

        "queue":
            "Queue",

        "queues":
            "Queue",

        "heap":
            "Heap",

        "heaps":
            "Heap",

        "priority queue":
            "Heap",

        "tree":
            "Tree",

        "trees":
            "Tree",

        "binary tree":
            "Binary-Tree",

        "binary trees":
            "Binary-Tree",

        "binary search tree":
            "Binary-Search-Tree",

        "bst":
            "Binary-Search-Tree",

        "graph":
            "Graph",

        "graphs":
            "Graph",

        "dynamic programming":
            "Dynamic-Programming",

        "dp":
            "Dynamic-Programming",

        "greedy":
            "Greedy",

        "backtracking":
            "Backtracking",

        "trie":
            "Trie",

        "tries":
            "Trie",

        "math":
            "Mathematics",

        "mathematics":
            "Mathematics",

        "number theory":
            "Mathematics",

        "matrix":
            "Matrix",

        "matrices":
            "Matrix",

        "two pointers":
            "Two-Pointers",

        "sliding window":
            "Sliding-Window",

        "binary search":
            "Binary-Search",

        "sorting":
            "Sorting",

        "bit manipulation":
            "Bit-Manipulation",

        "bitwise":
            "Bit-Manipulation",

        "recursion":
            "Recursion",

        "divide and conquer":
            "Divide-and-Conquer",

        "prefix sum":
            "Prefix-Sum",

        "monotonic stack":
            "Monotonic-Stack",

        "union find":
            "Union-Find",

        "disjoint set":
            "Union-Find",

        "simulation":
            "Simulation",

        "design":
            "Design",

        "brute force":
            "Brute-Force",

        "implementation":
            "Implementation",

        "database":
            "Database",

        "databases":
            "Database"
    };


    if (Array.isArray(topics)) {

        for (const topic of topics) {

            const name =
                typeof topic === "string"
                    ? topic
                    : topic?.name;

            if (!name) {
                continue;
            }

            const cleaned =
                name
                    .trim()
                    .toLowerCase()
                    .replace(
                        /[-_]+/g,
                        " "
                    )
                    .replace(
                        /\s+/g,
                        " "
                    );

            if (ignored.has(cleaned)) {
                continue;
            }

            if (map[cleaned]) {
                return map[cleaned];
            }
        }
    }


    const title =
        String(
            problemTitle || ""
        ).toLowerCase();


    if (
        title.includes("array") ||
        title.includes("subarray") ||
        title.includes("kadane") ||
        title.includes("two sum") ||
        title.includes("reverse an array") ||
        title.includes("reverse array")
    ) {
        return "Array";
    }


    if (
        title.includes("string") ||
        title.includes("palindrome") ||
        title.includes("anagram") ||
        title.includes("substring") ||
        title.includes("subsequence") ||
        title.includes("character") ||
        title.includes("word")
    ) {
        return "String";
    }


    if (
        title.includes("linked list")
    ) {
        return "Linked-List";
    }


    if (
        title.includes("stack") ||
        title.includes("parentheses") ||
        title.includes("bracket")
    ) {
        return "Stack";
    }


    if (
        title.includes("queue") ||
        title.includes("deque")
    ) {
        return "Queue";
    }


    if (
        title.includes("binary tree") ||
        title.includes("binary search tree") ||
        title.includes("bst")
    ) {
        return "Binary-Tree";
    }


    if (
        title.includes("tree") ||
        title.includes("traversal")
    ) {
        return "Tree";
    }


    if (
        title.includes("graph") ||
        title.includes("dfs") ||
        title.includes("bfs") ||
        title.includes("shortest path") ||
        title.includes("dijkstra")
    ) {
        return "Graph";
    }


    if (
        title.includes("dynamic programming") ||
        /\bdp\b/.test(title) ||
        title.includes("knapsack") ||
        title.includes("longest common subsequence")
    ) {
        return "Dynamic-Programming";
    }


    if (
        title.includes("fibonacci") ||
        title.includes("prime") ||
        title.includes("number theory") ||
        title.includes("gcd") ||
        title.includes("lcm") ||
        title.includes("factorial") ||
        title.includes("mathematics") ||
        title.includes("power")
    ) {
        return "Mathematics";
    }


    if (
        title.includes("bit manipulation") ||
        title.includes("bitwise") ||
        title.includes("xor") ||
        title.includes("bit++")
    ) {
        return "Bit-Manipulation";
    }


    if (title.includes("greedy")) {
        return "Greedy";
    }


    if (title.includes("backtracking")) {
        return "Backtracking";
    }


    if (title.includes("sorting")) {
        return "Sorting";
    }


    if (title.includes("binary search")) {
        return "Binary-Search";
    }


    if (title.includes("brute force")) {
        return "Brute-Force";
    }


    if (
        title.includes("database") ||
        title.includes("sql") ||
        title.includes("table")
    ) {
        return "Database";
    }


    return "Other";
}


/* =========================================
   PROBLEM URL
========================================= */

function getProblemUrl(submission) {

    const explicit =
        submission?.problemUrl ||
        submission?.problemURL;

    if (
        explicit &&
        /^https?:\/\//i.test(
            String(explicit)
        )
    ) {
        return String(explicit);
    }

    const platform =
        normalizePlatform(
            submission?.platform
        );


    if (
        platform === "leetcode" &&
        submission?.problemSlug
    ) {

        return (
            `https://leetcode.com/problems/` +
            `${submission.problemSlug}/`
        );
    }


    if (
        platform === "gfg" &&
        submission?.problemSlug
    ) {

        return (
            `https://www.geeksforgeeks.org/problems/` +
            `${submission.problemSlug}/1`
        );
    }


    if (
        platform === "hackerrank" &&
        submission?.problemSlug
    ) {

        return (
            `https://www.hackerrank.com/challenges/` +
            `${submission.problemSlug}/problem`
        );
    }


    if (
        platform === "codechef" &&
        submission?.problemNumber
    ) {

        return (
            `https://www.codechef.com/problems/` +
            encodeURIComponent(
                submission.problemNumber
            )
        );
    }


    if (
        platform === "codeforces" &&
        submission?.contestId &&
        submission?.problemNumber
    ) {

        let index =
            String(
                submission.problemNumber
            ).trim();

        const contest =
            String(
                submission.contestId
            );

        if (
            index.startsWith(contest)
        ) {

            index =
                index.slice(
                    contest.length
                );
        }

        return (
            `https://codeforces.com/contest/` +
            `${encodeURIComponent(submission.contestId)}` +
            `/problem/` +
            `${encodeURIComponent(index)}`
        );
    }


    if (
        submission?.url &&
        /^https?:\/\//i.test(
            String(submission.url)
        )
    ) {

        return String(
            submission.url
        );
    }


    return null;
}


/* =========================================
   PROBLEM README
========================================= */

function buildProblemReadme(
    submission,
    problemUrl
) {

    const title =
        String(
            submission.problemTitle ||
            "Problem"
        ).trim();

    const difficulty =
        String(
            submission.difficulty ||
            ""
        ).trim();

    const description =
        String(
            submission.problemDescription ||
            submission.description ||
            ""
        ).trim();

    const lines = [];

    lines.push(
        `# ${title}`
    );

    if (difficulty) {

        lines.push(
            "",
            `### ${difficulty}`
        );
    }

    lines.push(
        "",
        "## Problem",
        ""
    );

    if (description) {

        lines.push(
            description
        );

    } else {

        lines.push(
            "> Problem statement will be added automatically when the platform provides the full question."
        );
    }

    if (problemUrl) {

        lines.push(
            "",
            "## Problem Link",
            "",
            `[${title}](${problemUrl})`
        );
    }

    lines.push("");

    return lines.join("\n");
}


/* =========================================
   README ENTRY
========================================= */

function getReadmeEntryKey(entry) {

    return [

        normalizePlatform(
            entry.platform
        ),

        String(
            entry.problemIdentifier ||
            ""
        )
            .trim()
            .toLowerCase()

    ].join("|");
}


function escapeMarkdownText(value) {

    return String(value || "")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\r?\n/g, " ");
}


/* =========================================
   PARSE README
========================================= */

function parseExistingReadmeEntries(
    readmeContent
) {

    const entries = [];

    const startIndex =
        readmeContent.indexOf(
            README_START_MARKER
        );

    const endIndex =
        readmeContent.indexOf(
            README_END_MARKER
        );

    if (
        startIndex === -1 ||
        endIndex === -1 ||
        endIndex <= startIndex
    ) {
        return entries;
    }

    const managed =
        readmeContent.slice(
            startIndex,
            endIndex +
                README_END_MARKER.length
        );

    const pattern =
        /<!-- DSA-GRINDHUB:ENTRY ([^>]+) -->\s*-\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

    let match;

    while (
        (
            match =
                pattern.exec(managed)
        )
    ) {

        try {

            const metadata =
                JSON.parse(
                    decodeURIComponent(
                        match[1]
                    )
                );

            entries.push({

                platform:
                    metadata.platform,

                problemIdentifier:
                    metadata.problemIdentifier,

                topic:
                    metadata.topic ||
                    "Other",

                title:
                    match[2],

                url:
                    match[3]
            });

        } catch (error) {

            console.warn(
                "PushHub: Could not parse README entry.",
                error
            );
        }
    }

    return entries;
}


/* =========================================
   BUILD MANAGED README
========================================= */

function buildReadmeManagedSection(
    entries
) {

    const uniqueEntries =
        new Map();

    for (const entry of entries) {

        const key =
            getReadmeEntryKey(entry);

        if (!key) {
            continue;
        }

        uniqueEntries.set(
            key,
            entry
        );
    }

    const sortedEntries =
        Array.from(
            uniqueEntries.values()
        ).sort(
            (a, b) => {

                const indexA =
                    README_TOPIC_ORDER.indexOf(
                        a.topic
                    );

                const indexB =
                    README_TOPIC_ORDER.indexOf(
                        b.topic
                    );

                const rankA =
                    indexA === -1
                        ? README_TOPIC_ORDER.length
                        : indexA;

                const rankB =
                    indexB === -1
                        ? README_TOPIC_ORDER.length
                        : indexB;

                if (
                    rankA !== rankB
                ) {
                    return rankA - rankB;
                }

                return String(
                    a.title
                ).localeCompare(
                    String(b.title)
                );
            }
        );

    const groups =
        new Map();

    for (const entry of sortedEntries) {

        const topic =
            entry.topic ||
            "Other";

        if (!groups.has(topic)) {

            groups.set(
                topic,
                []
            );
        }

        groups
            .get(topic)
            .push(entry);
    }

    const lines = [

        README_START_MARKER,

        "",

        "## 📊 Progress",

        "",

        `**Total Solved: ${sortedEntries.length}**`,

        "",

        "| Topic | Solved |",

        "| --- | ---: |"
    ];

    for (
        const [
            topic,
            topicEntries
        ]
        of groups
    ) {

        lines.push(
            `| ${topic} | ${topicEntries.length} |`
        );
    }

    lines.push("");

    for (
        const [
            topic,
            topicEntries
        ]
        of groups
    ) {

        lines.push(
            `## ${topic}`,
            ""
        );

        for (
            const entry
            of topicEntries
        ) {

            const metadata =
                encodeURIComponent(
                    JSON.stringify({

                        platform:
                            normalizePlatform(
                                entry.platform
                            ),

                        problemIdentifier:
                            entry.problemIdentifier,

                        topic:
                            topic
                    })
                );

            lines.push(
                `<!-- DSA-GRINDHUB:ENTRY ${metadata} -->`
            );

            lines.push(
                `- [${escapeMarkdownText(entry.title)}](${entry.url})`
            );

            lines.push("");
        }
    }

    lines.push(
        README_END_MARKER
    );

    return lines.join("\n");
}


/* =========================================
   REPLACE README SECTION
========================================= */

function replaceReadmeManagedSection(
    readmeContent,
    managedSection
) {

    const startIndex =
        readmeContent.indexOf(
            README_START_MARKER
        );

    const endIndex =
        readmeContent.indexOf(
            README_END_MARKER
        );

    if (
        startIndex !== -1 &&
        endIndex !== -1 &&
        endIndex >= startIndex
    ) {

        return (

            readmeContent.slice(
                0,
                startIndex
            )

            +

            managedSection

            +

            readmeContent.slice(
                endIndex +
                README_END_MARKER.length
            )
        );
    }

    const separator =
        readmeContent.trim().length > 0
            ? "\n\n"
            : "";

    return (

        readmeContent.trimEnd()

        +

        separator

        +

        managedSection

        +

        "\n"
    );
}


/* =========================================
   ROOT README UPDATE
========================================= */

async function updateRootReadme(
    submission,
    topicFolder,
    problemIdentifier,
    storage
) {

    const problemUrl =
        getProblemUrl(submission);

    if (!problemUrl) {

        return {
            success: false,
            skipped: true,
            reason:
                "Problem URL unavailable."
        };
    }

    const title =
        String(
            submission.problemTitle ||
            ""
        ).trim();

    if (!title) {

        return {
            success: false,
            skipped: true,
            reason:
                "Problem title unavailable."
        };
    }

    const platform =
        normalizePlatform(
            submission.platform
        );

    const apiUrl =
        `https://api.github.com/repos/` +
        `${storage.githubRepository}/contents/README.md`;

    const headers = {

        "Authorization":
            `Bearer ${storage.githubAccessToken}`,

        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28"
    };

    const readResponse =
        await fetchWithTimeout(
            `${apiUrl}?ref=${encodeURIComponent(
                storage.githubRepositoryBranch
            )}`,
            {
                method: "GET",
                headers
            }
        );

    let existingReadme = "";
    let existingSha = null;

    if (readResponse.ok) {

        const data =
            await readResponse.json();

        existingReadme =
            decodeGitHubContent(
                data.content
            );

        existingSha =
            data.sha;

    } else if (
        readResponse.status !== 404
    ) {

        throw new Error(
            `Could not read root README (${readResponse.status}): ${await readResponse.text()}`
        );
    }

    const entries =
        parseExistingReadmeEntries(
            existingReadme
        );

    const newEntry = {

        platform,

        problemIdentifier,

        topic:
            topicFolder,

        title,

        url:
            problemUrl
    };

    const newKey =
        getReadmeEntryKey(
            newEntry
        );

    const existingIndex =
        entries.findIndex(
            entry =>
                getReadmeEntryKey(
                    entry
                ) === newKey
        );

    if (
        existingIndex >= 0
    ) {

        entries[
            existingIndex
        ] =
            newEntry;

    } else {

        entries.push(
            newEntry
        );
    }

    const managedSection =
        buildReadmeManagedSection(
            entries
        );

    const updatedReadme =
        replaceReadmeManagedSection(
            existingReadme,
            managedSection
        );

    if (
        updatedReadme ===
        existingReadme
    ) {

        return {

            success:
                true,

            action:
                "unchanged",

            totalSolved:
                entries.length
        };
    }

    const requestBody = {

        message:
            "docs: update DSA GrindHub progress",

        content:
            base64EncodeUnicode(
                updatedReadme
            ),

        branch:
            storage.githubRepositoryBranch
    };

    if (existingSha) {
        requestBody.sha =
            existingSha;
    }

    const writeResponse =
        await fetchWithTimeout(
            apiUrl,
            {

                method:
                    "PUT",

                headers: {

                    ...headers,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestBody
                    )
            }
        );

    if (!writeResponse.ok) {

        throw new Error(
            `Root README update failed (${writeResponse.status}): ${await writeResponse.text()}`
        );
    }

    await writeResponse.json();

    return {

        success:
            true,

        action:
            existingSha
                ? "updated"
                : "created",

        totalSolved:
            entries.length
    };
}


/* =========================================
   PROBLEM README SYNC
========================================= */

async function syncProblemReadme(
    submission,
    problemFolderPath,
    storage
) {

    const problemUrl =
        getProblemUrl(submission);

    if (!problemUrl) {

        return {
            success: false,
            skipped: true
        };
    }

    const readmeContent =
        buildProblemReadme(
            submission,
            problemUrl
        );

    const readmePath =
        `${problemFolderPath}/README.md`;

    const apiUrl =
        `https://api.github.com/repos/` +
        `${storage.githubRepository}/contents/` +
        `${readmePath}`;

    const headers = {

        "Authorization":
            `Bearer ${storage.githubAccessToken}`,

        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28"
    };

    const existingResponse =
        await fetchWithTimeout(
            `${apiUrl}?ref=${encodeURIComponent(
                storage.githubRepositoryBranch
            )}`,
            {
                method: "GET",
                headers
            }
        );

    let existingSha = null;
    let existingContent = null;

    if (
        existingResponse.ok
    ) {

        const data =
            await existingResponse.json();

        existingSha =
            data.sha;

        existingContent =
            decodeGitHubContent(
                data.content
            );

    } else if (
        existingResponse.status !== 404
    ) {

        throw new Error(
            `Could not check problem README (${existingResponse.status}): ${await existingResponse.text()}`
        );
    }

    if (
        existingContent ===
        readmeContent
    ) {

        return {

            success:
                true,

            action:
                "unchanged",

            path:
                readmePath
        };
    }

    const requestBody = {

        message:
            existingSha
                ? `update: ${readmePath}`
                : `docs: add ${readmePath}`,

        content:
            base64EncodeUnicode(
                readmeContent
            ),

        branch:
            storage.githubRepositoryBranch
    };

    if (existingSha) {
        requestBody.sha =
            existingSha;
    }

    const response =
        await fetchWithTimeout(
            apiUrl,
            {

                method:
                    "PUT",

                headers: {

                    ...headers,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestBody
                    )
            }
        );

    if (!response.ok) {

        throw new Error(
            `Problem README update failed (${response.status}): ${await response.text()}`
        );
    }

    const data =
        await response.json();

    return {

        success:
            true,

        action:
            existingSha
                ? "updated"
                : "created",

        path:
            readmePath,

        url:
            data.content?.html_url ||
            null
    };
}


/* =========================================
   MAIN SOLUTION SYNC
========================================= */

async function syncLeetCodeSubmission(
    submission
) {

    if (!submission) {

        throw new Error(
            "Submission data is missing."
        );
    }

    if (!submission.code) {

        throw new Error(
            "Submitted code is empty."
        );
    }

    if (!submission.problemTitle) {

        throw new Error(
            "Problem title is missing."
        );
    }

    const problemIdentifier =
        getProblemIdentifier(
            submission
        );

    if (
        !problemIdentifier ||
        problemIdentifier === "Unknown"
    ) {

        throw new Error(
            "Could not determine the problem identifier."
        );
    }

    const storage =
        await chrome.storage.local.get([

            "githubAccessToken",

            "githubRepository",

            "githubRepositoryBranch"
        ]);

    if (!storage.githubAccessToken) {

        throw new Error(
            "GitHub is not connected."
        );
    }

    if (!storage.githubRepository) {

        throw new Error(
            "No GitHub repository is selected."
        );
    }

    const repositoryParts =
        storage.githubRepository.split("/");

    if (
        repositoryParts.length !== 2
    ) {

        throw new Error(
            "Invalid GitHub repository format."
        );
    }

    const owner =
        repositoryParts[0];

    const repo =
        repositoryParts[1];

    const branch =
        storage.githubRepositoryBranch ||
        "main";


    const problemName =
        sanitizeName(
            submission.problemTitle
        );

    const extension =
        getFileExtension(
            submission.language
        );

    const language =
        normalizeLanguage(
            submission.language
        );

    const platform =
        normalizePlatform(
            submission.platform
        );

    const topicFolder =
        getPrimaryTopicFolder(
            submission.topics,
            submission.problemTitle
        );

    const problemFolderName =
        `${problemIdentifier}-${problemName}`;

    const problemFolderPath =
        `${topicFolder}/${problemFolderName}`;

    const fileName =
        `${problemFolderName}` +
        `${extension}` +
        `-(${platform})`;

    const filePath =
        `${problemFolderPath}/${fileName}`;


    /* -----------------------------------------
       SOLUTION FILE
    ----------------------------------------- */

    const apiUrl =
        `https://api.github.com/repos/` +
        `${owner}/${repo}/contents/${filePath}`;

    const existingResponse =
        await fetchWithTimeout(
            `${apiUrl}?ref=${encodeURIComponent(branch)}`,
            {

                method:
                    "GET",

                headers: {

                    "Authorization":
                        `Bearer ${storage.githubAccessToken}`,

                    "Accept":
                        "application/vnd.github+json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"
                }
            }
        );

    let existingSha = null;

    if (
        existingResponse.ok
    ) {

        const data =
            await existingResponse.json();

        existingSha =
            data.sha;

    } else if (
        existingResponse.status !== 404
    ) {

        throw new Error(
            `Could not check existing solution (${existingResponse.status}): ${await existingResponse.text()}`
        );
    }


    const requestBody = {

        message:
            existingSha
                ? `update: ${fileName}`
                : `feat: add ${fileName}`,

        content:
            base64EncodeUnicode(
                submission.code
            ),

        branch
    };

    if (existingSha) {

        requestBody.sha =
            existingSha;
    }

    const writeResponse =
        await fetchWithTimeout(
            apiUrl,
            {

                method:
                    "PUT",

                headers: {

                    "Authorization":
                        `Bearer ${storage.githubAccessToken}`,

                    "Accept":
                        "application/vnd.github+json",

                    "Content-Type":
                        "application/json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"
                },

                body:
                    JSON.stringify(
                        requestBody
                    )
            }
        );

    if (!writeResponse.ok) {

        throw new Error(
            `GitHub solution sync failed (${writeResponse.status}): ${await writeResponse.text()}`
        );
    }

    const writeData =
        await writeResponse.json();


    /* -----------------------------------------
       PROBLEM README
    ----------------------------------------- */

    let problemReadmeResult;

    try {

        problemReadmeResult =
            await syncProblemReadme(
                submission,
                problemFolderPath,
                {

                    githubAccessToken:
                        storage.githubAccessToken,

                    githubRepository:
                        storage.githubRepository,

                    githubRepositoryBranch:
                        branch
                }
            );

    } catch (error) {

        throw new Error(
            `Solution synced, but problem README failed: ${error.message}`
        );
    }


    /* -----------------------------------------
       ROOT README
    ----------------------------------------- */

    let rootReadmeResult;

    try {

        rootReadmeResult =
            await updateRootReadme(
                submission,
                topicFolder,
                problemIdentifier,
                {

                    githubAccessToken:
                        storage.githubAccessToken,

                    githubRepository:
                        storage.githubRepository,

                    githubRepositoryBranch:
                        branch
                }
            );

    } catch (error) {

        throw new Error(
            `Solution and problem README synced, but root README failed: ${error.message}`
        );
    }


    /* -----------------------------------------
       PUSHHUB STREAK ACTIVITY
    ----------------------------------------- */

    try {

        await recordPushHubSyncDate();

    } catch (error) {

        console.warn(
            "PushHub: Could not record streak activity:",
            error
        );
    }


    return {

        success:
            true,

        action:
            existingSha
                ? "updated"
                : "created",

        repository:
            storage.githubRepository,

        branch,

        topic:
            topicFolder,

        problemFolder:
            problemFolderPath,

        fileName,

        filePath,

        url:
            writeData.content?.html_url ||
            null,

        problemReadme:
            problemReadmeResult,

        rootReadme:
            rootReadmeResult
    };
}


/* =========================================================
   PUSHHUB STATISTICS
========================================================= */


/* -----------------------------------------
   READ ROOT README
----------------------------------------- */

async function getPushHubRootReadme(
    storage
) {

    const repository =
        String(
            storage.githubRepository ||
            ""
        ).trim();

    const branch =
        storage.githubRepositoryBranch ||
        "main";

    if (!repository) {

        throw new Error(
            "No GitHub repository is selected."
        );
    }

    const apiUrl =
        `https://api.github.com/repos/` +
        `${repository}/contents/README.md` +
        `?ref=${encodeURIComponent(branch)}&_=${Date.now()}`;

    const response =
        await fetchWithTimeout(
            apiUrl,
            {

                method:
                    "GET",

                cache:
                    "no-store",

                headers: {

                    "Authorization":
                        `Bearer ${storage.githubAccessToken}`,

                    "Accept":
                        "application/vnd.github+json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"
                }
            }
        );

    if (!response.ok) {

        throw new Error(
            `Could not read root README (${response.status}): ${await response.text()}`
        );
    }

    const data =
        await response.json();

    return decodeGitHubContent(
        data.content
    );
}


/* -----------------------------------------
   PLATFORM COUNTS
----------------------------------------- */

function calculatePushHubPlatformCounts(
    entries
) {

    const counts = {

        leetcode:
            0,

        gfg:
            0,

        hackerrank:
            0,

        codechef:
            0,

        codeforces:
            0
    };

    const seen =
        new Set();

    for (
        const entry
        of entries
    ) {

        const platform =
            normalizePlatform(
                entry.platform
            );

        if (
            !Object.prototype.hasOwnProperty.call(
                counts,
                platform
            )
        ) {
            continue;
        }

        const identifier =
            String(
                entry.problemIdentifier ||
                ""
            )
                .trim()
                .toLowerCase();

        if (!identifier) {
            continue;
        }

        const key =
            `${platform}|${identifier}`;

        if (
            seen.has(key)
        ) {
            continue;
        }

        seen.add(key);

        counts[platform]++;
    }

    return counts;
}


/* -----------------------------------------
   DATE KEY
----------------------------------------- */

function toLocalDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


/* -----------------------------------------
   PUSHHUB SYNC DATES
----------------------------------------- */

async function recordPushHubSyncDate() {

    const today =
        toLocalDateKey(
            new Date()
        );

    const stored =
        await chrome.storage.local.get([
            "pushhubSyncDates"
        ]);

    const existingDates =
        Array.isArray(
            stored.pushhubSyncDates
        )
            ? stored.pushhubSyncDates
            : [];

    if (
        existingDates.includes(today)
    ) {
        return existingDates;
    }

    const updatedDates =
        [
            ...existingDates,
            today
        ].sort();

    await chrome.storage.local.set({
        pushhubSyncDates:
            updatedDates
    });

    return updatedDates;
}


/* -----------------------------------------
   README COMMIT DATES
----------------------------------------- */

async function getPushHubReadmeCommitDates(
    storage
) {

    const repository =
        String(
            storage.githubRepository ||
            ""
        ).trim();

    const branch =
        storage.githubRepositoryBranch ||
        "main";

    const apiUrl =
        `https://api.github.com/repos/` +
        `${repository}/commits` +
        `?path=README.md` +
        `&sha=${encodeURIComponent(branch)}` +
        `&per_page=100`;

    const response =
        await fetchWithTimeout(
            apiUrl,
            {

                method:
                    "GET",

                headers: {

                    "Authorization":
                        `Bearer ${storage.githubAccessToken}`,

                    "Accept":
                        "application/vnd.github+json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"
                }
            }
        );

    if (!response.ok) {

        console.warn(
            "PushHub: Could not fetch README commit history:",
            response.status
        );

        return [];
    }

    const commits =
        await response.json();

    const dates =
        new Set();

    for (
        const commit
        of commits
    ) {

        const rawDate =
            commit?.commit?.author?.date ||
            commit?.commit?.committer?.date;

        if (!rawDate) {
            continue;
        }

        const date =
            new Date(rawDate);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            continue;
        }

        dates.add(
            toLocalDateKey(date)
        );
    }

    return Array.from(dates);
}


/* -----------------------------------------
   STREAK
----------------------------------------- */

function calculatePushHubStreak(
    dateKeys
) {

    if (
        !Array.isArray(dateKeys) ||
        dateKeys.length === 0
    ) {

        return {

            currentStreak:
                0,

            bestStreak:
                0
        };
    }

    const uniqueKeys =
        Array.from(
            new Set(dateKeys)
        ).sort();

    const dates =
        uniqueKeys.map(
            key => {

                const [
                    year,
                    month,
                    day
                ] =
                    key
                        .split("-")
                        .map(Number);

                return new Date(
                    year,
                    month - 1,
                    day
                );
            }
        );

    let bestStreak =
        1;

    let runningStreak =
        1;


    /* -----------------------------------------
       BEST STREAK
    ----------------------------------------- */

    for (
        let i = 1;
        i < dates.length;
        i++
    ) {

        const difference =
            Math.round(
                (
                    dates[i].getTime() -
                    dates[i - 1].getTime()
                ) /
                86400000
            );

        if (
            difference === 1
        ) {

            runningStreak++;

            bestStreak =
                Math.max(
                    bestStreak,
                    runningStreak
                );

        } else {

            runningStreak =
                1;
        }
    }


    /* -----------------------------------------
       CURRENT STREAK
    ----------------------------------------- */

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const latestDate =
        new Date(
            dates[
                dates.length - 1
            ]
        );

    latestDate.setHours(
        0,
        0,
        0,
        0
    );

    const daysSinceLatest =
        Math.round(
            (
                today.getTime() -
                latestDate.getTime()
            ) /
            86400000
        );


    /*
     * Today or yesterday:
     * streak remains active.
     */

    if (
        daysSinceLatest > 1
    ) {

        return {

            currentStreak:
                0,

            bestStreak
        };
    }


    let currentStreak =
        1;


    for (
        let i =
            dates.length - 1;

        i > 0;

        i--
    ) {

        const difference =
            Math.round(
                (
                    dates[i].getTime() -
                    dates[i - 1].getTime()
                ) /
                86400000
            );

        if (
            difference === 1
        ) {

            currentStreak++;

        } else {

            break;
        }
    }


    return {

        currentStreak,

        bestStreak
    };
}


/* -----------------------------------------
   MAIN STATS
----------------------------------------- */

async function getPushHubStats() {

    const storage =
        await chrome.storage.local.get([

            "githubAccessToken",

            "githubRepository",

            "githubRepositoryBranch"
        ]);

    if (!storage.githubAccessToken) {

        throw new Error(
            "GitHub is not connected."
        );
    }

    if (!storage.githubRepository) {

        throw new Error(
            "No GitHub repository is selected."
        );
    }

    console.log(
        "PushHub: Reading statistics from GitHub..."
    );


    /* -----------------------------------------
       README
    ----------------------------------------- */

    const readme =
        await getPushHubRootReadme(
            storage
        );

    const entries =
        parseExistingReadmeEntries(
            readme
        );


    /* -----------------------------------------
       PLATFORM COUNTS
    ----------------------------------------- */

    const platforms =
        calculatePushHubPlatformCounts(
            entries
        );


    const total =
        Object.values(
            platforms
        ).reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    /* -----------------------------------------
       STREAK
    ----------------------------------------- */

    const streakStorage =
        await chrome.storage.local.get([
            "pushhubSyncDates"
        ]);

    const streak =
        calculatePushHubStreak(
            streakStorage.pushhubSyncDates || []
        );


    const result = {

        success:
            true,

        stats: {

            total,

            platforms,

            currentStreak:
                streak.currentStreak,

            bestStreak:
                streak.bestStreak
        }
    };


    console.log(
        "PushHub: Statistics:",
        result.stats
    );


    return result;
}


/* =========================================
   MESSAGE HANDLER
========================================= */

chrome.runtime.onMessage.addListener(

    (
        message,
        sender,
        sendResponse
    ) => {


        /* -----------------------------------
           CONNECT GITHUB
        ----------------------------------- */

        if (
            message.type ===
            "CONNECT_GITHUB"
        ) {

            connectGitHub()

                .then(
                    result =>
                        sendResponse(
                            result
                        )
                )

                .catch(
                    error => {

                        console.error(
                            "PushHub: GitHub authentication error:",
                            error
                        );

                        sendResponse({

                            success:
                                false,

                            message:
                                error.message
                        });
                    }
                );

            return true;
        }


        /* -----------------------------------
           GET REPOSITORIES
        ----------------------------------- */

        if (
            message.type ===
            "GET_REPOSITORIES"
        ) {

            getGitHubRepositories()

                .then(
                    result =>
                        sendResponse(
                            result
                        )
                )

                .catch(
                    error => {

                        console.error(
                            "PushHub: Repository fetch error:",
                            error
                        );

                        sendResponse({

                            success:
                                false,

                            message:
                                error.message
                        });
                    }
                );

            return true;
        }


        /* -----------------------------------
           GET PUSHHUB STATISTICS
        ----------------------------------- */

        if (
            message.type ===
            "GET_PUSHHUB_STATS"
        ) {

            console.log(
                "PushHub: GET_PUSHHUB_STATS received."
            );

            getPushHubStats()

                .then(
                    result => {

                        console.log(
                            "PushHub: Statistics ready:",
                            result
                        );

                        sendResponse(
                            result
                        );
                    }
                )

                .catch(
                    error => {

                        console.error(
                            "PushHub: Statistics error:",
                            error
                        );

                        sendResponse({

                            success:
                                false,

                            message:
                                error.message
                        });
                    }
                );

            return true;
        }


        /* -----------------------------------
           REAL SOLUTION SYNC
        ----------------------------------- */

        if (
            message.type ===
            "SYNC_LEETCODE_SUBMISSION"
        ) {

            console.log(
                "PushHub: SYNC message received from:",
                sender?.url ||
                "unknown"
            );

            syncLeetCodeSubmission(
                message.submission
            )

                .then(
                    result => {

                        console.log(
                            "PushHub: Sync completed:",
                            result
                        );

                        sendResponse(
                            result
                        );

                        if (result?.success) {

                            chrome.runtime.sendMessage({
                                type:
                                    "PUSHHUB_STATS_UPDATED"
                            }).catch(
                                () => {
                                    // Popup may be closed.
                                }
                            );
                        }
                    }
                )

                .catch(
                    error => {

                        console.error(
                            "PushHub: SYNC FAILED",
                            error
                        );

                        sendResponse({

                            success:
                                false,

                            message:
                                error.message
                        });
                    }
                );

            return true;
        }
    }
);


/* =========================================
   END
========================================= */