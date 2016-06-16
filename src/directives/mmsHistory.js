'use strict';

angular.module('mms.directives')
.directive('mmsHistory', ['Utils','ElementService', 'WorkspaceService', '$compile', '$templateCache', '$modal', '$q', '_', mmsHistory]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsHistory
 *
 * @requires mms.ElementService
 * @requires $compile
 * @requires $templateCache
 * @requires _
 *
 * @restrict E
 *
 * @description
 * Outputs a history window of the element whose id is specified. History includes
 * name of modifier and date of change. Also modified date links to spec output below.
 *
 * ### template (html)
 * ## Example for showing an element history
 *  <pre>
    <mms-history mms-eid="element_id" mms-version="2014-07-01T08:57:36.915-0700"></mms-history>
    </pre>
 *
 * @param {string} mmsEid The id of the element
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsHistory(Utils, ElementService, WorkspaceService, $compile, $templateCache, $modal, $q, _) {
    var template = $templateCache.get('mms/templates/mmsHistory.html');

    var mmsHistoryLink = function(scope, element, attrs) {
        var ran = false;
        var lastid = null;
        scope.selects = {timestampSelected: null};
        scope.historyVer = 'latest';
        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsHistory#changeElement
         * @methodOf mms.directives.directive:mmsHistory
         *
         * @description
         * Change scope history when another element is selected
         *
         */
        var changeElement = function(newVal, oldVal) {
            if (!newVal || (newVal == oldVal && ran))
                return;
            ran = true;
            lastid = newVal;
            ElementService.getElementVersions(scope.mmsEid, false, scope.mmsWs)
            .then(function(data) {
                if (newVal !== lastid) 
                    return;
                scope.history = data;
                scope.historyVer = 'latest';
                scope.selects.timestampSelected = null;
            });
        };
        scope.timestampClicked = function() {
            var time = scope.selects.timestampSelected;
            console.log('value changed, new value is: ' + time);
            if (!time) {
                scope.historyVer = 'latest';
                return;
            }
            var hack = time.substring(0, 20) + '999' + time.substring(23);
            scope.historyVer = hack;
        };
        scope.changeElement = changeElement;
        scope.$watch('mmsEid', changeElement);
        scope.$watch('mmsWs', changeElement);
    };

    return {
        restrict: 'E',
        template: template,
        scope: {
            mmsEid: '@',
            mmsWs: '@',
            mmsType: '@'
        },
        link: mmsHistoryLink
    };
}
