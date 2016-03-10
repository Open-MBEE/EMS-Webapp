'use strict';

angular.module('mms.directives')
.directive('mmsTranscludeVal', ['ElementService', 'UtilsService', 'UxService', 'Utils', 'URLService', '$http', '_', '$log', '$compile', '$templateCache', 'growl', mmsTranscludeVal]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTranscludeVal
 *
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires $compile
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's value binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and val change,
 * and on click. The element should be a Property. Nested transclusions within 
 * string values will also be registered.
 *
 * @param {string} mmsEid The id of the element whose value to transclude
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsTranscludeVal(ElementService, UtilsService, UxService, Utils, URLService, $http, _, $log, $compile, $templateCache, growl) {
    var valTemplate = $templateCache.get('mms/templates/mmsTranscludeVal.html');
    var frameTemplate = $templateCache.get('mms/templates/mmsTranscludeValFrame.html');
    var editTemplate = $templateCache.get('mms/templates/mmsTranscludeValEdit.html');
    var emptyRegex = /^\s*$/;

    var mmsTranscludeCtrl = function ($scope, $rootScope) {

        $scope.bbApi = {};
        $scope.buttons = [];
        $scope.buttonsInit = false;

        $scope.bbApi.init = function() {
            if (!$scope.buttonsInit) {
                $scope.buttonsInit = true;
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation.element.preview", $scope));
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation.element.save", $scope));
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation.element.saveC", $scope));
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation.element.cancel", $scope));
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation.element.delete", $scope));
                $scope.bbApi.setPermission("presentation.element.delete", $scope.isDirectChildOfPresentationElement);
            }     
        };
    };

    var mmsTranscludeValLink = function(scope, element, attrs, controllers) {
        var mmsViewCtrl = controllers[0];
        var mmsViewPresentationElemCtrl = controllers[1];
        scope.recompileScope = null;
        var processed = false;
        scope.cfType = 'val';
        element.click(function(e) {
            if (scope.addFrame)
                scope.addFrame();

            if (mmsViewCtrl)
                mmsViewCtrl.transcludeClicked(scope.mmsEid);

            /*if (e.target.tagName !== 'A' && e.target.tagName !== 'INPUT' && !scope.isEditing) //need review for inline editing (boolean and nested)
                return false;
            if (scope.isEditing)*/
                e.stopPropagation();
        
        });

        var recompile = function() {
            if (scope.recompileScope)
                scope.recompileScope.$destroy();
            scope.isEditing = false;
            var toCompileList = [];
            var areStrings = false;
            var isExpression = false;

            for (var i = 0; i < scope.values.length; i++) {
                if (scope.values[i].type === 'LiteralString') {
                    areStrings = true;
                    var s = scope.values[i].string;
                    if (s.indexOf('<p>') === -1) {
                        s = s.replace('<', '&lt;');
                    }
                    toCompileList.push(s);
                } else if (scope.values[i].type === 'Expression') {
                    isExpression = true;
                    break;
                } else {
                    break;
                }
            } 
            element.empty();
            scope.recompileScope = scope.$new();
            if (scope.values.length === 0 || Object.keys(scope.values[0]).length < 2)
                element[0].innerHTML = '<span class="no-print">' + ((scope.version === 'latest') ? '(no value)' : '') + '</span>';
            else if (areStrings) {
                var toCompile = toCompileList.join(' ');
                if (toCompile === '' || emptyRegex.test(toCompile)) {
                    element[0].innerHTML = '<span class="no-print">' + ((scope.version === 'latest') ? '(no value)' : '') + '</span>';
                    return;
                }
                element[0].innerHTML = toCompile;
                $compile(element.contents())(scope.recompileScope); 
            } else if (UtilsService.isRestrictedValue(scope.values)) {
                ElementService.getElement(scope.values[0].operand[1].element, false, scope.ws, scope.version, 2)
                .then(function(e) {
                    scope.isRestrictedVal = true;
                    element[0].innerHTML = "<span>" + e.name + "</span>";
                });
            } else if (isExpression) {
                $http.get(URLService.getElementURL(scope.mmsEid, scope.ws, scope.version) + '?evaluate')
                .success(function(data,status,headers,config) {
                    element[0].innerHTML = data.elements[0].evaluationResult;
                }).error(function(data,status,headers,config){
                    //URLService.handleHttpStatus(data, status, headers, config, deferred);
                    //TODO: Needs case statement when .error is thrown
                });
            } else {
                element[0].innerHTML = valTemplate;
                //element.append(valTemplate);
                $compile(element.contents())(scope.recompileScope);
            }
            if (mmsViewCtrl) {
                mmsViewCtrl.elementTranscluded(scope.element);
            }
        };

        var recompileEdit = function() {
            if (scope.recompileScope)
                scope.recompileScope.$destroy();
            var toCompileList = [];
            var areStrings = false;
            for (var i = 0; i < scope.editValues.length; i++) {
                if (scope.editValues[i].type === 'LiteralString') {
                    areStrings = true;
                    var s = scope.editValues[i].string;
                    if (s.indexOf('<p>') === -1) {
                        s = s.replace('<', '&lt;');
                    }
                    toCompileList.push(s);
                } else {
                    break;
                }
            } 
            element.empty();
            scope.recompileScope = scope.$new();
            if (scope.editValues.length === 0 || Object.keys(scope.editValues[0]).length < 2)
                element[0].innerHTML = '<span' + ((scope.version === 'latest') ? '' : ' class="placeholder"') + '>(no value)</span>';
            else if (areStrings) {
                var toCompile = toCompileList.join(' ');
                if (toCompile === '' || /^\s*$/.test(toCompile)) {
                    element[0].innerHTML = '<span' + ((scope.version === 'latest') ? '' : ' class="placeholder"') + '>(no value)</span>';
                    return;
                }
                element[0].innerHTML = '<div class="panel panel-info">'+toCompile+'</div>';
                $compile(element.contents())(scope.recompileScope); 
            } else if (UtilsService.isRestrictedValue(scope.editValues)) {
                ElementService.getElement(scope.editValues[0].operand[1].element, false, scope.ws, scope.version, 2)
                .then(function(e) {
                    element[0].innerHTML = e.name;
                });
            } else {
                element[0].innerHTML = editTemplate;
                //element.append(editTemplate);
                $compile(element.contents())(scope.recompileScope);
            }
        };

        var idwatch = scope.$watch('mmsEid', function(newVal, oldVal) {
            if (!newVal)
                return;
            idwatch();
            if (UtilsService.hasCircularReference(scope, scope.mmsEid, 'val')) {
                //$log.log("prevent circular dereference!");
                element.html('<span class="error">Circular Reference!</span>');
                return;
            }
            element.html('(loading...)');
            var ws = scope.mmsWs;
            var version = scope.mmsVersion;
            if (mmsViewCtrl) {
                var viewVersion = mmsViewCtrl.getWsAndVersion();
                if (!ws)
                    ws = viewVersion.workspace;
                if (!version)
                    version = viewVersion.version;
            }
            scope.ws = ws;
            scope.version = version ? version : 'latest';
            ElementService.getElement(scope.mmsEid, false, ws, version, 1)
            .then(function(data) {
                scope.element = data;
                scope.values = scope.element.specialization.value;
                if (scope.element.specialization.type === 'Constraint' && scope.element.specialization.specification)
                    scope.values = [scope.element.specialization.specification];
                if (scope.element.specialization.type==='Expression') {
                    scope.values = [scope.element.specialization];
                }
                recompile();
                //scope.$watch('values', recompile, true);
                if (scope.version === 'latest') {
                    scope.$on('element.updated', function(event, eid, ws, type, continueEdit) {
                        if (eid === scope.mmsEid && ws === scope.ws && (type === 'all' || type === 'value') && !continueEdit)
                            recompile();
                    });
                }
            }, function(reason) {
                var status = ' not found';
                if (reason.status === 410)
                    status = ' deleted';
                element.html('<span class="error">value cf ' + newVal + status + '</span>');
                //growl.error('Cf Val Error: ' + reason.message + ': ' + scope.mmsEid);
            });
        });

        scope.hasHtml = function(s) {
            return Utils.hasHtml(s);
        };

        scope.addValueTypes = {string: 'LiteralString', boolean: 'LiteralBoolean', integer: 'LiteralInteger', real: 'LiteralReal'};
        scope.addValue = function(type) {
            if (type === 'LiteralBoolean')
                scope.editValues.push({type: type, boolean: false});
            else if (type === 'LiteralInteger')
                scope.editValues.push({type: type, integer: 0});
            else if (type === 'LiteralString')
                scope.editValues.push({type: type, string: ''});
            else if (type === 'LiteralReal')
                scope.editValues.push({type: type, double: 0.0});
        };
        scope.addValueType = 'LiteralString';

        if (mmsViewCtrl) { 
            
            scope.isEditing = false;
            scope.elementSaving = false;
            scope.isDirectChildOfPresentationElement = Utils.isDirectChildOfPresentationElementFunc(element, mmsViewCtrl);
            scope.view = mmsViewCtrl.getView();
            var type = "value";

            var callback = function() {
                Utils.showEditCallBack(scope, mmsViewCtrl, element, frameTemplate, recompile, recompileEdit, type);
            };
            
            mmsViewCtrl.registerPresenElemCallBack(callback);

            scope.$on('$destroy', function() {
                mmsViewCtrl.unRegisterPresenElemCallBack(callback);
            });

            scope.save = function() {
                Utils.saveAction(scope, recompile, scope.bbApi, null, type, element);
            };

            scope.saveC = function() {
                Utils.saveAction(scope, recompile, scope.bbApi, null, type, element, true);
            };

            scope.cancel = function() {
                Utils.cancelAction(scope, recompile, scope.bbApi, type, element);
            };

            scope.addFrame = function() {
                if (scope.isRestrictedVal) {
                    var options = [];
                    scope.values[0].operand[2].operand.forEach(function(o) {
                        options.push(o.element);
                    });
                    ElementService.getElements(options, false, scope.ws, scope.version)
                    .then(function(elements) {
                        scope.options = elements;
                        Utils.addFrame(scope, mmsViewCtrl, element, frameTemplate);
                    });
                } else {
                    //The editor check occurs here; should get "not supported for now" from here

                    //Get the ID, do backend call for Element data
                    var id = scope.element.specialization.propertyType;
                    if (!id || scope.element.specialization.isSlot || (scope.isEnumeration && scope.options)) {
                        Utils.addFrame(scope, mmsViewCtrl, element, frameTemplate);
                        return;
                    }
                    var elementData = ElementService.getElement(id, false, scope.ws, scope.version);

                    elementData.then(
                        function(val) {
                            //Filter for enumeration type
                            if (val.appliedMetatypes && val.appliedMetatypes.length > 0 && 
                                val.appliedMetatypes[0] === '_9_0_62a020a_1105704885400_895774_7947') {
                                scope.isEnumeration = true;
                                var fillData = ElementService.getOwnedElements(val.sysmlid, false, scope.ws, scope.version, 1);

                                fillDropDown(fillData);
                            } else
                                Utils.addFrame(scope, mmsViewCtrl, element, frameTemplate);
                        },
                        function(reason) {
                            Utils.addFrame(scope, mmsViewCtrl, element, frameTemplate);
                        }
                    );

                    var fillDropDown = function(data) {
                        data.then(
                            function(val) {
                                var newArray = [];
                                //Filter only for appropriate property value
                                for (var i = 0; i < val.length; i++) {
                                    if( val[i].appliedMetatypes && val[i].appliedMetatypes.length > 0 && 
                                        val[i].appliedMetatypes[0] === '_9_0_62a020a_1105704885423_380971_7955') {
                                        newArray.push(val[i]);
                                    }
                                }
                                scope.options = newArray;
                                Utils.addFrame(scope,mmsViewCtrl,element,frameTemplate); //For Edit view, no need for addFrame
                            },
                            function(reason) {
                                console.log(reason);
                                growl.error('Failed to get enumeration options: ' + reason.message);
                            }
                        );
                    };
                }
            };

            scope.preview = function() {
                Utils.previewAction(scope, recompileEdit, recompile, type, element);
            };
        } 
        //actions for stomp 
        scope.$on("stomp.element", function(event, deltaSource, deltaWorkspaceId, deltaElementId, deltaModifier, elemName){
            if(deltaWorkspaceId === scope.ws && deltaElementId === scope.mmsEid){
                if(scope.isEditing === false){
                    recompile();
                }
                if(scope.isEditing === true){
                    growl.warning("This value has been changed: " + elemName +
                                " modified by: " + deltaModifier, {ttl: -1});
                }
            }
        });
        if (mmsViewPresentationElemCtrl) {
            scope.delete = function() {
                Utils.deleteAction(scope,scope.bbApi,mmsViewPresentationElemCtrl.getParentSection());
            };
            scope.instanceSpec = mmsViewPresentationElemCtrl.getInstanceSpec();
            scope.instanceVal = mmsViewPresentationElemCtrl.getInstanceVal();
            scope.presentationElem = mmsViewPresentationElemCtrl.getPresentationElement();
        }
    };

    return {
        restrict: 'E',
        //template: template,
        scope: {
            mmsEid: '@',
            mmsWs: '@',
            mmsVersion: '@'
        },
        require: ['?^mmsView','?^mmsViewPresentationElem'],
        controller: ['$scope', mmsTranscludeCtrl],
        link: mmsTranscludeValLink
    };
}