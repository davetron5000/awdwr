/*
 * PhantomJS script to take a screenshot
 */
var page           = require('webpage').create();
var system         = require('system');
var args           = system.args;
var loadInProgress = false;

page.onConsoleMessage = function(msg) {
  console.log(msg);
};

page.onLoadStarted = function() {
  loadInProgress = true;
};

page.onLoadFinished = function() {
  loadInProgress = false;
};

if (args.length < 3) {
  phantom.exit();
  throw "You should pass in the web page and the screenshot name";
}

var file = args[1];
var image = args[2];
var width = args[3];
var height = args[4];
var retinaFactor = 1;

if (width == "default") {
  width = 640;
}
if (height == "default") {
  height = 480;
}

var formFields = {};
var submitForm = false;
if (args.length >= 5) {
  for (var i = 5; i < args.length; i++) {
    if (args[i] === "SUBMIT") {
      console.log("Planning to submit the form");
      submitForm = true;
    }
    else {
      var parts = args[i].split(/=/,2);
      formFields[parts[0]] = parts[1];
    }
  }
}

page.open(file, function () {
  page.evaluate(function(formFields, submitForm) {
    for (var key in formFields) {
      if (formFields.hasOwnProperty(key)) {
        console.log("Finding form element named '" + key + "', setting value to '" + formFields[key] + "'");
        var element = document.getElementsByName(key)[0];
        if (element) {
          if (element.hasOwnProperty("value")) {
            element.value = formFields[key].replace(/\\n/g,"\n");
          }
          else {
            console.log("Element with name '" + key + "' does not have the 'value' property, so we can't set it");
            throw "ERROR";
          }
        }
        else {
          console.log("Could not find element with name '" + key + "'");
          throw "ERROR";
        }
      }
    }
    if (submitForm) {
      var forms = document.getElementsByTagName("form");
      if (forms.length === 1) {
        forms[0].submit();
        console.log("Form submitted");
      }
      else {
        console.log("Expecting exactly one <form>, but found " + forms.length);
        throw "ERROR";
      }
    }
  }, formFields, submitForm);

  interval = setInterval(function() {
    if (!loadInProgress) {
      page.viewportSize = {
        width: width *  retinaFactor,
        height: height *  retinaFactor
      };
      page.render(image, { format: "pdf" });
      phantom.exit();
    }
    else {
      console.log("Page still loading...");
    }
  },50);
});
/*
page.evaluate(function() {
  document.body.style.webkitTransform = "scale(2)";
  document.body.style.webkitTransformOrigin = "0% 0%";
  document.body.style.width = "50%";
});
*/
