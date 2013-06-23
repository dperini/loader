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

  // used to extract the callback function name from URL
  // should cover the majority of popular REST/JSON API
  JSONP = /(?:callback|jsoncallback|jsonp)=([^\x26]*)/;

  /* ========== VAR BLOCK END ========== */

  // dispatch custom event
  trigger = d.createEvent ?
    function(event) {
      event = document.createEvent('Event');
      event.initEvent('onpage', true, true);
      frameElement.dispatchEvent(event);
    } :
    function() {
      frameElement.fireEvent('onpage', document.createEventObject());
    };

  // initialize JSONP wrapper
  if (typeof url == 'string' &&
    (jsonp = url.match(JSONP)) && jsonp[1]) {

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
        'r.insertBefore(s, r.firstChild);' +
        's.src = "' + url + '";' +
      '};' +
    '</script>';

    // ensure quotes and slashes are escaped
    html = html.replace(/([\x22\x27\x2f])/g, '\\$1');

    // create iframe
    iframe = d.createElement('iframe');

    // inject html into it
    iframe.src = 'javascript:"' + html + '"';

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

}
