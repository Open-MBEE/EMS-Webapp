import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsDiffAttr', ['$compile', '$rootScope', '$interval', '$templateCache', '$q', 'ElementService', mmsDiffAttr]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsDiffAttr
 *
 * @requires mms.ElementService
 * @requires $compile
 * @requires $rootScope
 * @requires $interval
 *
 * @restrict E
 *
 * @description
 *  Compares a element at two different refs/commits and generates a pretty diff.
 * ## Example
 * <mms-diff-attr mms-base-element-id="" mms-attr="name|doc|val"
 * (mms-base-project-id="" mms-base-ref-id="" mms-compare-ref-id=""
 * mms-base-commit-id="" mms-compare-commit-id="")></mms-diff-attr>
 *
 * @param {string} mmsAttr Attribute to use -  ie `name`, `doc` or `value`
 * @param {string} mmsBaseElementId The id of the element to do comparison of
 * @param {string} mmsBaseProjectId Base project ID for original/base element
 * @param {string} mmsCompareProjectId Compare project ID for compare element
 * @param {string=master} mmsBaseRefId Base ref ID or master, defaults to current ref or master
 * @param {string=master} mmsCompareRefId Compare ref ID or master, defaults to base ref ID
 * @param {string=latest} mmsBaseCommitId Base commit id, default is latest
 * @param {string=latest} mmsCompareCommitId Compare commit id, default is latest
 */
