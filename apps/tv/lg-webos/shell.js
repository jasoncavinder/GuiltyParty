(function () {
  "use strict";
  var frame = document.getElementById("stage-frame");

  window.addEventListener("message", function (event) {
    if (event.source === frame.contentWindow && event.data === "guiltyparty.stage.exit") {
      window.close();
    }
  });
}());
