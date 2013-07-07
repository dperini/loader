/*
 * loader.js - non-blocking resource loader using iframes
 * Copyright (C) 2006-2013 Diego Perini. All rights reserved.
 * Released under the MIT License see: http://nwbox.com/license
 */

//
// can be written in a previous script tag
// to allow configuring the loader behavior
//
// this.mf_config = { debug: true };
//

(function LoaderFactory(window, config) {

  // 'use strict';

  // shortcuts
  var MF,
    w = window,
    d = w.document,
    r = d.documentElement,

  // processing flags & queue
  done, loaded, sources = [ ],

  // an empty function shortcut
  FN = function(x) { return x; },

  // iframe and script to clone
  _iframe = d.createElement('iframe'),
  _script = d.createElement('script'),

  // iframe id & cache, grouping info
  _id = 0, _cache = [ ], group_id = 0,
  group_count = [ ], group_ready = [ ],

  // used to extract the callback function name from URL
  // should cover the majority of popular REST/JSON API
  JSONP = /(?:callback|jsoncallback|jsonp)=([^\x26]*)/,

  WRAPPER =
    '<script>' +
      '(function(){var w=window,d=w.document;})()' +
    '</script>',

  // the async attribute will break these assumptions &
  // dynamic script insertion will not work as expected
  //
  // references browser scripts collection
  scripts = d.scripts || d.getElementsByTagName('script'),
  // references currently executing script
  current = d.currentScript || scripts[scripts.length - 1];

  // check that current is the expected script or unset it
  /loader\.js$/.test(current.src) || (current == null);

  // set default config options
  config.scope || (config.scope = 'modules');
  config.name || (config.name = +new Date);
  config.debug || (config.debug = false);
  config.global || (config.global = w);

  // module factory namespace, reuse or create instance
  MF = w.navigator[config.scope] || (w.navigator[config.scope] = { });

  // set iframe defaults without using CSS
  // CSS is left for users to overwrite it
  _iframe.width = '0';
  _iframe.height = '0';
  _iframe.scrolling = 'no';
  _iframe.frameBorder = '0';
  //_iframe.style.display = 'none';

  // process queued resources
  function sequence(s) {
    w.setTimeout(function() {
      while ((s = sources.shift())) {
        load_resource({
          loadmode: s.loadmode,
          loadname: s.loadname,
          resource: s.resource,
          success: s.success,
          failure: s.failure
        });
      }
    });
  }

  // load
  function load_resource(descriptor) {

    var i, count, jsonp, html,

    length, iframe, script, wrap,

    success = descriptor.success,
    failure = descriptor.failure,

    loadmode = descriptor.loadmode,
    loadname = descriptor.loadname,

    resource = descriptor.resource,

    // BEGIN: iframe injectable functions

    // dispatch & setup are not used in the main context
    // they are injected in the iframe during creation

    dispatch = d.createEvent ? function dispatch(e) {
      (e = d.createEvent('Event')).initEvent('onpage', true, true);
      w.frameElement.dispatchEvent(e);
    } : function dispatch() {
      w.frameElement.fireEvent('onpage', d.createEventObject());
    },

    setup = function setup(scripts) {
      var h = d.head || d.documentElement,
      i, l = scripts.length || 1, s,
      t = d.createEvent ? 'onload' : 'onreadystatechange';
      function notify(e) {
        if (this.readyState && !(/complete|loaded/.test(this.readyState))) return;
        l && l-- && l === 0 && dispatch();
      }
      if (isNaN(scripts)) {
        w.onload = function() {
          for (i = 0; l > i; ++i) {
            s = d.createElement('script');
            s[t] = notify;
            s.onerror = notify;
            s.src = scripts[i];
            s = h.insertBefore(s, h.firstChild);
          }
        };
      }
    };

    // END: iframe injectable functions

    if (typeof resource == 'string') {
      resource = [ resource ];
    }

    length = resource.length;
    count = length;
    ++_id;

    function script_handler(e) {
      count--;
      count === 0 &&
        (e.type == 'load' ? success : failure).call(this, loadname, w);
    }

    // direct document insertion
    if (!loadmode) {
      /* mode 0 (default) */
      for (i = 0; length > i; ++i) {
        script = _script.cloneNode(true);
        if (script.onload === null) {
          script.onload = script_handler;
          script.onerror = script_handler;
          if (length > 1) script.async = false;
        } else if (script.onreadystatechange === null) {
          script.attachEvent('onerror', script_handler);
          script.attachEvent('onreadystatechange', function(e) {
            if (/complete|loaded/.test(script.readyState)) {
              script_handler(e);
            }
          });
        }
        if (current) {
          current.parentNode.insertBefore(script, current);
        } else {
          // fallback for when loader.js itself
          // is loaded with the async attribute
          r.insertBefore(script, d.head || r.firstChild);
        }
        script.src = resource[i];
      }
      return;
    }

    iframe = _iframe.cloneNode(true);

    // build html to be injected
    html = '';
    if (loadmode == 1 || loadmode == 3) {
      /* mode 1 & mode 3 */
      for (i = 0; length > i; ++i) {
        html += '"' + resource[i] + '"' + (i == length - 1 ? '' : ',');
      }
      html = WRAPPER.replace(';', ';' + dispatch + '(' + setup + ')([' + html + '])');
    } else {
      /* mode 2 & mode 4 */
      for (i = 0; length > i; ++i) {
        html += '<script src="' + resource[i] + '"></script>';
      }
      html += WRAPPER.replace(';', ';(' + dispatch + ')()');
    }

    if (loadmode == 3) {
      /* mode 3 */
      if (typeof resource[0] == 'string' &&
        (jsonp = resource[0].match(JSONP)) && jsonp[1]) {
        // initialize JSONP wrapper
        html = '<script>function ' + jsonp[1] + '(data) { ' +
          jsonp[1] + ' = function() { return data; };' +
        '}</script>' + html;
      }
    }

    // ensure quotes and slashes are escaped
    html = html.replace(/([\x22\x27\x2f])/g, '\\$1');

    // set iframe id and name to a unique string
    iframe.name = iframe.id = 'loader-' + (+new Date) + '-' + _id;

    // add custom events to iframe
    if (iframe.addEventListener) {
      iframe.addEventListener('onpage', iframe_handler, false);
    } else {
      iframe.attachEvent('onpage', iframe_handler);
    }

    // inject code in the iframe using the src attribute
    iframe.src = 'javascript:\'' + html + '\'';

    // insert iframe in the document, before the head section
    iframe = r.insertBefore(iframe, d.head || r.firstChild);

    // iframe callback & cleanup
    function iframe_handler(e) {

      var id, remove,
      name = loadname,
      host = iframe.contentWindow;

      // keep a reference to the iframe
      _cache.push(iframe);

      if (typeof success == 'function') {
        // JSONP callback already processed
        remove = success.call(iframe, name, host);
      }

      if (!remove && iframe.parentNode) {
        // remove iframe from main document
        w.setTimeout(function() {
          iframe.parentNode.removeChild(iframe);
        });
      }

      if (typeof success == 'function') {
        id = success.group_id;
        if (group_count[id]) {
          --group_count[id];
          if (group_count[id] === 0) {
            if (typeof group_ready[id] == 'function') {
              w.setTimeout(function() {
                group_ready[id].call(iframe, name, host);
              });
            }
          }
        }
      }

    }

  }

  if (MF && MF.Loader) {
    return;
  }

  // parse parameters and build load sequence
  function load(resources, success, failure) {

    var e, i, l, s, jsonp, name;

    if (typeof resources == 'string') {
      resources = [ resources ];
    }

    // queue resources
    if (typeof resources[0] == 'string') {
      // array of strings
      name = resources[0];
      jsonp = name.match(JSONP);
      success || (success = FN);
      success.group_id = group_id;
      sources.push({
        loadmode: 0,
        loadname: (jsonp && jsonp[1]) || name_from_url(name),
        resource: resources,
        success: success,
        failure: failure || FN
      });
    } else {
      // array of objects
      for (i = 0, l = 0; s = resources[i]; ++i) {
        name = typeof s.resource == 'string' ? s.resource : s.resource[i];
        jsonp = name.match(JSONP);
        s.success || (s.success = FN);
        s.success.group_id = group_id;
        sources.push({
          loadmode: s.loadmode || 0,
          loadname: s.loadname || (jsonp && jsonp[1]) || name_from_url(name),
          resource: s.resource,
          success: s.success,
          failure: s.failure || FN
        });
        // don't wait slow resources
        // in group success callbacks
        if (s.loadmode != 4) ++l;
      }
    }

    // fill loading group info
    group_ready[group_id] = success || FN;
    group_count[group_id] = l;
    ++group_id;

    function init(e) {
      loaded = true;
      sequence();
    }

    // start loading resources for DOM2/3 browsers
    // and pre-DOMContentLoaded requests
    if (!done && w.addEventListener) {
      done = true;
      // start queueing after DOMContentLoaded
      w.addEventListener('DOMContentLoaded', init, true);
    }

    // start loading resources for older browsers
    // and post-DOMContentLoaded requests
    if (!done || loaded) {
      sequence();
    }

  }

  // extract name from url
  function name_from_url(url) {
    var name = url.match(/[^\/]+$/);
    return name[0].split(/\_|\.|\-/)[0];
  }

  function Loader(options) {
    this.names = [ 'Loader' ];
    this.objects = [ Loader ];
    this.sources = [ LoaderFactory.toString() ];
  }

  Loader.prototype.load = load;

  (config.scope ? MF : window).Loader = new Loader;

})(window, this.mf_config || { });
