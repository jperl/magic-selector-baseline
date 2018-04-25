// https://github.com/philc/vimium/blob/master/content_scripts/link_hints.coffee
(function() {
  var LocalHints, TypingProtector, WaitForEnter,
    __slice = [].slice,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __hasProp = {}.hasOwnProperty;

  /*
   * Determine whether the element is visible and clickable. If it is, find the rect bounding the element in
   * the viewport.  There may be more than one part of element which is clickable (for example, if it's an
   * image), therefore we always return a array of element/rect pairs (which may also be a singleton or empty).
   */
  LocalHints = {
    getVisibleClickable: function(element) {
      /*
       * Get the tag name.  However, `element.tagName` can be an element (not a string, see #2035), so we guard
       * against that.
       */
      var actionName, areas, areasAndRects, clientRect, contentEditable, eventType, imgClientRects, isClickable, jsactionRule, jsactionRules, map, mapName, namespace, onlyHasTabIndex, possibleFalsePositive, reason, role, ruleSplit, tabIndex, tabIndexValue, tagName, visibleElements, _base, _i, _len, _ref, _ref1, _ref10, _ref11, _ref12, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      tagName = (_ref = typeof (_base = element.tagName).toLowerCase === "function" ? _base.toLowerCase() : void 0) != null ? _ref : "";
      isClickable = false;
      onlyHasTabIndex = false;
      possibleFalsePositive = false;
      visibleElements = [];
      reason = null;

      // Insert area elements that provide click functionality to an img.
      if (tagName === "img") {
        mapName = element.getAttribute("usemap");
        if (mapName) {
          imgClientRects = element.getClientRects();
          mapName = mapName.replace(/^#/, "").replace("\"", "\\\"");
          map = document.querySelector("map[name=\"" + mapName + "\"]");
          if (map && imgClientRects.length > 0) {
            areas = map.getElementsByTagName("area");
            areasAndRects = DomUtils.getClientRectsForAreas(imgClientRects[0], areas);
            visibleElements.push.apply(visibleElements, areasAndRects);
          }
        }
      }

      // Check aria properties to see if the element should be ignored.
      if (((_ref1 = (_ref2 = element.getAttribute("aria-hidden")) != null ? _ref2.toLowerCase() : void 0) === "" || _ref1 === "true") ||
        ((_ref3 = (_ref4 = element.getAttribute("aria-disabled")) != null ? _ref4.toLowerCase() : void 0) === "" || _ref3 === "true")) {
          return []; // This element should never have a link hint.
      }

      // Check for AngularJS listeners on the element.
      if (this.checkForAngularJs == null) {
        this.checkForAngularJs = (function() {
          var angularElements, ngAttributes, prefix, separator, _i, _j, _len, _len1, _ref5, _ref6;
          angularElements = document.getElementsByClassName("ng-scope");
          if (angularElements.length === 0) {
            return function() {
              return false;
            };
          } else {
            ngAttributes = [];
            _ref5 = ['', 'data-', 'x-'];
            for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
              prefix = _ref5[_i];
              _ref6 = ['-', ':', '_'];
              for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
                separator = _ref6[_j];
                ngAttributes.push(prefix + "ng" + separator + "click");
              }
            }
            return function(element) {
              var attribute, _k, _len2;
              for (_k = 0, _len2 = ngAttributes.length; _k < _len2; _k++) {
                attribute = ngAttributes[_k];
                if (element.hasAttribute(attribute)) {
                  return true;
                }
              }
              return false;
            };
          }
        })();
      }
      isClickable || (isClickable = this.checkForAngularJs(element));


      // Check for attributes that make an element clickable regardless of its tagName.
      if (element.hasAttribute("onclick") || (role = element.getAttribute("role")) && ((_ref5 = role.toLowerCase()) === "button" || _ref5 === "tab" || _ref5 === "link" || _ref5 === "checkbox" || _ref5 === "menuitem" || _ref5 === "menuitemcheckbox" || _ref5 === "menuitemradio") || (contentEditable = element.getAttribute("contentEditable")) && ((_ref6 = contentEditable.toLowerCase()) === "" || _ref6 === "contenteditable" || _ref6 === "true")) {
        isClickable = true;
      }


      // Check for jsaction event listeners on the element.
      if (!isClickable && element.hasAttribute("jsaction")) {
        jsactionRules = element.getAttribute("jsaction").split(";");
        for (_i = 0, _len = jsactionRules.length; _i < _len; _i++) {
          jsactionRule = jsactionRules[_i];
          ruleSplit = jsactionRule.trim().split(":");
          if ((1 <= (_ref7 = ruleSplit.length) && _ref7 <= 2)) {
            _ref8 = ruleSplit.length === 1 ? ["click"].concat(__slice.call(ruleSplit[0].trim().split(".")), ["_"]) : [ruleSplit[0]].concat(__slice.call(ruleSplit[1].trim().split(".")), ["_"]), eventType = _ref8[0], namespace = _ref8[1], actionName = _ref8[2];
            isClickable || (isClickable = eventType === "click" && namespace !== "none" && actionName !== "_");
          }
        }
      }

      // Check for tagNames which are natively clickable.
      switch (tagName) {
        case "a":
          isClickable = true;
          break;
        case "textarea":
          isClickable || (isClickable = !element.disabled && !element.readOnly);
          break;
        case "input":
          isClickable || (isClickable = !(((_ref9 = element.getAttribute("type")) != null ? _ref9.toLowerCase() : void 0) === "hidden" || element.disabled || (element.readOnly && DomUtils.isSelectable(element))));
          break;
        case "button":
        case "select":
          isClickable || (isClickable = !element.disabled);
          break;
        case "label":
          isClickable || (isClickable = (element.control != null) && !element.control.disabled && (this.getVisibleClickable(element.control)).length === 0);
          break;
        case "body":
          isClickable || (isClickable = element === document.body && !windowIsFocused() && window.innerWidth > 3 && window.innerHeight > 3 && ((_ref10 = document.body) != null ? _ref10.tagName.toLowerCase() : void 0) !== "frameset" ? reason = "Frame." : void 0);
          isClickable || (isClickable = element === document.body && windowIsFocused() && Scroller.isScrollableElement(element) ? reason = "Scroll." : void 0);
          break;
        case "img":
          isClickable || (isClickable = (_ref11 = element.style.cursor) === "zoom-in" || _ref11 === "zoom-out");
          break;
        case "div":
        case "ol":
        case "ul":
          isClickable || (isClickable = element.clientHeight < element.scrollHeight && Scroller.isScrollableElement(element) ? reason = "Scroll." : void 0);
          break;
        case "details":
          isClickable = true;
          reason = "Open.";
      }

      /*
       * NOTE(smblott) Disabled pending resolution of #2997.
       * # Detect elements with "click" listeners installed with `addEventListener()`.
       * isClickable ||= element.hasAttribute "_vimium-has-onclick-listener"

       * An element with a class name containing the text "button" might be clickable.  However, real clickables
       * are often wrapped in elements with such class names.  So, when we find clickables based only on their
       * class name, we mark them as unreliable.
       */
      if (!isClickable && 0 <= ((_ref12 = element.getAttribute("class")) != null ? _ref12.toLowerCase().indexOf("button") : void 0)) {
        possibleFalsePositive = isClickable = true;
      }

      /*
       * Elements with tabindex are sometimes useful, but usually not. We can treat them as second class
       * citizens when it improves UX, so take special note of them.
       */
      tabIndexValue = element.getAttribute("tabindex");
      tabIndex = tabIndexValue === "" ? 0 : parseInt(tabIndexValue);
      if (!(isClickable || isNaN(tabIndex) || tabIndex < 0)) {
        isClickable = onlyHasTabIndex = true;
      }
      if (isClickable) {
        clientRect = DomUtils.getVisibleClientRect(element, true);
        if (clientRect !== null) {
          visibleElements.push({
            element: element,
            rect: clientRect,
            secondClassCitizen: onlyHasTabIndex,
            possibleFalsePositive: possibleFalsePositive,
            reason: reason
          });
        }
      }
      return visibleElements;
    },



    /*
     * Returns all clickable elements that are not hidden and are in the current viewport, along with rectangles
     * at which (parts of) the elements are displayed.
     * In the process, we try to find rects where elements do not overlap so that link hints are unambiguous.
     * Because of this, the rects returned will frequently *NOT* be equivalent to the rects for the whole
     * element.
     */
    getLocalHints: function(requireHref) {
      var descendantsToCheck, element, elements, hint, left, localHints, negativeRect, nonOverlappingElements, position, rects, top, visibleElement, visibleElements, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1;
      if (!document.documentElement) {
        return [];
      }
      elements = document.documentElement.getElementsByTagName("*");
      visibleElements = [];
      for (_i = 0, _len = elements.length; _i < _len; _i++) {
        element = elements[_i];
        if (!(requireHref && !element.href)) {
          visibleElement = this.getVisibleClickable(element);
          visibleElements.push.apply(visibleElements, visibleElement);
        }
      }
      visibleElements = visibleElements.reverse();
      descendantsToCheck = [1, 2, 3];
      visibleElements = (function() {
        var _j, _len1, _results;
        _results = [];
        for (position = _j = 0, _len1 = visibleElements.length; _j < _len1; position = ++_j) {
          element = visibleElements[position];
          if (element.possibleFalsePositive && (function() {
            var candidateDescendant, index, _, _k, _len2;
            index = Math.max(0, position - 6);
            while (index < position) {
              candidateDescendant = visibleElements[index].element;
              for (_k = 0, _len2 = descendantsToCheck.length; _k < _len2; _k++) {
                _ = descendantsToCheck[_k];
                candidateDescendant = candidateDescendant != null ? candidateDescendant.parentElement : void 0;
                if (candidateDescendant === element.element) {
                  return true;
                }
              }
              index += 1;
            }
            return false;
          })()) {
            continue;
          }
          _results.push(element);
        }
        return _results;
      })();
      localHints = nonOverlappingElements = [];
      while (visibleElement = visibleElements.pop()) {
        rects = [visibleElement.rect];
        for (_j = 0, _len1 = visibleElements.length; _j < _len1; _j++) {
          negativeRect = visibleElements[_j].rect;
          rects = (_ref = []).concat.apply(_ref, rects.map(function(rect) {
            return Rect.subtract(rect, negativeRect);
          }));
        }
        if (rects.length > 0) {
          nonOverlappingElements.push(extend(visibleElement, {
            rect: rects[0]
          }));
        } else {
          if (!visibleElement.secondClassCitizen) {
            nonOverlappingElements.push(visibleElement);
          }
        }
      }
      _ref1 = DomUtils.getViewportTopLeft(), top = _ref1.top, left = _ref1.left;
      for (_k = 0, _len2 = nonOverlappingElements.length; _k < _len2; _k++) {
        hint = nonOverlappingElements[_k];
        hint.rect.top += top;
        hint.rect.left += left;
      }
      if (Settings.get("filterLinkHints")) {
        for (_l = 0, _len3 = localHints.length; _l < _len3; _l++) {
          hint = localHints[_l];
          extend(hint, this.generateLinkText(hint));
        }
      }
      return localHints;
    },
    generateLinkText: function(hint) {
      var element, linkText, nodeName, showLinkText, _ref;
      element = hint.element;
      linkText = "";
      showLinkText = false;
      nodeName = element.nodeName.toLowerCase();
      if (nodeName === "input") {
        if ((element.labels != null) && element.labels.length > 0) {
          linkText = element.labels[0].textContent.trim();
          if (linkText[linkText.length - 1] === ":") {
            linkText = linkText.slice(0, linkText.length - 1);
          }
          showLinkText = true;
        } else if (((_ref = element.getAttribute("type")) != null ? _ref.toLowerCase() : void 0) === "file") {
          linkText = "Choose File";
        } else if (element.type !== "password") {
          linkText = element.value;
          if (!linkText && 'placeholder' in element) {
            linkText = element.placeholder;
          }
        }
      } else if (nodeName === "a" && !element.textContent.trim() && element.firstElementChild && element.firstElementChild.nodeName.toLowerCase() === "img") {
        linkText = element.firstElementChild.alt || element.firstElementChild.title;
        if (linkText) {
          showLinkText = true;
        }
      } else if (hint.reason != null) {
        linkText = hint.reason;
        showLinkText = true;
      } else if (0 < element.textContent.length) {
        linkText = element.textContent.slice(0, 256);
      } else if (element.hasAttribute("title")) {
        linkText = element.getAttribute("title");
      } else {
        linkText = element.innerHTML.slice(0, 256);
      }
      return {
        linkText: linkText.trim(),
        showLinkText: showLinkText
      };
    }
  };

  TypingProtector = (function(_super) {
    __extends(TypingProtector, _super);

    function TypingProtector(delay, callback) {
      var resetExitTimer;
      this.timer = Utils.setTimeout(delay, (function(_this) {
        return function() {
          return _this.exit();
        };
      })(this));
      resetExitTimer = (function(_this) {
        return function(event) {
          clearTimeout(_this.timer);
          return _this.timer = Utils.setTimeout(delay, function() {
            return _this.exit();
          });
        };
      })(this);
      TypingProtector.__super__.constructor.call(this, {
        name: "hint/typing-protector",
        suppressAllKeyboardEvents: true,
        keydown: resetExitTimer,
        keypress: resetExitTimer
      });
      this.onExit(function() {
        return callback(true);
      });
    }

    return TypingProtector;

  })(Mode);

  WaitForEnter = (function(_super) {
    __extends(WaitForEnter, _super);

    function WaitForEnter(callback) {
      WaitForEnter.__super__.constructor.call(this, {
        name: "hint/wait-for-enter",
        suppressAllKeyboardEvents: true,
        indicator: "Hit <Enter> to proceed..."
      });
      this.push({
        keydown: (function(_this) {
          return function(event) {
            if (event.key === "Enter") {
              _this.exit();
              return callback(true);
            } else if (KeyboardUtils.isEscape(event)) {
              _this.exit();
              return callback(false);
            }
          };
        })(this)
      });
    }

    return WaitForEnter;

  })(Mode);

}).call(this);
