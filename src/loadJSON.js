/*
 * loadJSON.js - non-blocking resource loader using iframes
 * Copyright (C) 2006-2013 Diego Perini. All rights reserved
 * Released under the MIT License see: http://nwbox.com/license
 */

function loadJSON(url, callback) {

  // 'use strict';

  // shortcuts
  var w = window,
      d = w.document,
      r = d.documentElement,

  html, iframe, jsonp, trigger,

  // to extract callback name from URL
  JSONP = /(?:callback|jsonp)=([^\x26]+?)/; // [ag] empty callbacks are not welcome
                                            // also make it less greedy ?

  /* ========== VAR BLOCK END ========== */

  // dispatch custom event
  trigger = d.createEvent ?
    function(event) {
      event = document.createEvent('Event');
      event.initEvent('onpage', true, true);
      frameElement.dispatchEvent(event);
    } :
    function() { // [ag] in IE event is global, no need to shadow it
      frameElement.fireEvent(
        'onpage',
        document.createEventObject()
      );
    };

  // initialize JSONP wrapper
  if (typeof url == 'string' &&
    (jsonp = url.match(JSONP))) { // [ag] now if match is truthy ;-)

    // build html string to inject
    html = '<script>' +
      'function ' + jsonp[1] + '(data) { ' +
        jsonp[1] + ' = function() { return data; };' +
        '(' + trigger + ')();' +
      '};' +
      'onload = function() {' +
        'var d = document,' +
        'r = d.documentElement,' +
        's = d.createElement("script");' +
        's.onerror = ' + jsonp[1] + ';' + // [ag] you really want this notification too!
        's.type = "text/javascript";' +   // [ag] IIRC some old IE won't script without it
        's.src = "' + url + '";' +
        'r.insertBefore(s, r.firstChild);' +
      '};' +
    '</script>';

    // ensure quotes and slashes are escaped
    html = html.replace(/([\x22\x27\x2f])/g, '\\$1');

    // create iframe
    iframe = d.createElement('iframe');

    // inject html into it
    iframe.src = 'javascript:"' + html + '"';

    // [ag] nitpick:
    // you can pass a function directly
    // not sure why you went for the HTML + script injection
    // javacript:(function(){}());
    // would/should do it too?

    // insert iframe element
    r.insertBefore(iframe, r.firstChild);

    // add custom event listener
    if (iframe.addEventListener) {
      iframe.addEventListener('onpage', iframe_handler, false);
    } else {
      iframe.attachEvent('onpage', iframe_handler);
    }

  }

  // decoupling handler
  function iframe_handler() {
    if (callback && callback.call) {
      callback.call(this, this.contentWindow);
      // defer iframe removal
      w.setTimeout(function() {
        iframe.parentNode.removeChild(iframe);
      });
    }
  }
  // [ag] so that if window._123() returns an error you can handle that case too

}
