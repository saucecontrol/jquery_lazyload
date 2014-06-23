/*
 * Lazy Load - jQuery plugin for lazy loading images
 *
 * Copyright (c) 2007-2013 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.appelsiini.net/projects/lazyload
 *
 * Version:  1.9.3 gbcr mod by Clinton Ingram
 *
 */

(function($, window, document, undefined) {
    "use strict";
    var $window = $(window);

    $.fn.lazyload = function(options) {
        var elements = this;
        var $container;
        var settings = {
            threshold       : 0,
            failure_limit   : 0,
            event           : "scroll",
            effect          : "show",
            container       : window,
            data_attribute  : "original",
            prune_detached  : false,
            appear          : $.noop,
            load            : $.noop,
            placeholder     : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC"
        };

        function update() {
            var counter = 0;
            var prune_list = [], trigger_list = [];
            var container_box, position;

            elements.each(function() {
                if (this.loaded) {
                    return prune_list.push(this);
                }

                container_box = container_box || box($container[0]).pad(options.threshold);
                position = box(this).compareTo(container_box);
                if (undefined === position && settings.prune_detached && !$.contains(document, this)) {
                    prune_list.push(this);
                } else if (0 === position) {
                    trigger_list.push(this);
                    /* if we found an image we'll load, reset the counter */
                    counter = 0;
                } else if (1 === position) {
                    return counter++ < settings.failure_limit;
                }
            });

            elements = elements.not(prune_list);
            setTimeout(function () { $(trigger_list).trigger("appear"); }, 0);
        }

        function updateAndReattach(event) {
            update();
            if (elements.length && event) {
                $(this).one(event.type, updateAndReattach)
            }
        }

        if(options) {
            /* Maintain BC for a couple of versions. */
            if (undefined !== options.failurelimit) {
                options.failure_limit = options.failurelimit;
                delete options.failurelimit;
            }
            if (undefined !== options.effectspeed) {
                options.effect_speed = options.effectspeed;
                delete options.effectspeed;
            }

            $.extend(settings, options);
        }

        /* Cache container as jQuery as object. */
        $container = (settings.container === undefined ||
                      settings.container === window) ? $window : $(settings.container);

        /* Fire one scroll event per scroll. Not one scroll event per image. */
        if (0 === settings.event.indexOf("scroll")) {
           $container.one("scroll", updateAndReattach);
         }

        this.each(function() {
            var self = this;
            var $self = $(self);

            self.loaded = false;

            /* If no src attribute given use data:uri. */
            if ($self.attr("src") === undefined || $self.attr("src") === false) {
                if ($self.is("img")) {
                    $self.attr("src", settings.placeholder);
                }
            }

            /* When appear is triggered load original image. */
            $self.one("appear", function() {
                if (!this.loaded) {

                settings.appear.call(self, elements.length, settings);

                    $("<img />")
                        .bind("load", function() {

                            var original = $self.attr("data-" + settings.data_attribute);
                            $self.hide();
                            if ($self.is("img")) {
                                $self.attr("src", original);
                            } else {
                                $self.css("background-image", "url('" + original + "')");
                            }
                            $self[settings.effect](settings.effect_speed);

                            self.loaded = true;

                            settings.load.call(self, elements.length, settings);
                        })
                        .attr("src", $self.attr("data-" + settings.data_attribute));
                }
            });

            /* When wanted event is triggered load original image */
            /* by triggering appear.                              */
            if (0 !== settings.event.indexOf("scroll")) {
                $self.bind(settings.event, function() {
                    if (!self.loaded) {
                        $self.trigger("appear");
                    }
                });
            }
        });

        /* Check if something appears when window is resized. */
        $window.one("resize", updateAndReattach);

        /* With IOS5 force loading images when navigating with back button. */
        /* Non optimal workaround. */
        if ((/(?:iphone|ipod|ipad).*os 5/gi).test(navigator.appVersion)) {
            $window.bind("pageshow", function(event) {
                if (event.originalEvent && event.originalEvent.persisted) {
                    elements.each(function() {
                        $(this).trigger("appear");
                    });
                }
            });
        }

        /* Force initial check if images should appear. */
        update();

        return this;
    };

    /* Convenience methods in jQuery namespace.           */
    /* Use as  $.belowthefold(element, {threshold : 100, container : window}) */

    function makeUtility(func) {
        return function (element, settings) {
            var s = settings || {},
                e = box(element[0] || element),
                c = box(s.container ? s.container[0] || s.container : window);

            return e.empty || c.empty
                ? undefined
                : func.call(e, e, s.threshold ? c.pad(s.threshold) : c);
        };
    }

    $.extend({
        belowthefold: makeUtility(function(e, c) { return e.top     > c.bottom; }),
        rightoffold : makeUtility(function(e, c) { return e.left    > c.right;  }),
        abovethetop : makeUtility(function(e, c) { return e.bottom  < c.top;    }),
        leftofbegin : makeUtility(function(e, c) { return e.right   < c.left    }),
        inviewport  : makeUtility(function(e, c) { return e.compareTo(c) === 0; })
    });

    /* Custom selectors for your convenience.   */
    /* Use as $("img:below-the-fold").something() or */
    /* $("img").filter(":below-the-fold").something() which is faster */

    $.extend($.expr[":"], {
        "below-the-fold" : function(a) { return $.belowthefold(a); },
        "above-the-top"  : function(a) { return $.abovethetop(a); },
        "right-of-screen": function(a) { return $.rightoffold(a); },
        "left-of-screen" : function(a) { return $.leftofbegin(a); },
        "in-viewport"    : function(a) { return $.inviewport(a); },
        /* Maintain BC for couple of versions. */
        "above-the-fold" : function(a) { return !$.belowthefold(a); },
        "right-of-fold"  : function(a) { return $.rightoffold(a); },
        "left-of-fold"   : function(a) { return !$.rightoffold(a); }
    });

    /* Measurement logic. */
    /* Uses getBoundingClientRect() where possible for maximum performance. */
    /* Includes jQuery fallbacks for maximum compatibility. */

    function box(element) {
        if (!(this instanceof box)) {
            return new box(element);
        }

        if (element === window) {
            this.top    = box.gbcr ? 0 : $window.scrollTop();
            this.left   = box.gbcr ? 0 : $window.scrollLeft();
            this.bottom = this.top  + (window.innerHeight || $window.height());
            this.right  = this.left + (window.innerWidth  || $window.width());
        } else if (box.gbcr) {
            var rect = element.getBoundingClientRect();
            this.top    = rect.top;
            this.left   = rect.left;
            this.bottom = rect.bottom;
            this.right  = rect.right;
        } else if (element.style.display === "none" || !$.contains(document, element)) {
            this.top = this.left = this.bottom = this.right = 0;
        } else {
            var $element = $(element),
                offset = $element.offset();
            this.top    = offset.top;
            this.left   = offset.left;
            this.bottom = this.top  + $element.outerHeight();
            this.right  = this.left + $element.outerWidth();
        }

        this.empty = 0 === this.top === this.bottom === this.left === this.right;
    }

    box.gbcr = undefined !== document.documentElement.getBoundingClientRect;

    box.prototype.pad = function(n) {
        this.top    -= n;
        this.left   -= n;
        this.bottom += n;
        this.right  += n;

        return this;
    };

    box.prototype.compareTo = function(other) {
        return this.empty || other.empty
            ? undefined
            : this.bottom < other.top    || this.right < other.left
            ? -1 /* before */
            : this.top    > other.bottom || this.left  > other.right
            ? 1  /* after */
            : 0; /* intersecting */
    }

})(jQuery, window, document);
