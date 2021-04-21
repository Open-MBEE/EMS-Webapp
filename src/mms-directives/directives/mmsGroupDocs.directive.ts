import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsGroupDocs', ['ElementService', 'ViewService', 'growl', '$q', '$templateCache', '_', mmsGroupDocs]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsGroupDocs
 *
 * @requires mms.ElementService
 *
 * @restrict E
 *
 * @description
 *
 * @param {string} mmsGroupId The id of the group to show documents for
 * @param {string=master} mmsRefId Ref, defaults to master
 * @param {string} mmsProjectId Project Id, if not stated will get from surrounding view
 */
function mmsGroupDocs(ElementService, ViewService, growl, $q, $templateCache, _) {

    var mmsGroupDocsLink = function(scope, element, attrs, controllers) {
        var mmsCfCtrl = controllers[0];
        var mmsViewCtrl = controllers[1];
        var update = function(documents) {
            var docs = [];
            var groupId = scope.mmsGroupId === '' ? undefined : scope.mmsGroupId;
            for (var i = 0; i < documents.length; i++) {
                if ( (groupId === undefined || groupId === scope.projectId) && !documents[i]._groupId ) {
                    docs.push(documents[i]);
                } else if (documents[i]._groupId == scope.mmsGroupId) {
                    docs.push(documents[i]);
                }
            }
            scope.docs = docs;
        };

        var projectId = scope.mmsProjectId;
        var refId = scope.mmsRefId;
        if (mmsCfCtrl) {
            var cfVersion = mmsCfCtrl.getElementOrigin();
            if (!projectId) {
                projectId = cfVersion.projectId;
            }
            if (!refId) {
                refId = cfVersion.refId;
            }
        }
        if (mmsViewCtrl) {
            var viewVersion = mmsViewCtrl.getElementOrigin();
            if (!projectId) {
                projectId = viewVersion.projectId;
            }
            if (!refId) {
                refId = viewVersion.refId;
            }
        }
        if (!projectId) {
            return;
        }
        scope.projectId = projectId;
        scope.refId = refId ? refId : 'master';
        ViewService.getProjectDocuments({
            projectId: scope.projectId,
            refId: scope.refId
        }, 2).then(function(documents) {
            update(documents);
            scope.documents = documents;
            scope.$watchCollection('documents', function(newVal, oldVal) {
                update(newVal);
            });
        });
    };


    return {
        restrict: 'E',
        template: $templateCache.get('partials/mms-directives/mmsGroupDocs.html'),
        scope: {
            mmsRefId: '@',
            mmsProjectId: '@',
            mmsGroupId: '@'
        },
        require: ['?^^mmsCf', '?^^mmsView'],
        link: mmsGroupDocsLink
    };
}