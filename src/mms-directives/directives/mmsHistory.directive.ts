import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsHistory', ['Utils','ElementService', 'ProjectService', '$templateCache', '$q', '$animate', '$uibModal', '_', mmsHistory]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsHistory
 *
 * @requires mms.ElementService
 * @requires mms.ProjectService
 * @requires $templateCache
 * @requires $q
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
    <mms-history mms-element-id="{{id}}" mms-ref-id="{{refId}}"
                         mms-project-id="{{projectId}}"></mms-history>
    </pre>
 *
 * @param {string} mmsElementId The id of the element
 * @param {string} mmsProjectId The project id for the element
 * @param {string=master} mmsRefId Reference to use, defaults to master
 */
function mmsHistory(Utils, ElementService, ProjectService, $templateCache, $q, $animate, $uibModal, _) {
    var template = 'partials/mms-directives/mmsHistory.html';

    var mmsHistoryLink = function(scope, element, attrs) {
        var ran = false;
        var lastid = null;
        scope.historyVer = 'latest';
        scope.compareCommit = {
            ref: {id: scope.mmsRefId},
            compareHistory: null,
            commitSelected: null,
            isopen: false
        };


        // base data
        scope.refList = [];
        scope.baseCommit = {
            refSelected: {id: scope.mmsRefId},
            baseHistory: null,
            commitSelected: null,
            isopen: false,
            refisopen: false
        };


        // Get current scope element info
        var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
        ElementService.getElement(reqOb, 2, false)
        .then(function(data) {
            scope.element = data;
        });

        /**
         * @ngdoc function
         * @name mmsDirectives.directive:mmsHistory#changeElement
         * @methodOf mmsDirectives.directive:mmsHistory
         *
         * @description
         * Change scope history when another element is selected
         */
        var changeElement = function(newVal, oldVal) {
            if (!newVal || (newVal == oldVal && ran))
                return;
            ran = true;
            lastid = newVal;
            scope.gettingHistory = true;
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
            ElementService.getElementHistory(reqOb, 2)
            .then(function(data) {
                if (newVal !== lastid)
                    return;
                scope.historyVer = 'latest';
                scope.compareCommit.compareHistory = data;
                scope.compareCommit.commitSelected = scope.compareCommit.compareHistory[0];
                getRefs();
                scope.baseCommit.baseHistory = data;
                if (data.length > 1) {
                    scope.baseCommit.commitSelected = scope.compareCommit.compareHistory[1];
                } else if (data.length > 0) {
                    scope.baseCommit.commitSelected = scope.compareCommit.compareHistory[0];
                } else {
                    scope.baseCommit.commitSelected = '--- none ---';
                }
            }).finally(function() {
                scope.gettingHistory = false;
            });
        };

        // Get ref list for project and details on
        var getRefs = function() {
            ProjectService.getRefs(scope.mmsProjectId)
            .then(function(data) {
                scope.refList = data;
                scope.compareCommit.ref = _.find(data, function(item) {
                    return item.id == scope.mmsRefId;
                });
                scope.baseCommit.refSelected = scope.compareCommit.ref;
            });
        };

        scope.commitClicked = function(version) {
            scope.compareCommit.commitSelected = version;
            scope.historyVer = scope.compareCommit.commitSelected.id;
            scope.compareCommit.isopen = !scope.compareCommit.isopen;
        };

        scope.getElementHistoryByRef = function(ref) {
            if (ref) {
                scope.disableRevert = false;
                // scope.gettingCompareHistory = true;
                scope.baseCommit.refSelected = ref;
                var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: ref.id};
                ElementService.getElementHistory(reqOb, 2)
                .then(function(data) {
                    scope.baseCommit.baseHistory = data;
                    if (data.length > 0) {
                        scope.baseCommit.commitSelected = scope.baseCommit.baseHistory[0];
                    }
                }, function(error) {
                    scope.baseCommit.baseHistory = [];
                    scope.baseCommit.commitSelected = '';
                    scope.disableRevert = true;
                }).finally(function() {
                    // scope.gettingCompareHistory = false;
                    scope.baseCommit.refisopen = !scope.baseCommit.refisopen;
                });
            }
        };

        scope.baseCommitClicked = function(version) {
            scope.baseCommit.commitSelected = version;
            scope.baseCommit.isopen = !scope.baseCommit.isopen;
        };

        scope.changeElement = changeElement;
        scope.$watch('mmsElementId', changeElement);
        scope.$watch('mmsRefId', changeElement);


        //TODO
        // check if commit ids are the same - display to user that they are comparing same or disable the commit that matches
        scope.revert = function() {
            Utils.revertAction(scope, changeElement, element);
        };

    };

    return {
        restrict: 'E',
        templateUrl: template,
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@'
        },
        link: mmsHistoryLink
    };
}
