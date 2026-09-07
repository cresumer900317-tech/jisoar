/* ComBricks study-mirror shim
 * Replaces XMLHttpRequest so the pages run without the real device.
 * Responses are synthesized from per-item sections captured from a live
 * ComBricks (data_srv.cgi) on 2026-09-08.
 * Request format:  [return=a+b][&action=...][&data=A+B|property=A+B]...
 * Response format: URL-encoded, %1D-separated sections in request order,
 *                  return-echo values prepended.
 */
(function () {
  var MOCK = window.COMBRICKS_MOCK || {};      // whole-request exact matches
  var ITEMS = window.COMBRICKS_ITEMS || { data: {}, property: {} };
  var DEMO_MSG = "400%1F" + encodeURIComponent("데모 모드: 이 동작은 미러에서 비활성화되어 있습니다.");

  function lookupItem(kind, name) {
    var dict = ITEMS[kind] || {};
    if (dict.hasOwnProperty(name)) return dict[name];
    // fallback: longest shared prefix among entries with the same base name
    var base = name.split(":")[0];
    var best = null, bestLen = -1;
    for (var k in dict) {
      if (!dict.hasOwnProperty(k)) continue;
      if (k.split(":")[0] !== base) continue;
      var len = 0;
      while (len < k.length && len < name.length && k.charAt(len) === name.charAt(len)) len++;
      if (len > bestLen) { bestLen = len; best = k; }
    }
    return best !== null ? dict[best] : "";
  }

  function resolve(query) {
    if (!query) return "";
    if (query.indexOf("html=menu") >= 0) {
      return window.COMBRICKS_MENU_HTML || "";
    }
    var parts = query.split("&");
    var sections = [];
    var dataKeys = [];
    var hasAction = false, hasData = false;

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var eq = p.indexOf("=");
      if (eq < 0) continue;
      var kind = p.substring(0, eq);
      var val = p.substring(eq + 1);
      if (kind === "return") {
        var vals = val.split("+");
        for (var j = 0; j < vals.length; j++) sections.push(vals[j]);
      } else if (kind === "action" || kind === "save") {
        hasAction = true;
      } else if (kind === "data" || kind === "property") {
        hasData = true;
        dataKeys.push(p);
        var names = val.split("+");
        for (var n = 0; n < names.length; n++) sections.push(lookupItem(kind, names[n]));
      }
    }

    // exact whole-request capture wins over synthesis (minus return echo)
    var combined = dataKeys.join("&");
    if (combined && MOCK.hasOwnProperty(combined)) {
      var echoCount = sections.length;
      // count echo values actually pushed before data sections
      var echo = [];
      for (var e = 0; e < parts.length; e++) {
        if (parts[e].indexOf("return=") === 0) {
          echo = echo.concat(parts[e].substring(7).split("+"));
        }
      }
      var body = MOCK[combined];
      if (echo.length > 0) return echo.join("%1D") + "%1D" + body;
      return body;
    }

    if (!hasData && hasAction) return DEMO_MSG;
    return sections.join("%1D");
  }

  function FakeXHR() {
    this.readyState = 0;
    this.status = 0;
    this.responseText = "";
    this.timeout = 0;
    this.onreadystatechange = null;
    this.ontimeout = null;
    this._url = "";
    this._async = true;
  }

  FakeXHR.prototype.open = function (method, url, async) {
    this._url = String(url || "");
    this._async = (async !== false);
    this.readyState = 1;
  };

  FakeXHR.prototype.setRequestHeader = function () {};
  FakeXHR.prototype.abort = function () { this.readyState = 0; };
  FakeXHR.prototype.getAllResponseHeaders = function () { return ""; };
  FakeXHR.prototype.getResponseHeader = function () { return null; };

  FakeXHR.prototype.send = function (body) {
    var query = "";
    var qi = this._url.indexOf("?");
    if (qi >= 0) query = this._url.substring(qi + 1);
    else if (body) query = String(body);

    this.responseText = resolve(query);
    this.status = 200;
    this.readyState = 4;

    var self = this;
    if (this._async) {
      setTimeout(function () {
        if (typeof self.onreadystatechange === "function") self.onreadystatechange();
      }, 30);
    }
    // sync: caller reads responseText right after send() returns
  };

  window.XMLHttpRequest = FakeXHR;
  window.ActiveXObject = undefined;
})();
