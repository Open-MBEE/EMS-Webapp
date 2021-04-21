import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsCf', ['$compile', mmsCf]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsCf
 *
 * @requires $compile
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's name binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and name change,
 * and on click
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string} mmsCfType one of doc, val, name, com, img
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {boolean=false} nonEditable can edit inline or not
 * @param {bool} mmsWatchId set to true to not destroy element ID watcher
 */
function mmsCf($compile) {
    var mmsCfCtrl = function($scope) {
        //INFO this was this.getWsAndVersion
        this.getElementOrigin = function() {
            return {
                projectId: $scope.projectId,
                refId: $scope.refId,
                commitId: $scope.commitId
            };
        };
    };

    var mmsCfLink = function(scope, domElement : angular.IAugmentedJQuery, attrs, controllers) {
        var mmsCfCtrl = controllers[0];
        var mmsViewCtrl = controllers[1];

        var changeElement = function(newVal, oldVal) {
            if (!newVal) {
                return;
            }
            if (!scope.mmsWatchId) {
                idwatch();
                commitwatch();
            }
            var projectId = scope.mmsProjectId;
            var refId = scope.mmsRefId;
            var commitId = scope.mmsCommitId;
            if (mmsCfCtrl) {
                var cfVersion = mmsCfCtrl.getElementOrigin();
                if (!projectId)
                    projectId = cfVersion.projectId;
                if (!refId)
                    refId = cfVersion.refId;
                if (!commitId)
                    commitId = cfVersion.commitId;
            }
            if (mmsViewCtrl) {
                var viewVersion = mmsViewCtrl.getElementOrigin();
                if (!projectId)
                    projectId = viewVersion.projectId;
                if (!refId)
                    refId = viewVersion.refId;
                if (!commitId)
                    commitId = viewVersion.commitId;
            }
            if (!projectId) {
                return;
            }
            scope.projectId = projectId;
            scope.refId = refId ? refId : 'master';
            scope.commitId = commitId ? commitId : 'latest';
            scope.templateElementHtml = domElement[0].innerHTML;
            if (scope.mmsCfType) {
                domElement[0].innerHTML = '<mms-transclude-' + scope.mmsCfType + (scope.mmsGenerateForDiff ? ' mms-generate-for-diff="mmsGenerateForDiff" ' : '') + ' mms-element-id="{{mmsElementId}}" mms-project-id="{{projectId}}" mms-ref-id="{{refId}}" mms-commit-id="{{commitId}}" non-editable="nonEditable" mms-cf-label="{{templateElementHtml}}"></mms-transclude-'+scope.mmsCfType+'>';
                $compile(domElement.contents())(scope);
            }
        };

        var idwatch = scope.$watch('mmsElementId', changeElement);
        var commitwatch = scope.$watch('mmsCommitId', changeElement);
    };

    return {
        restrict: 'E',
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsCfType: '@',
            mmsWatchId: '@',
            nonEditable: '<',
            mmsGenerateForDiff: '<'
        },
        require: ['?^^mmsCf', '?^^mmsView'],
        controller: ['$scope', mmsCfCtrl],
        link: mmsCfLink
    };
}
