'use strict';

angular.module('mms.directives')
.directive('mmsDiffAttr', ['ElementService', 'WorkspaceService','ConfigService', 'URLService','$q', '$compile', '$rootScope', '$interval', mmsDiffAttr]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsDiffAttr
 *
 * @requires mms.ElementService
 *
 * @restrict E
 *
 * @description
 *  Compares a element at two different times and generates a pretty diff.
 * ## Example
 *
 * <mms-diff-attr mms-eid="element-id" mms-attr="name/doc/val" mms-version-one="timestamp/latest/tag?" mms-version-two="timestamp/latest/tag?"></mms-diff-attr>
 *
 * @param {string} mmsEid The id of the element whose doc to transclude
 * @param {string=master} mmsAttr Attribute to use, ie name, doc, value
 * @param {string=master} mmsWsOne Workspace to use, defaults to current ws or master
 * @param {string=master} mmsWsTwo Workspace to use, defaults to current ws or master
 * @param {string=latest} mmsVersionOne  can be 'latest', timestamp or tag id, default is latest
 * @param {string=latest} mmsVersionTwo  can be 'latest', timestamp or tag id, default is latest
 */
function mmsDiffAttr(ElementService, WorkspaceService, ConfigService, URLService, $q, $compile, $rootScope, $interval) {

    var mmsDiffAttrLink = function(scope, element, attrs, mmsViewCtrl) {
        // TODO: error checking for missing elements -- util function for http error??
        var wsOne = scope.mmsWsOne;
        var wsTwo = scope.mmsWsTwo;
        var wsOneFlag = false;
        var wsTwoFlag = false;
        var viewVersion = null;

        var data1CheckForBreak = false;
        var data2CheckForBreak = false;
        var vrOneInvalidFlag = false;
        var vrTwoInvalidFlag = false;
        var origNotFound = false;
        var compNotFound = false;
        var deletedFlag = false;

        if (mmsViewCtrl)
            viewVersion = mmsViewCtrl.getWsAndVersion();

        if (!wsOne && viewVersion) {
            wsOne = viewVersion.workspace;
        } else if (!wsOne && !viewVersion) {
            wsOne = 'master';
        }

        if (!wsTwo && viewVersion) {
            wsTwo = viewVersion.workspace;
        } else if (!wsTwo && viewVersion) {
            wsTwo = 'master';
        }

        WorkspaceService.getWorkspace(wsOne).then(function(data) {
            tagOrTimestamp(scope.mmsVersionOne, wsOne).then(function(versionOrTs){
                getComparsionText(versionOrTs, wsOne).then(function(data){
                    scope.origElem = angular.element(data).text();
                    // run on interval to check when data gets changed. once it changes set to origElem and break out of interval
                    var promise1 = $interval(
                        function(){
                            if (scope.origElem == angular.element(data).text() && data1CheckForBreak) {
                                // console.log("data1 did not change again cancel out of interval : " +scope.origElem);
                                $interval.cancel(promise1);
                            } else if ( scope.origElem == angular.element(data).text() && !data1CheckForBreak ) {
                                data1CheckForBreak = true;
                                // console.log("data1 did not change make data change true : " +data1CheckForBreak);
                            }
                            scope.origElem = angular.element(data).text();
                            // console.log("here is the changed text: " +scope.origElem);
                        }, 5000);
                }, function(reject){
                    scope.origElem = reject;
                    if (reject.toLowerCase() == "not found") {
                        origNotFound = true;
                        scope.origElem = '';
                    }
                });
            }, function(reject){
                vrOneInvalidFlag = true;
            });
        }, function(reason) {
            wsOneFlag = true;
            element.html('<span class="mms-error">Workspace One does not exist.</span>');
        });


        WorkspaceService.getWorkspace(wsTwo).then(function(data) {
            tagOrTimestamp(scope.mmsVersionTwo, scope.mmsWsTwo).then(function(versionOrTs){
                getComparsionText(versionOrTs, scope.mmsWsTwo).then(function(data){
                    scope.compElem = angular.element(data).text();
                    var promise2 = $interval(
                        function(){
                            if (scope.compElem == angular.element(data).text() && data2CheckForBreak) {
                                // console.log("data2 did not change again cancel out of interval : " +scope.compElem);
                                $interval.cancel(promise2);
                            } else if ( scope.compElem == angular.element(data).text() && !data2CheckForBreak ) {
                                data2CheckForBreak = true;
                                // console.log("data2 did not change make data change true : " +data2CheckForBreak);
                            }
                            scope.compElem = angular.element(data).text();
                            // console.log("here is the changed text: " +scope.compElem);
                        }, 5000);
                        checkElement(origNotFound, compNotFound, deletedFlag);
                }, function(reject){
                    scope.compElem = reject;
                    scope.compElem = '';
                    if (reject.toLowerCase() == "not found") {
                        compNotFound = true;
                    } else if (reject.toLowerCase() == "deleted")
                        deletedFlag = true;

                    checkElement(origNotFound, compNotFound, deletedFlag);
                });
            }, function(reject){
                vrTwoInvalidFlag = true;
                checkVersion(vrOneInvalidFlag, vrTwoInvalidFlag);
            });
        }, function(reason) {
            wsTwoFlag = true;

            if (wsOneFlag && wsTwoFlag)
                element.html('<span class="mms-error">Workspace One & Two do not exist.</span>');
            else {
                element.html('<span class="mms-error">Workspace Two does not exist.</span>');
            }
        });

        // Check if input is a tag, timestamp or neither
        var tagOrTimestamp = function(version, ws){
            var deferred = $q.defer();
            if (!URLService.isTimestamp(version) && version !== 'latest'){
                ConfigService.getConfig(version, ws, false).then(function(data){
                        deferred.resolve(data.timestamp);
                }, function(reason) {
                    deferred.reject(null);
                });
            }else{
                deferred.resolve(version);
            }
            return deferred.promise;
        };

        // Get current element and update to use proper ws and ts if not already defined in html
        var setVersionWs = function(elt, ts, ws){
            var transcludeElm = angular.element(elt);
            if ( !transcludeElm.attr('mms-ws') && !transcludeElm.attr('data-mms-ws') ) {
                transcludeElm.attr("mms-ws", ws);
            }
            if ( !transcludeElm.attr('mms-version') && !transcludeElm.attr('data-mms-version') ) {
                transcludeElm.attr("mms-version", ts);
            }
        };

        // Get the text to compare for diff
        var getComparsionText = function(ts, ws){
            var deferred = $q.defer();
            ElementService.getElement(scope.mmsEid, false, ws, ts).then(function(data){
                var htmlData = angular.element(findElemType(data));

                // inject workspace and timestamp - check for data-mms-* and mms-*
                htmlData.find("mms-transclude-doc").each(function() {
                    setVersionWs(this, ts);
                });

                htmlData.find("mms-transclude-name").each(function() {
                    setVersionWs(this, ts);
                });

                htmlData.find("mms-transclude-val").each(function() {
                    setVersionWs(this, ts);
                });
                $compile(htmlData)($rootScope.$new());
                deferred.resolve(htmlData);
            }, function(reason) {
                if (reason.message)
                  deferred.reject(reason.message);

                deferred.reject(null);
            });
            return deferred.promise;
        };

        // Find the right key to fetch text
        var findElemType = function(elem){
            if (scope.mmsAttr === 'name'){//the key is included and blank
                return elem.name + '';
            }else if (scope.mmsAttr === 'doc') {
                return elem.documentation + '';
            }else{
                if (!elem.specialization || !elem.specialization.value || !elem.specialization.value[0])
                    return '';
                if (elem.specialization.value[0].type === "LiteralString"){
                    return elem.specialization.value[0].string + '';
                }else if (elem.specialization.value[0].type === "LiteralReal"){
                    return elem.specialization.value[0].double + '';
                }else if (elem.specialization.value[0].type === "LiteralBoolean"){
                    return elem.specialization.value[0].boolean + '' ;
                } else if (elem.specialization.value[0].type === 'LiteralInteger') {
                    return elem.specialization.value[0].integer + '';
                }else{
                    element.html('<span class="mms-error">Value type not supported for now</span>');
                    return null;
                }

            }
        };

        var checkElement = function(origNotFound, compNotFound, deletedFlag){
          switch(origNotFound){
            case false:
              if (compNotFound === true)
                element.html('<span class="mms-error"> This element has been removed from the View. </span>');
              else if (deletedFlag === true)
                element.prepend('<span class="mms-error"> This element has been deleted: </span>');
              break;
            default:
              if (compNotFound === false){
                if (scope.compElem === "")
                  element.html('<span class="mms-error"> This element is a new element with no content. </span>');
                else
                  element.prepend('<span class="mms-error"> This element is a new element: </span>');
              }
              else if (compNotFound === true)
                element.html('<span class="mms-error"> This element does not exist at either point in time. </span>');
          }
        };

        var checkVersion = function(vrOneInvalidFlag, vrTwoInvalidFlag){
          switch(vrOneInvalidFlag){
            case false:
              if (vrTwoInvalidFlag === true)
                element.html('<span class="mms-error"> Version Two not a valid tag/timestamp. </span>');
              break;
            default:
              if (vrTwoInvalidFlag === false)
                element.html('<span class="mms-error"> Version One not a valid tag/timestamp. </span>');
              else if (vrTwoInvalidFlag === true)
                element.html('<span class="mms-error"> Version One and Version Two not valid tags/timestamps. ');
          }
        };

    };

    return {
        restrict: 'E',
        scope: {
            mmsEid: '@',
            mmsWsOne: '@',
            mmsWsTwo: '@',
            mmsAttr: '@',
            mmsVersionOne: '@',
            mmsVersionTwo: '@'
        },
        template: '<style>del{color: black;background: #ffbbbb;} ins{color: black;background: #bbffbb;} .match,.textdiff span {color: gray;}</style><div class="textdiff"  processing-diff left-obj="origElem" right-obj="compElem" ></div>',
        require: '?^^mmsView',
        link: mmsDiffAttrLink
    };
}
