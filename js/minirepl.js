/*global $ ace Babel*/
/*eslint quotes: ["error", "double", { "avoidEscape": true }]*/
import debounce from "lodash.debounce";

const miniReplExamples = [
  "/(?i:a)b/",
  `using Flavortown = from(#["Guy Fieri"]);`,
  // use next(yourTurn) = throw "some code in here!"
  // when we support extractors
  `let yourTurn = throw "some code in here!"`,
];

let inEditor;
let outEditor;

let runDemo = true;

const debouncedUpdate = debounce(function() {
  compileCode(inEditor, outEditor);
}, 1000);

function isMobile() {
  return window.screen.width < 760;
}

function setupEditor(id, readOnly) {
  const editor = ace.edit(id);

  editor.setOptions({
    // editor
    highlightActiveLine: false,
    readOnly: !!readOnly,

    // renderer
    fontSize: "1rem",
    highlightGutterLine: false,
    showGutter: false,
    showLineNumbers: false,
    theme: "ace/theme/tomorrow_night",

    // session
    mode: "ace/mode/javascript",
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
    wrap: true,
  });

  editor.renderer.setPadding(24);
  editor.renderer.setScrollMargin(24, 24);
  editor.commands.removeCommands(["gotoline", "find"]);

  return editor;
}

function simulateKeys(inEditor, outEditor, texts) {
  let textIndex = 0;
  let charIndex = 0;
  let timeout;

  function simulateKey(changingText) {
    const delay = changingText ? 4000 : Math.round(Math.random() * 125) + 30;

    timeout = setTimeout(function() {
      if (!runDemo) {
        if (timeout) {
          clearTimeout(timeout);
        }
        return;
      }

      const text = texts[textIndex];

      charIndex++;

      inEditor.setValue(text.substring(0, charIndex), 1);

      if (charIndex < text.length) {
        simulateKey();
      } else if (charIndex === text.length && textIndex < texts.length - 1) {
        textIndex++;
        charIndex = 0;
        simulateKey(true);
      } else {
        inEditor.selection.selectAll();
        inEditor.setReadOnly(false);
        clearTimeout(timeout);
      }
    }, delay);
  }

  simulateKey();
}

function showError(editor, babelError) {
  editor.setValue("");
  $(".hero-repl__error")
    .text(babelError)
    .addClass("hero-repl__error--visible");
}

function hideError() {
  $(".hero-repl__error").removeClass("hero-repl__error--visible");
}

function compileCode(sourceEditor, targetEditor) {
  let transformed;

  try {
    transformed = Babel.transform(sourceEditor.getValue(), {
      presets: [
        "react",
        "typescript",
        ["env", { targets: "defaults, not ie 11, not ie_mob 11", loose: true }],
      ],
      plugins: [
        ["external-helpers", { helperVersion: "7.100.0" }],
        ["proposal-explicit-resource-management"],
        ["proposal-record-and-tuple"],
        ["proposal-throw-expressions"],
      ],
      filename: "repl.tsx",
      babelrc: false,
    });
  } catch (e) {
    showError(targetEditor, e.message);
  }

  if (transformed) {
    hideError();

    targetEditor.setValue(
      // Remove 'use strict' just for demonstration purposes
      transformed.code.replace(/['|"]use strict['|"];(\n\n)?/g, ""),
      -1
    );
  }
}

const BABEL_MINI_REPL = {
  start: function() {
    // don't init editor on mobile devices
    if (isMobile()) return;

    $(".dummy-hero-repl").prop("hidden", true);
    $(".hero-repl").prop("hidden", false);

    inEditor = setupEditor("hero-repl-in", true);

    outEditor = setupEditor("hero-repl-out", true);
    outEditor.renderer.$cursorLayer.element.style.display = "none";

    inEditor.on("change", function() {
      if (!inEditor.getValue()) {
        debouncedUpdate.cancel();
        outEditor.setValue("");
      }

      debouncedUpdate();
    });

    $("#hero-repl-in").on("click", function() {
      if (runDemo) {
        BABEL_MINI_REPL.stopDemo();
      }
    });

    setTimeout(function() {
      $(".hero-repl").addClass("hero-repl--visible");
      simulateKeys(inEditor, outEditor, miniReplExamples);
    }, 150);
  },

  stopDemo: function() {
    debouncedUpdate.cancel();
    runDemo = false;
    inEditor.setReadOnly(false);
    inEditor.setValue("");
    outEditor.setValue("");
  },
};

export default BABEL_MINI_REPL;
