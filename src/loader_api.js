(function LoaderAPIFactory() {

  var w = window,

  // could be everywhere writable
  scope = w.navigator,

  // module factory namespace
  // reuse instance or create new
  MF = scope['modules'] ||
    (scope['modules'] = { }),

  indexof = window.Array.prototype.indexOf ?
    function(list, item) {
      return list.indexOf(item);
    } :
    function(list, item) {
      var i, l, found = -1;
      for (i = 0, l = list.length; l > i; ++i) {
        if (list[i] === item) {
          found = i;
          break;
        }
      }
      return found;
    },

  Loader = MF.Loader.objects[0];

  Loader.prototype.eval = function _eval(src, scope) {
    return w.Function(src).call(scope);
  };

  Loader.prototype.evalAsync = function _evalAsync(src, success, failure) {
    return w.setTimeout(w.Function(src));
  };

  Loader.prototype.has = function has(name) {
    return indexof(this.names, name) >= 0;
  };

  Loader.prototype.get = function get(name) {
    var k = indexof(this.names, name);
    return k >=0 && this.sources[k];
  };

  Loader.prototype.set = function set(name, source, object) {
    MF[name] || (MF[name] = object);
    if (this.names && indexof(this.names, name) < 0) {
      this.names.push(name);
      this.objects.push(object);
      this.sources.push(source.toString());
    } else {
      this.names = [name];
      this.objects = [object];
      this.sources = [source.toString()];
    }
  };

  Loader.prototype.fetch = function fetch(name, success, failure) {
  };

  // reserved word 'import' on IE < 9
  Loader.prototype['import'] = function _import(name, success, failure) {
  };

  // reserved word 'delete' on IE < 9
  Loader.prototype['delete'] = function _delete(name) {
    var k = indexof(this.names, name);
    if (k >= 0) {
      delete MF[name];
      this.names.splice(k, 1);
      this.objects.splice(k, 1);
      this.sources.splice(k, 1);
    }
  };

})();
