/*global logger*/
/*
    GoogleCombo
    ========================

    @file      : GoogleCombo.js
    @version   : 1.0.0
    @author    : Willem van Zantvoort
    @date      : 2016-06-30
    @copyright : TimeSeries Group 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "dojo/text!GoogleCombo/widget/template/GoogleCombo.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, domStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("GoogleCombo.widget.GoogleCombo", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        jsonDataSource: "",
		jsonOptions: "",



        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,
        _chart: null,
        _dataset: null,
        _datasetCounter: 0,
        _data: null,


        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");

            if (!window._googleLoading || window._googleLoading === false) {
                window._googleLoading = true;
                this._googleApiLoadScript = dom.script({'src' : 'https://www.gstatic.com/charts/loader.js', 'id' : 'GoogleApiLoadScript'});
                document.getElementsByTagName('head')[0].appendChild(this._googleApiLoadScript);
            }

            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
              this._readOnly = true;
            }

            this._updateRendering();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            logger.debug(this.id + ".resize");
            if (this._chart !== null) {
                this._chart.clearChart();
                logger.debug("redrawing chart");
                this._chart.draw(this._data, this._options);
            }
        },

        _createTable: function(returnedList, callback) {
            logger.debug(this.id + "._createTable");
            var jsonString = this._contextObj ? this._contextObj.get(this.jsonDataSource) : "";
            this._data = new google.visualization.DataTable(jsonString);
            this._drawChart(callback);
        },

        _drawChart: function (callback) {
            this._setOptions();

            logger.debug("Creating Combo chart");
            this._chart = new google.visualization.ComboChart(this.googleComboNode);
            logger.debug("Drawing chart");
            // google.visualization.events.addListener(this._chart, 'select', lang.hitch(this, this._selectHandler));
            this._chart.draw(this._data, this._options);

          //google.charts.setOnLoadCallback(this._drawGantt(data, options));
        },

        // _selectHandler: function (callback) {
        // A BIT USELESS :'(
        //     logger.debug("selection made");
        //     var selection = this._chart.getSelection();
        //     logger.debug(selection);
        //     logger.debug(this._data.getValue(selection[0].row, selection[0].column));
        // },

        _setOptions: function () {
			var jsonOptionsString = this._contextObj ? this._contextObj.get(this.jsonOptions) : "";
            this._options = JSON.parse(jsonOptionsString);

        },

        // Rerender the interface.
        _updateRendering: function(callback) {
            logger.debug(this.id + "._updateRendering");
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            if (this._contextObj !== null) {
                // Display widget dom node.
                domStyle.set(this.domNode, 'display', 'block');
                if(!window._googleVisualization || window._googleVisualization === false) {
                    this._googleVisualization = lang.hitch(this, function () {
                    if (typeof google !== 'undefined') {
                        window._googleVisualization = true;
                        google.charts.load('current',{'packages' : ['corechart']});
                        google.charts.setOnLoadCallback(lang.hitch(this, function() {this._createTable(callback);}));
                    } else {
                        var duration =  new Date().getTime() - this._startTime;
                        if (duration > 5000) {
                            console.warn('Timeout loading Google API.');
                            return;
                        }
                        setTimeout(this._googleVisualization,250);
                    }
                    });
                } else {
                    if (typeof google !== 'undefined') {
                        window._googleVisualization = true;
                        google.charts.load('current',{'packages' : ['corechart']});
                        google.charts.setOnLoadCallback(lang.hitch(this, function() {this._createTable(callback);}));
                    } else {
                        var duration =  new Date().getTime() - this._startTime;
                        if (duration > 5000) {
                            console.warn('Timeout loading Google API.');
                            return;
                        }
                        setTimeout(this._googleVisualization,250);
                    }
                }
                this._startTime = new Date().getTime();
                setTimeout(this._googleVisualization,100);
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
            mendix.lang.nullExec(callback);
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  mx.data.unsubscribe(handle);
              });
              this._handles = [];
          }
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                var validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, validationHandle ];
            }
        },

        uninitialize: function(o) {
            console.log("Uninitialize " + o);
            this._unsubscribe();
            dojo.empty(this.domNode);
            this.googleComboNode = this.domNode;
        }
    });
});

require(["GoogleCombo/widget/GoogleCombo"]);