function mmsDiffAttr($compile, $rootScope, $interval, $templateCache, $q, ElementService) {
    var template = 'partials/mms-directives/mmsDiffAttr.html';

    return {
        restrict: 'E',
        scope: {
            mmsAttr: '@',

            mmsBaseProjectId: '@',
            mmsCompareProjectId: '@',

            mmsBaseRefId: '@',
            mmsCompareRefId: '@',

            mmsBaseCommitId: '@',
            mmsCompareCommitId: '@',

            mmsBaseElementId: '@',
            mmsCompareElementId: '@'
        },
        templateUrl: template,
        link: mmsDiffAttrLink,
        require: '?^^mmsView'
    };

    function mmsDiffAttrLink(scope, element, attrs, mmsViewCtrl) {
        var viewOrigin = mmsViewCtrl ? mmsViewCtrl.getElementOrigin() : null;
        scope.diffFinish = function() { scope.diffLoading = false; };
        scope.$watch('mmsBaseCommitId', _commitIdChangeHandler);
        scope.$watch('mmsCompareCommitId', _commitIdChangeHandler);

        var baseNotFound = false;
        var compNotFound = false;
        var baseDeleted = false;
        var compDeleted = false;

        _setupDiff();

        function _setupDiff() {
            scope.diffLoading = true;

            var baseProjectId = scope.mmsBaseProjectId || (viewOrigin ? viewOrigin.projectId : null);
            var compareProjectId = scope.mmsCompareProjectId || baseProjectId;

            var baseRefId = scope.mmsBaseRefId || (viewOrigin ? viewOrigin.refId : 'master');
            var compareRefId = scope.mmsCompareRefId || baseRefId;

            var baseCommitId = scope.mmsBaseCommitId || 'latest';
            var compareCommitId = scope.mmsCompareCommitId || 'latest';

            var baseElementId = scope.mmsBaseElementId;
            var compareElementId = scope.mmsCompareElementId || baseElementId;

            var isSame = _checkSameElement({
                baseElementId: baseElementId,
                compareElementId: compareElementId,

                baseCommitId: baseCommitId,
                compareCommitId: compareCommitId,

                baseRefId: baseRefId,
                compareRefId: compareRefId,

                baseProjectId: baseProjectId,
                compareProjectId: compareProjectId
            });
            if (isSame) {
                return;
            }

            var baseElementPromise = _getElementData(baseProjectId, baseRefId, baseCommitId, baseElementId);
            var comparedElementPromise = _getElementData(compareProjectId, compareRefId, compareCommitId, compareElementId);

            $q.allSettled([baseElementPromise, comparedElementPromise]).then(function(responses) {
                var message;

                var respForBaseElement = responses[0];
                if (respForBaseElement.state === 'fulfilled') {
                    _fullyRender(respForBaseElement.value, function(baseElementHtml) {
                        scope.baseElementHtml = baseElementHtml;
                    });
                } else {
                    message = respForBaseElement.reason.message;
                    if (message && message.toLowerCase().includes("deleted")) {
                        baseDeleted = true;
                    } else {
                        baseNotFound = true;
                    }
                    scope.baseElementHtml = '';
                }

                var respForComparedElement = responses[1];
                if(respForComparedElement.state === 'fulfilled') {
                    _fullyRender(respForComparedElement.value, function(comparedElementHtml) {
                        scope.comparedElementHtml = comparedElementHtml;
                    });
                } else {
                    message = respForComparedElement.reason.message;
                    if (message && message.toLowerCase().includes("deleted")) {
                        compDeleted = true;
                    } else {
                        compNotFound = true;
                    }
                    scope.comparedElementHtml = '';
                }
                scope.message = _checkElementExistence();

            });
        }

        function _commitIdChangeHandler(newVal, oldVal) {
            if (newVal !== oldVal) {
                _setupDiff();
            }
        }

        function _getElementData(projectId, refId, commitId, elementId) {
            return ElementService.getElement({
                projectId:  projectId,
                elementId:  elementId,
                refId:      refId,
                commitId:   commitId
            });
        }

        function _fullyRender(data, finishRenderCb) {
            var element = _createElement(scope.mmsAttr, data.id, data._projectId, data._refId, data._commitId);
            var handler = $interval(function() {
                var baseHtml = element.html();
                if (!baseHtml.includes("(loading...)")) {
                    $interval.cancel(handler);
                    finishRenderCb(baseHtml);
                }
            }, 10);
        }

        function _createElement(type, mmsElementId, mmsProjectId, mmsRefId, mmsCommitId) {
            var html;
            var ignoreMathjaxAutoFormatting = type === 'doc' || type === 'val' || type === 'com';
            html = '<mms-cf ' + (ignoreMathjaxAutoFormatting ? 'mms-generate-for-diff="mmsGenerateForDiff" ' : '') +  'mms-cf-type="{{type}}" mms-element-id="{{mmsElementId}}" mms-project-id="{{mmsProjectId}}" mms-ref-id="{{mmsRefId}}" mms-commit-id="{{mmsCommitId}}"></mms-cf>';
            var newScope = $rootScope.$new();
            newScope = Object.assign(newScope, {
                type: type,
                mmsElementId: mmsElementId,
                mmsProjectId: mmsProjectId,
                mmsRefId: mmsRefId,
                mmsCommitId: mmsCommitId,
                mmsGenerateForDiff: true
            });
            return $compile(html)(newScope);
        }

        function _checkElementExistence() {
            var message = '';
            if (baseNotFound && compNotFound) {
                message = ' Both base and compare elements do not exist.';
            } else if (baseNotFound) {
                message = ' This is a new element.';
            } else if (compNotFound) {
                message = ' Comparison element does not exist.';
            }
            if (baseDeleted && compDeleted) {
                message = ' This element has been deleted.';
            } else if (baseDeleted){
                message = ' Base element has been deleted.';
            } else if (compDeleted){
                message = ' Comparison element has been deleted.';
            }
            return message;
        }

        function _checkSameElement(data) {
            if ( (data.baseCommitId !== 'latest' && data.baseCommitId === data.compareCommitId ) ||
                (data.baseCommitId === 'latest' && data.baseCommitId === data.compareCommitId && data.baseElementId === data.compareElementId && data.baseProjectId === data.compareProjectId && data.baseRefId === data.compareRefId )) {
                scope.message = ' Comparing same version.';
                scope.diffLoading = false;
                return true;
            }
        }
    }
}
