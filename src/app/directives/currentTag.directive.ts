import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


mmsApp.directive('mmsCurrentTag',['$rootScope', mmsCurrentTag]);

/**
* @ngdoc directive
* @name mmsApp.directive:mmsCurrentTag
*
* @restrict E
*
* @description
* Displays the current tag in which the view resides
*
*/
function mmsCurrentTag($rootScope){

  var mmsCurrentTagLink = function(scope, element, attrs){
    var tag = $rootScope.mms_tag;
    if (!tag || tag.name === 'latest') //if undefined (latest may be undefined)
      scope.tag = 'Latest';
    else {
      scope.tag = tag.name;
    }
  };

  return {
    restrict: 'E',
    scope: {},
    template: '{{ tag }}',
    link: mmsCurrentTagLink
  };
}
