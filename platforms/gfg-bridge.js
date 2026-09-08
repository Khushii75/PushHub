(function () {

    if (window.__DSA_GRINDHUB_GFG_BRIDGE__) {
        return;
    }

    window.__DSA_GRINDHUB_GFG_BRIDGE__ = true;

    console.log(
        "DSA GrindHub: GFG bridge loaded."
    );


    const originalFetch =
        window.fetch.bind(window);

    const originalOpen =
        XMLHttpRequest.prototype.open;

    const originalSend =
        XMLHttpRequest.prototype.send;


    // ========================================
    // HELPERS
    // ========================================

    function getProblemSlug() {

        const match =
            window.location.pathname.match(
                /\/problems\/([^/?#]+)/
            );

        return match
            ? match[1]
            : "";
    }


    function getProblemNumber(slug) {

        if (!slug) {
            return null;
        }

        const match =
            slug.match(/(\d+)$/);

        return match
            ? match[1]
            : null;
    }


    function getProblemTitle() {

        const heading =
            document.querySelector("h1");

        if (
            heading &&
            heading.textContent.trim()
        ) {

            return heading.textContent.trim();
        }


        const title =
            document.title
                .split("|")[0]
                .trim();

        if (title) {
            return title;
        }


        const slug =
            getProblemSlug();

        return slug
            .replace(/\d+$/, "")
            .replace(/-/g, " ")
            .replace(
                /\b\w/g,
                c => c.toUpperCase()
            );
    }


    // ========================================
    // LANGUAGE
    // ========================================

    function getLanguage() {

        const selectors = [

            "select",

            "[class*='language'] select",

            "[class*='lang'] select"
        ];


        for (
            const selector
            of selectors
        ) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            for (
                const element
                of elements
            ) {

                const text =
                    element
                        .options?.[
                            element.selectedIndex
                        ]
                        ?.text
                        ?.trim();


                if (
                    text &&
                    /c\+\+|python|java|javascript|typescript|golang|go|rust|c\b/i.test(
                        text
                    )
                ) {

                    return text;
                }
            }
        }


        return "C++";
    }


    // ========================================
    // CODE
    // ========================================

    function getCode() {

        // ------------------------------------
        // CodeMirror
        // ------------------------------------

        const codeMirror =
            document.querySelector(
                ".CodeMirror"
            );


        if (
            codeMirror?.CodeMirror
        ) {

            try {

                return codeMirror.CodeMirror
                    .getValue();

            } catch (_) {}
        }


        // ------------------------------------
        // Monaco
        // ------------------------------------

        const monaco =
            document.querySelector(
                ".monaco-editor"
            );


        if (monaco) {

            const textarea =
                monaco.querySelector(
                    "textarea"
                );


            if (
                textarea?.value
            ) {

                return textarea.value;
            }
        }


        // ------------------------------------
        // Ace
        // ------------------------------------

        const ace =
            document.querySelector(
                ".ace_editor"
            );


        if (
            ace &&
            window.ace
        ) {

            try {

                return window.ace
                    .edit(ace)
                    .getValue();

            } catch (_) {}
        }


        // ------------------------------------
        // Textarea fallback
        // ------------------------------------

        const textareas =
            document.querySelectorAll(
                "textarea"
            );


        for (
            const textarea
            of textareas
        ) {

            if (
                textarea.value &&
                textarea.value.trim().length > 10
            ) {

                return textarea.value;
            }
        }


        return "";
    }


    // ========================================
    // TOPICS
    // ========================================

    function getTopics() {

        const links = [

            ...document.querySelectorAll(
                "a"
            )

        ]
            .filter(
                link => {

                    const text =
                        link.textContent.trim();

                    const href =
                        link.href || "";


                    return (

                        text.length > 1 &&

                        text.length < 50 &&

                        href.includes(
                            "category"
                        )

                    );
                }
            )
            .map(
                link =>
                    link.textContent.trim()
            );


        return [

            ...new Set(
                links
            )

        ].slice(
            0,
            10
        );
    }


    // ========================================
    // PROBLEM DESCRIPTION
    // ========================================

    function cleanProblemDescription(
        element
    ) {

        if (!element) {
            return "";
        }


        const clone =
            element.cloneNode(true);


        // Remove elements that are not
        // part of the actual problem statement.

        clone.querySelectorAll(
            "script, style, button, input, textarea, select, svg"
        )
            .forEach(
                node =>
                    node.remove()
            );


        // Convert common block elements into
        // readable line breaks.

        clone.querySelectorAll(
            "br"
        )
            .forEach(
                br =>
                    br.replaceWith(
                        "\n"
                    )
            );


        clone.querySelectorAll(
            "p, div, li, pre, blockquote, h2, h3, h4"
        )
            .forEach(
                node => {

                    node.insertAdjacentText(
                        "afterend",
                        "\n"
                    );
                }
            );


        let text =
            clone.textContent || "";


        text =
            text
                .replace(
                    /\u00a0/g,
                    " "
                )
                .replace(
                    /\r/g,
                    ""
                )
                .replace(
                    /[ \t]+\n/g,
                    "\n"
                )
                .replace(
                    /\n[ \t]+/g,
                    "\n"
                )
                .replace(
                    /\n{3,}/g,
                    "\n\n"
                )
                .trim();


        return text;
    }


    function getProblemDescription() {

        /*
         * GFG changes its internal CSS classes
         * from time to time, so we deliberately
         * use several possible selectors.
         */

        const selectors = [

            // Common GFG problem-content containers

            "[class*='problemStatement']",

            "[class*='problem-statement']",

            "[class*='ProblemStatement']",

            "[class*='problem__statement']",

            "[class*='problemDescription']",

            "[class*='problem-description']",

            "[class*='ProblemDescription']",

            // Article/content containers

            "article",

            "[role='article']"
        ];


        for (
            const selector
            of selectors
        ) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            for (
                const element
                of elements
            ) {

                const text =
                    cleanProblemDescription(
                        element
                    );


                /*
                 * Ignore tiny containers.
                 *
                 * A real problem statement should
                 * contain a reasonable amount of text.
                 */

                if (
                    text.length >= 100 &&
                    text.length <= 20000
                ) {

                    return text;
                }
            }
        }


        /*
         * ------------------------------------
         * HEADING-BASED FALLBACK
         * ------------------------------------
         *
         * Find a heading containing
         * "Problem Statement" / "Problem"
         * and collect the following content.
         */

        const headings =
            document.querySelectorAll(
                "h2, h3, h4"
            );


        for (
            const heading
            of headings
        ) {

            const headingText =
                heading.textContent
                    .trim()
                    .toLowerCase();


            if (
                !(
                    headingText.includes(
                        "problem statement"
                    ) ||

                    headingText ===
                    "problem" ||

                    headingText.includes(
                        "problem description"
                    )
                )
            ) {

                continue;
            }


            let current =
                heading.nextElementSibling;


            const collected = [];


            while (
                current
            ) {

                /*
                 * Stop when we reach another
                 * major section.
                 */

                if (
                    /^H[1-4]$/.test(
                        current.tagName
                    )
                ) {

                    break;
                }


                const text =
                    cleanProblemDescription(
                        current
                    );


                if (text) {

                    collected.push(
                        text
                    );
                }


                current =
                    current.nextElementSibling;
            }


            const result =
                collected
                    .join("\n\n")
                    .trim();


            if (
                result.length >= 100 &&
                result.length <= 20000
            ) {

                return result;
            }
        }


        /*
         * ------------------------------------
         * FINAL FALLBACK
         * ------------------------------------
         *
         * Search for a large text container
         * containing typical problem keywords.
         */

        const candidates =
            document.querySelectorAll(
                "div"
            );


        let bestCandidate =
            "";


        for (
            const element
            of candidates
        ) {

            const text =
                cleanProblemDescription(
                    element
                );


            if (
                text.length < 150 ||
                text.length > 20000
            ) {

                continue;
            }


            const lower =
                text.toLowerCase();


            const looksLikeProblem =
                lower.includes(
                    "given"
                ) ||
                lower.includes(
                    "write a function"
                ) ||
                lower.includes(
                    "you are given"
                ) ||
                lower.includes(
                    "find the"
                ) ||
                lower.includes(
                    "return"
                ) ||
                lower.includes(
                    "input"
                ) ||
                lower.includes(
                    "output"
                );


            if (
                looksLikeProblem &&
                text.length > bestCandidate.length
            ) {

                bestCandidate =
                    text;
            }
        }


        return bestCandidate;
    }


    // ========================================
    // ACCEPTED DETECTION
    // ========================================

    function isAccepted(data) {

        if (
            !data ||
            typeof data !== "object"
        ) {

            return false;
        }


        if (
            data.view_mode ===
            "correct"
        ) {

            return true;
        }


        if (
            data.sub_status === 1
        ) {

            return true;
        }


        const values = [

            data.result,

            data.verdict,

            data.status,

            data.message

        ];


        return values.some(
            value => {

                const text =
                    String(
                        value ?? ""
                    ).toLowerCase();


                return (

                    text ===
                        "accepted" ||

                    text ===
                        "correct" ||

                    text.includes(
                        "successfully solved"
                    )

                );
            }
        );
    }


    // ========================================
    // BUILD SUBMISSION
    // ========================================

    function buildSubmission() {

        const slug =
            getProblemSlug();


        const code =
            getCode();


        const problemDescription =
            getProblemDescription();


        const submission = {

            problemNumber:
                getProblemNumber(
                    slug
                ),


            problemTitle:
                getProblemTitle(),


            problemSlug:
                slug,


            /*
             * NEW:
             * Actual GFG problem statement.
             */

            problemDescription:
                problemDescription,


            language:
                getLanguage(),


            code:
                code,


            topics:
                getTopics(),


            platform:
                "gfg",


            url:
                window.location.href
        };


        console.log(
            "DSA GrindHub: GFG submission captured:",
            submission
        );


        console.log(
            "DSA GrindHub: GFG problem description length:",
            problemDescription.length
        );


        return submission;
    }


    // ========================================
    // ACCEPTED SUBMISSION HANDLER
    // ========================================

    function handleAccepted(
        url,
        data
    ) {

        console.log(
            "DSA GrindHub: GFG Accepted response detected.",
            url
        );


        const submission =
            buildSubmission();


        /*
         * ------------------------------------
         * CODE NOT FOUND
         * ------------------------------------
         */

        if (
            !submission.code ||
            submission.code.trim().length < 5
        ) {

            console.warn(
                "DSA GrindHub: Accepted submission detected, but code was not found yet."
            );


            setTimeout(
                () => {

                    const retry =
                        buildSubmission();


                    if (
                        retry.code &&
                        retry.code.trim().length >= 5
                    ) {

                        console.log(
                            "DSA GrindHub: GFG code found on retry."
                        );


                        window.postMessage(
                            {

                                type:
                                    "DSA_GRINDHUB_GFG_ACCEPTED",


                                submission:
                                    retry

                            },
                            "*"
                        );
                    }

                },
                1000
            );


            return;
        }


        /*
         * ------------------------------------
         * DESCRIPTION NOT YET LOADED
         * ------------------------------------
         *
         * GFG may render the problem statement
         * slightly after the accepted response.
         *
         * Retry once after a short delay if
         * description is missing.
         */

        if (
            !submission.problemDescription
        ) {

            console.log(
                "DSA GrindHub: GFG problem statement not found yet. Retrying..."
            );


            setTimeout(
                () => {

                    const retry =
                        buildSubmission();


                    if (
                        retry.problemDescription
                    ) {

                        console.log(
                            "DSA GrindHub: GFG problem statement found on retry."
                        );
                    }


                    window.postMessage(
                        {

                            type:
                                "DSA_GRINDHUB_GFG_ACCEPTED",


                            submission:
                                retry

                        },
                        "*"
                    );

                },
                1200
            );


            return;
        }


        /*
         * ------------------------------------
         * SEND ACCEPTED SUBMISSION
         * ------------------------------------
         */

        window.postMessage(
            {

                type:
                    "DSA_GRINDHUB_GFG_ACCEPTED",


                submission:
                    submission

            },
            "*"
        );


        console.log(
            "DSA GrindHub: GFG accepted submission sent to content script."
        );
    }


    // ========================================
    // FETCH INTERCEPTION
    // ========================================

    window.fetch =
        async function (...args) {

            const url =
                typeof args[0] === "string"
                    ? args[0]
                    : args[0]?.url || "";


            const response =
                await originalFetch(
                    ...args
                );


            if (
                String(url).includes(
                    "geeksforgeeks.org"
                )
            ) {

                try {

                    const clone =
                        response.clone();


                    clone
                        .json()
                        .then(
                            data => {

                                if (
                                    isAccepted(
                                        data
                                    )
                                ) {

                                    handleAccepted(
                                        url,
                                        data
                                    );
                                }

                            }
                        )
                        .catch(
                            () => {}
                        );

                } catch (_) {}
            }


            return response;
        };


    // ========================================
    // XHR INTERCEPTION
    // ========================================

    XMLHttpRequest.prototype.open =
        function (
            method,
            url,
            ...rest
        ) {

            this.__dsaGfgUrl =
                url;


            return originalOpen.call(
                this,
                method,
                url,
                ...rest
            );
        };


    XMLHttpRequest.prototype.send =
        function (...args) {

            this.addEventListener(
                "load",
                () => {

                    const url =
                        this.__dsaGfgUrl;


                    if (
                        !String(
                            url || ""
                        ).includes(
                            "geeksforgeeks.org"
                        )
                    ) {

                        return;
                    }


                    try {

                        const data =
                            JSON.parse(
                                this.responseText
                            );


                        if (
                            isAccepted(
                                data
                            )
                        ) {

                            handleAccepted(
                                url,
                                data
                            );
                        }

                    } catch (_) {}
                }
            );


            return originalSend.apply(
                this,
                args
            );
        };

})();