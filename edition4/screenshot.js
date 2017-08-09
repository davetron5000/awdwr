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
var whichForm  = 0;
var workflow   = null;

if (args.length >= 5) {
  for (var i = 5; i < args.length; i++) {
    if (args[i] === "SUBMIT") {
      console.log("Planning to submit the form");
      submitForm = true;
    }
    else if (args[i] === "SUBMIT1") {
      console.log("Planning to submit the first form");
      submitForm = true;
      whichForm = 1;
    }
    else if (args[i].match(/^WORKFLOW:/)) {
      console.log("Plannign to execute a workflow");
      workflow = args[i].replace(/^WORKFLOW:/,"");
    }
    else {
      var parts = args[i].split(/=/,2);
      formFields[parts[0]] = parts[1];
      console.log("looking at form field: " + args[i]);
    }
  }
}

page.open(file, function () {
  if (workflow) {
    var steps = workflow.split(/,/);
    var stepFunctions = []
    for (var i = 0; i < steps.length; i++) {

      console.log("Creating step function for " + steps[i]);

      stepFunctions.push([steps[i],function(step) {
        var forms          = document.getElementsByTagName("form");
        var formToSubmit   = null;
        var actionsChecked = [];

        for (var j = 0; j < forms.length; j++) {
          var form = forms[j];

          actionsChecked.push(form.action);

          if (formToSubmit === null) {
            console.log("Checking " + form.action + " against " + step);
            var ending = form.action.substr(form.action.length - step.length,step.length);
            console.log("Checking " + ending + " against " + step);
            if (ending == step) {
              formToSubmit = form;
            }
          }
        }
        if (formToSubmit !== null) {
          formToSubmit.submit();
        }
        else {
          console.log("Could not find form whose action ended in '" + step + "'.  Found: " + JSON.stringify(actionsChecked));
          throw "ERROR";
        }
      }]);
    }

    var stepsRemaining = stepFunctions;
    var firstStep = stepsRemaining.shift();
    console.log("Evaluating first step " + firstStep[0]);
    page.evaluate(firstStep[1],firstStep[0]);

    interval = setInterval(function() {
      console.log("Steps remaining: " + stepsRemaining.length);
      if (loadInProgress) {
        console.log("Page still loading...");
      }
      else if (stepsRemaining.length == 0) {
        console.log("All done...");
        page.viewportSize = {
          width: width *  retinaFactor,
          height: height *  retinaFactor
        };
        page.render(image, { format: "pdf" });
        phantom.exit();
      }
      else {
        var step = stepsRemaining.shift();
        console.log("Evaluating step " + step[0]);
        page.evaluate(step[1],step[0]);
      }
    },100);
  }
  else {
    console.log("Executing simple single page action");
    page.evaluate(function(formFields, submitForm, whichForm) {
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
        for (var i = 0; i < forms.length; i++) {
          console.log("Found a form: " + forms[0].action);
        }
        if (whichForm == 0) {
          if (forms.length === 1) {
            forms[0].submit();
            console.log("Form submitted");
          }
          else {
            console.log("Expecting exactly one <form>, but found " + forms.length);
            throw "ERROR";
          }
        } else {
          var form = forms[whichForm];
          if (form) {
            form.submit();
            console.log("Form " + whichForm + " submitted");
          }
          else {
            console.log("Trying to submit form #" + whichForm + ", but there aren't that many.  Found " + forms.length + " forms");
            throw "ERROR";
          }
        }
      }
    }, formFields, submitForm, whichForm);

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
  }
}
);
/*
page.evaluate(function() {
  document.body.style.webkitTransform = "scale(2)";
  document.body.style.webkitTransformOrigin = "0% 0%";
  document.body.style.width = "50%";
});
*/
