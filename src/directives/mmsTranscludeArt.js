'use strict';

angular.module('mms.directives')
.directive('mmsTranscludeArt', ['ArtifactService','AuthService','URLService', mmsTranscludeArt]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTranscludeArt
 *
 * @requires mms.ArtifactService
 * @requires mms.AuthService
 * @requires mms.ElementService
 * @requires mms.URLService
 * @requires growl
 *
 * @restrict E
 *
 * @description
 * Given an artifact id, puts in an img or link to artifact. 
 *
 * @param {string} mmsElementId The id of the artifact
 * @param {string} mmsProjectId The project id 
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 */
function mmsTranscludeArt(ArtifactService, AuthService, URLService) {

    var mmsTranscludeArtLink = function(scope, element, attrs, controllers) {
        // var mmsViewCtrl = controllers[0];
        var processed = false;

        scope.$watch('mmsElementId', function(newVal, oldVal) {
            if (!newVal || (newVal === oldVal && processed) || !scope.mmsProjectId) {
                return;
            }
            processed = true;
            scope.projectId = scope.mmsProjectId;
            scope.refId = scope.mmsRefId ? scope.mmsRefId : 'master';
            scope.commitId = scope.mmsCommitId ? scope.mmsCommitId : 'latest';
            var reqOb = {artifactId: scope.mmsElementId, projectId: scope.projectId, refId: scope.refId, commitId: scope.commitId};

            element.addClass('isLoading');
            
            // Get the artifacts of the element
            ArtifactService.getArtifact(reqOb)
            .then(function(artifact) {
                scope.artifact = artifact;
                scope.url =  URLService.addTicket(
                    URLService.getArtifactURL({
                    'projectId': scope.projectId,
                    'refId': scope.refId,
                    'elementId': element.id,
                    'artifactExtension': artifact.extension
                }));
                if (artifact.contentType.indexOf('image') > -1) {
                    scope.image = true;
                }
            }, function(reason) {
                console.log('Error getting artifact ' + scope.mmsElementId);
            }).finally(function() {
                element.removeClass('isLoading');
            });
        });
    };

    return {
        restrict: 'E',
        template: '<img ng-if="image" ng-src="{{url}}"></img><a ng-if="!image" ng-href="{{url}}">{{artifact.name}}</a>',
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsCfLabel: '@'
        },
        require: ['?^^mmsView'],
        link: mmsTranscludeArtLink
    };
}