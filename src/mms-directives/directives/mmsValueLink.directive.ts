import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsValueLink', ['ElementService', mmsValueLink]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsValueLink
 *
 * @requires mms.ElementService
 *
 * @restrict E
 *
 * @description
 * Given an element id, generates a hyperlink with a cross-reference value
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {string} mmsErrorText Text to display when element is not found
 * @param {string} mmsLinkText Text to display for hyperlink
 */
function mmsValueLink(ElementService, $compile, growl) {

    var mmsValueLinkLink = function(scope, element, attrs, controllers) {
        var mmsCfCtrl = controllers[0];
        var mmsViewCtrl = controllers[1];
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
        var reqOb = {elementId: scope.mmsElementId, projectId: scope.projectId, refId: scope.refId, commitId: scope.commitId};

        ElementService.getElement(reqOb)
        .then(function(data) {
            if (data.type === 'Property') {
                var value = data.defaultValue;
                if (value && value.type === 'LiteralString')
                    scope.url = value.value;
            } else if (data.type === 'Slot') {
                if (angular.isArray(data.value) && data.value.length > 0 && data.value[0].type === 'LiteralString') {
                    scope.url = data.value[0].value;
                }
            } else {
                if (scope.mmsErrorText){
                    element.html('<span class="mms-error">'+ scope.mmsErrorText +'</span>');
                } else {
                    if (scope.mmsErrorText){
                        element.html('<span>'+ scope.mmsErrorText +'</span>');
                    } else {
                        element.html('<span class="mms-error">Element does not provide link value.</span>');
                    }
                }
            }
        }, function(reason) {
            element.html('<span class="mms-error">Element was not found.</span>');
        });
    };

    return {
        restrict: 'E',
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsErrorText: '@',
            mmsLinkText: '@',
        },
        require: ['?^^mmsCf', '?^^mmsView'],
        template: '<a ng-href="{{url}}">{{mmsLinkText}}</a>',
        link: mmsValueLinkLink
    };
}