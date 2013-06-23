# Loader *<sub><sup><sup><sup>(work in progress)</sup></sup></sup></sub>*
Resource loader using iframes

## Objectives
Just a few of them ;)
* load resources in parallel using a non-blocking behaviour
* avoid delaying both the `load` and the `DOMContentLoaded` events
* if required, preserve scripts execution order even after the `load` event
* build a persistent modular system based on reusable source code (factory strings)

Currently a small `loadJSON.js` standalone helper shows most of these capabilities:
* loading URL resource asynchronously and retrieve JSON source code string
* moving/getting the JSON object representation to/from other contexts
* complete *on-the-fly* DOM clean-up removing the iframe used for retrieval

## Premise
New generation of browsers are smart enough to load scripts in parallel.

Recent browsers also have support for "async" and "defer" attributes to let developers specify different execution behaviour and they support an extensive set of events that put developers in control of the various loading stages. Unfortunately the execution stages are not yet controllable and asynchronous processing through load events can quickly slip out of control with dependencies in play.

To improve the page load speed developers have found their ways to split the payload during the entire page load process depending on immediate or deferred requirements of the code (dependencies, form processing, non-immediately needed code etc.).

This is not the only thing we can do, we can actually do better, on the client and on the server !

## Reasons for another loader
I have built and used myself different sets of loaders during these years, the dynamic insertion pattern hasn't changed/improved much in what that delivers and limitation with slightly older versions of browsers have kept us from improving our control level over loading/executing Javascript code.

The attempt to emulate some of the [ES6 Harmony:module_loaders](http://wiki.ecmascript.org/doku.php?id=harmony:module_loaders) draft on current browsers would need different approaches from the usual dynamic script insertion currently available in other loader implementations. So here is my take at emulating it through iframes, for current and past browsers.

It is important to understand that all the features are not working just "out of the box" for any script.
Loaded modules need to cooperate to take advantage of the intrinsic concepts of a modular system.

However compatibility with existing code is maintained by avoiding the removal of the hosting iframe. That can be achieved by returning `true` from the success callback of each loaded resource group.

## Reasons to use iframes
The most important reasons are:
* they uniquely allow loading scripts after the `load` event and still preserve execution order
* they allow to load scripts in parallel without blocking page parsing and rendering operations
* they let us recover source code of cooperating modules/scripts without affecting the main context

other iframes capabilities like executing Javascript code in a sandboxed environment are a plus but not as important as the reasons mentioned above.

## How to include it
To include the "Loader" tool and the "Loader API" in a standard web page use:

    <script type="text/javascript" src="loader.js"></script>
    <script type="text/javascript" src="loader_api.js"></script>

the second script is optional and unrelated to the basic load operation, it is important as long as you want to use a simple set of API to handle dynamic import of scripts in subsequent browsing contexts.

## How to use the load API
In the main `loader.js` there is only one basic implemented operations of the Loader object, the `load`method, behaving differently depending on the passed arguments.

#### load( *resource* `<string>`, *callback* `<function>`)
load a script from the network and store reusable data in the registry

#### load( [ *resource* `<string>`, ... ], *callback* `<function>`)
load a group of scripts from the network and store reusable data in the registry

#### load( [ *resource* `<object>`, ... ], *callback* `<function>`)
load a group of scripts from the network passing configuration options for each script and store reusable data in the registry

## Arguments of the 'load()' method
* @resource - URL (required: `<string>`, [`<string>`, ...] or [`<object>`, ...])
* @callback - user defined group success callback (optional: `<function>`)

## Resource object format
Loading multiple script, each with its different set of options, requires passing array of objects.
For each object the following properties may be specified:
* loadmode `<number>` loading mode
* loadname `<string>` module name
* resource `<string>` URL of resource
* success `<function>` success callback
* failure `<function>` failure callback

## Loading modes
*  0 asynchronously in main document (default)
*  1 asynchronously in iframe wrapper
*  2 maintain order in iframe wrapper
*  3 return JSONP from iframe wrapper
*  4 no group locks in iframe wrapper

## Script 'success' callback
Invoked as soon as each script has finished loading and executing.

## Group 'success' callback
Invoked as soon as each group of scripts has finished loading and executing.

## Callbacks arguments
The callback signature includes two arguments:
* host `<object>` iframe window reference
* name `<string>` name of the loaded module

the scope and values of these arguments:
* the `this` keyword references the originating iframe element
* the `host` argument references the iframe browsing context (window)
* the `name` argument is a string representing the name of the module

Return `true` in a script 'success' callback to instruct the loader to skip removing the iframe host.

When used, each of the "Script" callbacks will be invoked first, then the final "Group" callback will be invoked next. In between these callback the hosting iframe may be removed (default),  in this case the "Group" callback may be invoked with a "null" *host* value (the iframe was removed).

## Extra loader API
With the addition of the `loader_api.js` extension I have tried to fit my previous work to partially emulate the recent [ES6 Harmony:module_loaders](http://wiki.ecmascript.org/doku.php?id=harmony:module_loaders) draft, these are the minimal required API (more work needed):

#### has( *name* `<string>` )
check if the registry contains the named module, returns boolean `true` or `false`

#### get( *name* `<string>` )
get the source code of the named module from the registry, returns `<string>`

#### set( *name* `<string>`, *source* `<string>` )
set the source code of the named module possibly overwriting the registry

#### load( *resource* `<string>`, *callback* `<function>`)
load a script from the network and store reusable data in the registry

#### load( [ *resource* `<string>`, ... ], *callback* `<function>`)
load a group of scripts from the network and store reusable data in the registry

#### load( [ *resource* `<object>`, ... ], *callback* `<function>`)
load a group of scripts from the network passing configuration options for each script and store reusable data in the registry

#### import( *name* `<string>`, *context* `<object>` )
import the named module object from the registry into the specified context

#### delete( *name* `<string>`)
delete the registry for the named module, name, object and source code

## Minimal set of examples
    (function() {
      var m = navigator.modules,
      load = m.Loader && m.Loader.load;
      if (load) {
        load([{
          loadname: 'jQuery',
          resource: [
            'http://ajax.google.com/jquery/2.0.3/jquery.min.js',
            'http://ajax.google.com/jquery/1.10.3/jquery-ui.min.js'
          ],
          success: function() {
            modules.jQuery('#accordion', document).accordion();
            // this is important to let current
            // frameworks/libraries to work
            return true;
          }
        }]);
      }
    })();

Loading jQuery

    load('jquery.js', callback);

Loading jQuery + UI (preserving execution order)

    load(['jquery.js', 'jquery-ui.js'], callback);

Loading jQuery + UI (preserving execution order)

    load([{
      resource: ['jquery.js', 'jquery-ui.js'],
      success: success,
      failure: failure,
      loadmode: 2
    }], callback);

Loading jQuery + UI and dojo

    load([{
      resource: ['jquery.js', 'jquery-ui.js'],
      success: success,
      failure: failure,
      loadmode: 2
    },{
      resource: 'dojo.xd.js',
      success: success,
      failure: failure,
      loadmode: 1
    }], callback);
