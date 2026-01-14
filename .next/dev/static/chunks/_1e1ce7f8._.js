(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/assets/contentpt.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"header":{"logo":"/logo-vasto-imperio-mini.png","links":[{"label":"Home","url":"/"},{"label":"Sobre Nós","url":"/sobre-nos"},{"label":"Produtos","url":"/produtos"},{"label":"Contacto","url":"/contacto"}]},"logo":"/logo.png"});}),
"[project]/assets/contenten.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"header":{"logo":"/logo-vasto-imperio-mini.png","links":[{"label":"Home","url":"/"},{"label":"About Us","url":"/sobre-nos"},{"label":"Products","url":"/produtos"},{"label":"Contact","url":"/contacto"}]},"logo":"/logo.png"});}),
"[project]/app/layout.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$contentpt$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/assets/contentpt.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$contenten$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/assets/contenten.json (json)");
(()=>{
    const e = new Error("Cannot find module './PageSelection'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './LanguageSelection'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './LanguageContext'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function Header() {
    _s();
    const { language } = useLanguage();
    const content = language === "pt" ? __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$contentpt$2e$json__$28$json$29$__["default"] : __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$contenten$2e$json__$28$json$29$__["default"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between px-4 bg-[var(--gray)] w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: content.header.logo,
                alt: "Vasto Império Logo",
                width: 80,
                height: 80,
                priority: true
            }, void 0, false, {
                fileName: "[project]/app/layout.js",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PageSelection, {
                        content: content.header.links
                    }, void 0, false, {
                        fileName: "[project]/app/layout.js",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LanguageSelection, {}, void 0, false, {
                        fileName: "[project]/app/layout.js",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/layout.js",
                lineNumber: 23,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/layout.js",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_s(Header, "d1ORxvPBup+C3Qetit/BVjvgCJk=", false, function() {
    return [
        useLanguage
    ];
});
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1e1ce7f8._.js.map